import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
} from "../helpers/canvas"

/**
 * Regression coverage for the "first bend on a freshly-created edge snaps
 * back" bug.
 *
 * The trigger that the earlier suite missed: a *fresh, computed* straight edge
 * (data.points = []) whose endpoints sit on the raw node edges, combined with
 * a first interaction. Two distinct defects produced the reported snap-back:
 *   1. A press on the bend handle that didn't move the path (a select-click, or
 *      a first gesture React Flow consumed for selection) still committed the
 *      current straight path as manual points — the edge "froze" straight.
 *   2. The first real drag built its bend from the computed path's raw
 *      endpoints, which the release validation then re-pinned to the adjusted
 *      anchors — shrinking a terminal stub below the minimum and rejecting the
 *      whole bend back to a straight line.
 *
 * Both are asserted here against the *persisted* edge points (the source of
 * truth the user inspected), not just the rendered path.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const load = (file: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__d, "..", "fixtures", file), "utf-8")
  ) as Record<string, unknown>

const freshEdge = load("two-class-fresh-edge.json")
const noEdge = load("two-class-no-edge.json")

const SRC = "95aac2b6-3e6b-4e6d-9201-52a498e6ea20"
const TGT = "32659cdc-bd03-46f3-918c-ee8dbba9c15b"

type Pt = { x: number; y: number }

/** Read the first edge's persisted waypoints from the Zustand/localStorage model. */
async function persistedPoints(page: Page): Promise<Pt[] | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const id = parsed.state.currentModelId
    const edges = parsed.state.models[id]?.model?.edges ?? []
    return edges[0]?.data?.points ?? null
  })
}

function isStraightOrEmpty(points: Pt[] | null): boolean {
  if (!points || points.length <= 2) return true
  const ys = points.map((p) => p.y)
  const xs = points.map((p) => p.x)
  // A single horizontal or vertical line has a constant y (or x).
  return ys.every((y) => y === ys[0]) || xs.every((x) => x === xs[0])
}

async function firstBendHandleBox(page: Page) {
  const edge = page.locator(".react-flow__edge").first()
  // Select by clicking near the SOURCE end of the edge, not the centre — the
  // centre is where the bend handle sits, and clicking it would itself be a
  // handle press that (pre-fix) committed the straight path, masking the
  // first-real-drag regression we want to catch.
  const pathBox = (await edge.locator("path").first().boundingBox())!
  await page.mouse.click(pathBox.x + 12, pathBox.y + pathBox.height / 2)
  await page.waitForTimeout(200)
  const handle = edge.locator(".edge-bend-handle").first()
  await expect(
    handle,
    "fresh straight edge should expose a bend handle"
  ).toBeVisible()
  return (await handle.boundingBox())!
}

test.describe("Fresh-edge first bend", () => {
  test("a no-move press on the bend handle does not freeze the edge into manual points", async ({
    page,
  }) => {
    await injectFixtureIntoLocalStorage(page, freshEdge)
    await page.goto("/")
    await waitForCanvasReady(page)

    expect(await persistedPoints(page)).toEqual([])

    const box = await firstBendHandleBox(page)
    // Press and release without moving — a plain select-click on the handle.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(300)

    // The edge must stay computed: no manual waypoints written.
    expect(
      await persistedPoints(page),
      "a no-move click must not commit points"
    ).toEqual([])
  })

  test("the first drag on a fresh computed straight edge persists the bend", async ({
    page,
  }) => {
    await injectFixtureIntoLocalStorage(page, freshEdge)
    await page.goto("/")
    await waitForCanvasReady(page)

    const box = await firstBendHandleBox(page)
    // One upward drag — the very first edit of the fresh edge.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 60, {
      steps: 12,
    })
    await page.mouse.up()
    await page.waitForTimeout(350)

    const points = await persistedPoints(page)
    expect(
      isStraightOrEmpty(points),
      `first bend snapped back to a straight line: ${JSON.stringify(points)}`
    ).toBe(false)
    // The bend goes up, so at least one waypoint must sit above the endpoints.
    expect(Math.min(...points!.map((p) => p.y))).toBeLessThan(415)
  })

  test("drawing an edge and then bending it on the first drag persists the bend", async ({
    page,
  }) => {
    await injectFixtureIntoLocalStorage(page, noEdge)
    await page.goto("/")
    await waitForCanvasReady(page)

    // Draw: from the source node's right handle to the target node's left-centre
    // (resolves to a centre handle → a straight edge, like the reported case).
    const srcNode = page.locator(`.react-flow__node[data-id="${SRC}"]`)
    const tgtNode = page.locator(`.react-flow__node[data-id="${TGT}"]`)
    await srcNode.hover()
    await page.waitForTimeout(120)
    const rightHandle = srcNode.locator(
      '.react-flow__handle[data-handleid="right"]'
    )
    const hb = (await rightHandle.first().boundingBox())!
    const tb = (await tgtNode.boundingBox())!
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(tb.x + (tb.width * 2) / 3, tb.y + tb.height / 2, {
      steps: 8,
    })
    await page.mouse.move(tb.x + 8, tb.y + tb.height / 2, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(400)

    await expect(page.locator(".react-flow__edge")).toHaveCount(1)

    const box = await firstBendHandleBox(page)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 60, {
      steps: 12,
    })
    await page.mouse.up()
    await page.waitForTimeout(350)

    const points = await persistedPoints(page)
    expect(
      isStraightOrEmpty(points),
      `first bend after draw snapped back: ${JSON.stringify(points)}`
    ).toBe(false)
  })
})
