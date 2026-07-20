import { test, expect, type Page, type Locator } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Regression coverage for the "first bend on a freshly-created edge snaps
 * back" family of bugs.
 *
 * Two defects produced the reported snap-back, both only on the *first* edit
 * of a still-computed edge (data.points = []):
 *   1. A press on the bend handle that never moved the path still ran the
 *      commit, freezing the computed straight path into manual points.
 *   2. The first real drag built its bend from the computed path's raw node
 *      endpoints, which release validation re-pinned to the adjusted anchors —
 *      shrinking a terminal stub below the minimum and rejecting the whole
 *      bend back to a straight line.
 *
 * Every test here asserts on the *persisted* edge waypoints (the source of
 * truth the user inspected), reached through several entry paths a user can
 * actually take: a loaded model, a freshly drawn edge selected away from the
 * handle, and a freshly drawn edge dragged directly as the very first action.
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

/** Read the first edge's persisted waypoints from the localStorage model. */
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

/** True when the persisted path is empty or a single straight line. */
function isStraightOrEmpty(points: Pt[] | null): boolean {
  if (!points || points.length <= 2) return true
  const ys = points.map((p) => p.y)
  const xs = points.map((p) => p.x)
  return ys.every((y) => y === ys[0]) || xs.every((x) => x === xs[0])
}

/** Draw a straight right→left edge between the two fixture nodes. Returns the
 * created edge locator (already auto-selected, so its bend handle renders). */
async function drawStraightEdge(page: Page): Promise<Locator> {
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
  const edge = page.locator(".react-flow__edge").first()
  await expect(edge).toHaveCount(1)
  return edge
}

/** Drag the first bend handle of an edge by dy (screen px). A drawn edge
 * auto-selects, so its handle is already present — dragging it is the user's
 * "grab the middle and drag" gesture with no separate select-click. Using the
 * handle locator (not the path bbox) stays robust once the edge is bent. */
/** The centre of a HORIZONTAL bend handle (wider than tall) on the edge — one a
 * vertical drag actually reshapes. After the edge bends, `.first()` may be a vertical
 * stub handle a vertical drag cannot move. */
async function pickHorizontalBendHandle(
  page: Page,
  edge: Locator
): Promise<{ cx: number; cy: number }> {
  const handles = edge.locator(".edge-bend-handle")
  const count = await handles.count()
  for (let i = 0; i < count; i++) {
    const box = await handles.nth(i).boundingBox()
    if (box && box.width > box.height) {
      return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 }
    }
  }
  throw new Error("no horizontal bend handle to drag")
}

async function dragFirstHandle(
  page: Page,
  edge: Locator,
  dy: number
): Promise<void> {
  const handle = edge.locator(".edge-bend-handle").first()
  await expect(handle).toBeVisible()
  const box = (await handle.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx, cy + dy, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(350)
}

/** Select an edge WITHOUT pressing its centre bend handle, then return the
 * handle box. Selecting via the handle would itself commit (defect 1) and mask
 * the first-real-drag regression. */
async function selectAndGetHandle(page: Page, edge: Locator) {
  const pathBox = (await edge.locator("path").first().boundingBox())!
  await page.mouse.click(pathBox.x + 12, pathBox.y + pathBox.height / 2)
  await page.waitForTimeout(200)
  const handle = edge.locator(".edge-bend-handle").first()
  await expect(
    handle,
    "straight edge should expose a bend handle"
  ).toBeVisible()
  return (await handle.boundingBox())!
}

test.describe("Fresh-edge first bend — loaded model", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, freshEdge)
    await waitForCanvasReady(page)
  })

  test("a no-move press on the bend handle does not freeze the edge into manual points", async ({
    page,
  }) => {
    expect(await persistedPoints(page)).toEqual([])
    const edge = page.locator(".react-flow__edge").first()
    const box = await selectAndGetHandle(page, edge)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(300)
    expect(
      await persistedPoints(page),
      "a no-move click must not commit points"
    ).toEqual([])
  })

  test("the first drag on a loaded fresh straight edge persists the bend", async ({
    page,
  }) => {
    const edge = page.locator(".react-flow__edge").first()
    const box = await selectAndGetHandle(page, edge)
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
      `first bend snapped back: ${JSON.stringify(points)}`
    ).toBe(false)
    expect(Math.min(...points!.map((p) => p.y))).toBeLessThan(415)
  })
})

