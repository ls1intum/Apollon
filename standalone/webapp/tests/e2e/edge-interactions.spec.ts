import { test, expect, type Page, type Locator } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Behavioural E2E coverage for edge editing: bend (waypoint) dragging,
 * endpoint reconnection, and zoom-adaptive bend handles.
 *
 * These drive the real React Flow canvas with the mouse and assert on
 * externally-observable results — the committed SVG path geometry, the
 * presence/count of bend handles, and whether the edge survives — rather
 * than on component internals. The class-diagram fixture is used because it
 * has edges with no manual waypoints (so they exercise the same
 * fresh-edge code path a user hits right after drawing a connection).
 */

const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = path.dirname(__filename2)
const classDiagram = JSON.parse(
  fs.readFileSync(
    path.join(__dirname2, "..", "fixtures", "class-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

// Edges in the fixture, keyed by their stable data-id.
const BIDIRECTIONAL = "edge-bidirectional-dog-imovable" // long L-shape, 2 bend handles
const INHERITANCE = "edge-inheritance-dog-animal" // short, 0 handles until zoomed

function edgeById(page: Page, id: string): Locator {
  return page.locator(`.react-flow__edge[data-id="${id}"]`)
}

/** Select an edge so its bend/endpoint handles render. */
async function selectEdge(page: Page, id: string): Promise<Locator> {
  const edge = edgeById(page, id)
  await edge.locator(".edge-overlay, path").first().click({ force: true })
  await page.waitForTimeout(150)
  return edge
}

function mainPathD(edge: Locator): Promise<string | null> {
  return edge.locator(".react-flow__edge-path").first().getAttribute("d")
}

/** "M x y ..." -> the source anchor {x,y}. */
function sourcePointOf(d: string | null): { x: number; y: number } | null {
  if (!d) return null
  const m = d.match(/M\s*(-?[\d.]+)\s+(-?[\d.]+)/)
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null
}

/** Drag the centre of a handle by (dx,dy) screen px and let the commit settle. */
async function dragBy(
  page: Page,
  handle: Locator,
  dx: number,
  dy: number
): Promise<void> {
  const box = await handle.boundingBox()
  if (!box) throw new Error("handle has no bounding box")
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + dx, cy + dy, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(350)
}

/** Orientation of a bend handle: H handles are wide (drag vertically). */
async function isHorizontal(handle: Locator): Promise<boolean> {
  const box = await handle.boundingBox()
  if (!box) throw new Error("handle has no bounding box")
  return box.width > box.height
}

test.beforeEach(async ({ page }) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)
})

test.describe("Edge bend (waypoint) dragging", () => {
  test("dragging an inner segment bends the edge and the bend persists on release", async ({
    page,
  }) => {
    const edge = await selectEdge(page, BIDIRECTIONAL)
    const handle = edge.locator(".edge-bend-handle").first()
    await expect(handle).toBeVisible()

    const before = await mainPathD(edge)
    const horizontal = await isHorizontal(handle)
    // Drag well clear of the cleanup threshold so the bend is unambiguous.
    await dragBy(page, handle, horizontal ? 0 : 40, horizontal ? 40 : 0)

    const after = await mainPathD(edge)
    expect(after, "edge path changed").not.toEqual(before)
    // Re-read after a further tick: the committed geometry must not revert.
    await page.waitForTimeout(200)
    expect(await mainPathD(edge), "bend persisted").toEqual(after)
  })

  test("a single grid-step bend does not snap back (regression)", async ({
    page,
  }) => {
    // Regression guard: a one-grid-step (5px) bend on a terminal segment used
    // to be flattened by the dogleg-cleanup pass and snap back to a straight
    // line on release. It must now persist.
    const edge = await selectEdge(page, BIDIRECTIONAL)
    const handles = edge.locator(".edge-bend-handle")
    await expect(handles.first()).toBeVisible()
    // The second handle covers the target-terminal segment (the case that
    // previously regressed).
    const handle = handles.nth((await handles.count()) - 1)
    const before = await mainPathD(edge)
    const horizontal = await isHorizontal(handle)
    await dragBy(page, handle, horizontal ? 0 : 8, horizontal ? 8 : 0)

    expect(
      await mainPathD(edge),
      "small bend was discarded / snapped back"
    ).not.toEqual(before)
  })
})

test.describe("Edge endpoint reconnection", () => {
  test("dragging an endpoint onto another node rewires the edge without it disappearing, keeping the opposite endpoint anchored", async ({
    page,
  }) => {
    const edge = await selectEdge(page, BIDIRECTIONAL)
    const target = edge.locator(".edge-endpoint-handle--target")
    await expect(target).toBeVisible()

    const totalBefore = await page.locator(".react-flow__edge").count()
    const sourceBefore = sourcePointOf(await mainPathD(edge))
    expect(sourceBefore).not.toBeNull()

    // A different class node to reconnect onto (node index 5 = far-right class).
    const dest = page.locator(".react-flow__node").nth(5)
    const destBox = (await dest.boundingBox())!
    const tBox = (await target.boundingBox())!
    await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      destBox.x + destBox.width / 2,
      destBox.y + destBox.height / 2,
      { steps: 16 }
    )
    await page.mouse.up()
    await page.waitForTimeout(400)

    // 1. The edge must still exist (not be dropped by React Flow).
    await expect(edgeById(page, BIDIRECTIONAL)).toHaveCount(1)
    // 2. No edge was lost in the process.
    expect(await page.locator(".react-flow__edge").count()).toEqual(totalBefore)
    // 3. The opposite (source) endpoint stayed anchored where it was.
    const sourceAfter = sourcePointOf(
      await mainPathD(edgeById(page, BIDIRECTIONAL))
    )
    expect(sourceAfter).not.toBeNull()
    expect(Math.abs(sourceAfter!.x - sourceBefore!.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(sourceAfter!.y - sourceBefore!.y)).toBeLessThanOrEqual(2)
  })
})

test.describe("Zoom-adaptive bend handles", () => {
  test("zooming in reveals more bend handles and never hides them", async ({
    page,
  }) => {
    // Handle availability is judged on the segment's ON-SCREEN length, so
    // zooming in can only add handles (a shorter segment crosses the size
    // budget), never remove them. The short inheritance edge gains handles as
    // it is zoomed in.
    const atZoom1 = await selectEdge(page, INHERITANCE)
    const countAtZoom1 = await atZoom1.locator(".edge-bend-handle").count()

    const zoomIn = page.locator(".react-flow__controls-zoomin").first()
    for (let i = 0; i < 5; i++) {
      await zoomIn.click()
      await page.waitForTimeout(60)
    }

    // The edge stays selected across zoom, so re-read its handles directly.
    // (Re-clicking would target the edge's on-screen position, which the
    // center-anchored zoom-in can pan out of view.)
    const zoomed = edgeById(page, INHERITANCE)
    const countZoomed = await zoomed.locator(".edge-bend-handle").count()

    // Monotonic: never fewer than at 1x, and at least one once zoomed in.
    expect(countZoomed).toBeGreaterThanOrEqual(countAtZoom1)
    expect(
      countZoomed,
      "zoom-in should expose at least one bend handle"
    ).toBeGreaterThan(0)
  })
})
