import { test, expect, type Page, type Locator } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
} from "../helpers/canvas"

/**
 * E2E coverage for line jumps (edge "bridges" at crossings).
 *
 * The fixture lays out one straight HORIZONTAL edge and one straight VERTICAL
 * edge that cross at a single point. Per the layout-stable
 * horizontal-hops-vertical convention (yEd / yFiles `HORIZONTAL_BRIDGES_VERTICAL`),
 * the bridge arc must be drawn on the horizontal edge only, and that assignment
 * must NOT change when an edge is selected (React Flow elevates the selected
 * edge's z-index, which an array/render-order rule would wrongly track).
 *
 * Assertions are on the externally-observable SVG path geometry: a bridge shows
 * up as a quadratic `Q` command in the edge's `d` attribute; a plain crossing
 * has none.
 */

const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = path.dirname(__filename2)
const crossFixture = JSON.parse(
  fs.readFileSync(
    path.join(__dirname2, "..", "fixtures", "line-jump-cross.json"),
    "utf-8"
  )
) as Record<string, unknown>

const HORIZONTAL = "edge-horizontal"
const VERTICAL = "edge-vertical"

function edgeById(page: Page, id: string): Locator {
  return page.locator(`.react-flow__edge[data-id="${id}"]`)
}

function mainPathD(page: Page, id: string): Promise<string | null> {
  return edgeById(page, id)
    .locator(".react-flow__edge-path")
    .first()
    .getAttribute("d")
}

/** Count quadratic-bezier bridge commands in an SVG path. */
function bridgeCount(d: string | null): number {
  if (!d) return 0
  return (d.match(/Q/g) ?? []).length
}

/** X of the first bridge on a horizontal segment (the Q control x), or null. */
function firstBridgeX(d: string | null): number | null {
  if (!d) return null
  const m = d.match(/Q\s*(-?[\d.]+)[ ,]/)
  return m ? Number(m[1]) : null
}

async function selectEdge(page: Page, id: string): Promise<void> {
  await edgeById(page, id)
    .locator(".edge-overlay, path")
    .first()
    .click({ force: true })
  await page.waitForTimeout(150)
}

test.beforeEach(async ({ page }) => {
  await injectFixtureIntoLocalStorage(page, crossFixture)
  await page.goto("/")
  await waitForCanvasReady(page)
})

test.describe("Line jumps", () => {
  test("the horizontal edge bridges the vertical edge at their crossing", async ({
    page,
  }) => {
    const horizontal = await mainPathD(page, HORIZONTAL)
    const vertical = await mainPathD(page, VERTICAL)

    // Exactly one crossing → exactly one bridge, on the horizontal edge.
    expect(bridgeCount(horizontal)).toBe(1)
    // The vertical edge stays flat (it is hopped over, it does not hop).
    expect(bridgeCount(vertical)).toBe(0)
  })

  test("bridge assignment is stable when an edge is selected", async ({
    page,
  }) => {
    // Selecting the vertical edge elevates its z-index. A render-order rule
    // would now (wrongly) move the bridge onto the vertical edge; the
    // orientation rule keeps it on the horizontal one.
    await selectEdge(page, VERTICAL)
    expect(bridgeCount(await mainPathD(page, HORIZONTAL))).toBe(1)
    expect(bridgeCount(await mainPathD(page, VERTICAL))).toBe(0)

    // Selecting the horizontal edge must not remove its own bridge either.
    await selectEdge(page, HORIZONTAL)
    expect(bridgeCount(await mainPathD(page, HORIZONTAL))).toBe(1)
    expect(bridgeCount(await mainPathD(page, VERTICAL))).toBe(0)
  })

  test("the bridge updates live while a bend handle is dragged, not only on release", async ({
    page,
  }) => {
    expect(bridgeCount(await mainPathD(page, HORIZONTAL))).toBe(1)

    await selectEdge(page, HORIZONTAL)
    const handle = edgeById(page, HORIZONTAL)
      .locator(".edge-bend-handle")
      .first()
    await expect(handle).toBeVisible()
    const box = await handle.boundingBox()
    if (!box) throw new Error("bend handle has no bounding box")
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // Press and bend the horizontal segment downward WITHOUT releasing. The
    // segment still crosses the vertical edge (offset from the handle), so a
    // bridge must already be present from the live preview geometry — the bug
    // was that bridges only re-appeared on pointer-up.
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx, cy + 40, { steps: 10 })

    // Poll while the pointer is still held: the bridge must appear from the
    // live preview, not wait for release.
    await expect
      .poll(async () => bridgeCount(await mainPathD(page, HORIZONTAL)), {
        message: "bridge missing mid-drag (only updates on release)",
        timeout: 2000,
      })
      .toBeGreaterThanOrEqual(1)

    await page.mouse.up()
    await page.waitForTimeout(200)
  })

  test("a bridge follows the OTHER edge live while that edge's bend handle is dragged", async ({
    page,
  }) => {
    // The horizontal edge draws the bridge over the vertical edge's crossing.
    // Dragging the VERTICAL edge's bend handle moves the crossing — the
    // horizontal edge's arc must track it during the drag, not only on release.
    const startX = firstBridgeX(await mainPathD(page, HORIZONTAL))
    expect(startX, "horizontal edge should bridge initially").not.toBeNull()

    await selectEdge(page, VERTICAL)
    const handle = edgeById(page, VERTICAL).locator(".edge-bend-handle").first()
    await expect(handle).toBeVisible()
    const box = await handle.boundingBox()
    if (!box) throw new Error("vertical bend handle has no bounding box")
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    // Push the vertical segment left; its crossing with the horizontal edge
    // moves left with it.
    await page.mouse.move(cx - 60, cy, { steps: 10 })

    // MID-DRAG (pointer still held): the OTHER (horizontal) edge's bridge must
    // have moved left to the new crossing. If cross-edge geometry only updated
    // on release, it would still sit at startX.
    await expect
      .poll(async () => firstBridgeX(await mainPathD(page, HORIZONTAL)), {
        message: "other edge's bridge did not follow during the drag",
        timeout: 2000,
      })
      .toBeLessThan((startX as number) - 25)

    await page.mouse.up()
    await page.waitForTimeout(200)
  })
})