test.describe("Fresh-edge first bend — drawn edge", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, noEdge)
    await waitForCanvasReady(page)
  })

  // The exact user gesture: draw, then drag the middle as the very first action
  // (the drawn edge auto-selects, so the handle is already there). Cover both
  // directions and a tiny vs large drag — none may snap back.
  for (const dir of [
    { name: "up", dy: -60 },
    { name: "down", dy: 60 },
  ]) {
    for (const mag of [
      { name: "small", scale: 5 / 60 },
      { name: "large", scale: 1 },
    ]) {
      test(`draw then drag middle ${dir.name} (${mag.name}) as the first action persists the bend`, async ({
        page,
      }) => {
        const edge = await drawStraightEdge(page)
        // It must auto-expose a bend handle without a separate select-click.
        await expect(edge.locator(".edge-bend-handle").first()).toBeVisible()
        await dragFirstHandle(page, edge, Math.round(dir.dy * mag.scale))
        const points = await persistedPoints(page)
        expect(
          isStraightOrEmpty(points),
          `first ${dir.name}/${mag.name} drag snapped back: ${JSON.stringify(points)}`
        ).toBe(false)
        const ys = points!.map((p) => p.y)
        if (dir.dy < 0) expect(Math.min(...ys)).toBeLessThan(420)
        else expect(Math.max(...ys)).toBeGreaterThan(420)
      })
    }
  }

  test("three consecutive drags each persist without ever snapping back", async ({
    page,
  }) => {
    const edge = await drawStraightEdge(page)
    const seen: string[] = []
    // The first drag bends the (horizontal) straight edge via its centre handle. Each
    // FURTHER drag RESHAPES the bend by pulling a HORIZONTAL segment (a vertical drag on
    // it moves the lane); we grab a horizontal handle rather than `.first()`, which after
    // bending may be a vertical stub handle a vertical drag cannot move.
    await dragFirstHandle(page, edge, -40)
    seen.push(JSON.stringify(await persistedPoints(page)))
    for (const dy of [-30, -50]) {
      const handle = await pickHorizontalBendHandle(page, edge)
      await page.mouse.move(handle.cx, handle.cy)
      await page.mouse.down()
      await page.mouse.move(handle.cx, handle.cy + dy, { steps: 12 })
      await page.mouse.up()
      await page.waitForTimeout(350)
      const points = await persistedPoints(page)
      expect(
        isStraightOrEmpty(points),
        `a consecutive drag snapped back: ${JSON.stringify(points)}`
      ).toBe(false)
      seen.push(JSON.stringify(points))
    }
    // The committed geometry actually changed across drags (not frozen once).
    expect(new Set(seen).size).toBeGreaterThan(1)
  })

  test("a committed bend stays stable after panning the canvas (no write-back drift)", async ({
    page,
  }) => {
    const edge = await drawStraightEdge(page)
    await dragFirstHandle(page, edge, -50)
    const before = await persistedPoints(page)
    expect(isStraightOrEmpty(before)).toBe(false)
    // Pan the canvas to force re-renders of the edge.
    const canvas = page.locator(".react-flow").first()
    const cb = (await canvas.boundingBox())!
    await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2)
    await page.mouse.down()
    await page.mouse.move(cb.x + cb.width / 2 - 90, cb.y + cb.height / 2 - 60, {
      steps: 10,
    })
    await page.mouse.up()
    await page.waitForTimeout(400)
    expect(
      await persistedPoints(page),
      "committed bend drifted after re-render"
    ).toEqual(before)
  })
})
