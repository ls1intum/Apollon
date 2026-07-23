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
const LOWER = "7b43c3f0-df30-4c59-9e36-62b23577bda1"
const SELECTED_EDGE = "231f7ef5-b43d-4187-8996-f7726ed6e919"
const SIBLING_EDGE = "c5d79e15-c4f1-4adc-9dbf-845cb41ebf29"
const RECONNECT_TARGET = "3e898776-5f93-4ecb-b86b-1e528661f064"
const RECONNECT_OBSTACLE = "6b21414c-a180-482a-b886-469208f76bfb"

// A two-arm fan: customizing the upper arm must not make the lower automatic
// arm disappear from/re-enter node-side coordination across the live→commit
// boundary. Derived from the ordinary class fixture to retain realistic nodes.
const fanFixture = JSON.parse(JSON.stringify(freshEdge)) as {
  id: string
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
  [key: string]: unknown
}
fanFixture.id = "9387505d-6728-4594-888d-ac1e8a72291a"
fanFixture.nodes[0].position = { x: 220, y: 370 }
fanFixture.nodes[1].position = { x: 640, y: 270 }
fanFixture.nodes.push({
  ...JSON.parse(JSON.stringify(fanFixture.nodes[1])),
  id: LOWER,
  position: { x: 640, y: 470 },
})
fanFixture.edges = [
  {
    id: SELECTED_EDGE,
    source: SRC,
    target: TGT,
    type: "ClassUnidirectional",
    sourceHandle: "right",
    targetHandle: "left",
    data: { points: [] },
  },
  {
    id: SIBLING_EDGE,
    source: SRC,
    target: LOWER,
    type: "ClassUnidirectional",
    sourceHandle: "right",
    targetHandle: "left",
    data: { points: [] },
  },
]

// The endpoint begins below the source and is reconnected onto a horizontally
// aligned target with a third class in between. A local two-node preview draws
// straight through that class; the committed solver must dogleg around it.
const reconnectObstacleFixture = JSON.parse(JSON.stringify(freshEdge)) as {
  id: string
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
  [key: string]: unknown
}
reconnectObstacleFixture.id = "f55227cb-a8e0-4a37-b5ce-fb66ff33d852"
reconnectObstacleFixture.nodes[0].position = { x: 140, y: 300 }
reconnectObstacleFixture.nodes[1].position = { x: 720, y: 540 }
reconnectObstacleFixture.nodes.push(
  {
    ...JSON.parse(JSON.stringify(reconnectObstacleFixture.nodes[1])),
    id: RECONNECT_TARGET,
    position: { x: 720, y: 300 },
  },
  {
    ...JSON.parse(JSON.stringify(reconnectObstacleFixture.nodes[1])),
    id: RECONNECT_OBSTACLE,
    position: { x: 430, y: 300 },
  }
)

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

async function persistedEdgeData(
  page: Page
): Promise<Record<string, unknown> | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const id = parsed.state.currentModelId
    return parsed.state.models[id]?.model?.edges?.[0]?.data ?? null
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
    const previewPath = await edge
      .locator(".react-flow__edge-path")
      .getAttribute("d")
    await page.mouse.up()
    await page.waitForTimeout(350)
    const points = await persistedPoints(page)
    expect(
      isStraightOrEmpty(points),
      `first bend snapped back: ${JSON.stringify(points)}`
    ).toBe(false)
    expect(Math.min(...points!.map((p) => p.y))).toBeLessThan(415)

    const committed = await persistedEdgeData(page)
    expect(committed).toHaveProperty("sourceAnchor")
    expect(committed).toHaveProperty("targetAnchor")
    await expect
      .poll(() => edge.locator(".react-flow__edge-path").getAttribute("d"))
      .toBe(previewPath)
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

test("surrounding auto layout stays continuous through a live and committed bend", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fanFixture)
  await waitForCanvasReady(page)

  const selected = page.locator(`.react-flow__edge[data-id="${SELECTED_EDGE}"]`)
  const siblingPath = page
    .locator(`.react-flow__edge[data-id="${SIBLING_EDGE}"]`)
    .locator(".react-flow__edge-path")
  const initialSibling = await siblingPath.getAttribute("d")

  await selected.locator(".edge-overlay, path").first().click({ force: true })
  const handle = await pickHorizontalBendHandle(page, selected)
  await page.mouse.move(handle.cx, handle.cy)
  await page.mouse.down()
  // Enter the live-drag state without crossing the bend snap grid. Merely making
  // the edge authoritative must not recenter or flip its automatic sibling.
  await page.mouse.move(handle.cx + 1, handle.cy, { steps: 2 })
  await expect.poll(() => siblingPath.getAttribute("d")).toBe(initialSibling)

  // Now perform a real customization. The sibling may legitimately optimize
  // around the new route, but pointer-up must not change that optimized result.
  await page.mouse.move(handle.cx, handle.cy - 60, { steps: 12 })
  await page.waitForTimeout(200)
  const liveSibling = await siblingPath.getAttribute("d")
  await page.mouse.up()
  await expect.poll(() => siblingPath.getAttribute("d")).toBe(liveSibling)

  const committed = await persistedEdgeData(page)
  expect(committed).toHaveProperty("sourceAnchor")
  expect(committed).toHaveProperty("targetAnchor")
})

test("endpoint reconnect preview uses the committed obstacle-aware route", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, reconnectObstacleFixture)
  await waitForCanvasReady(page)

  const edge = page.locator(`.react-flow__edge[data-id="${SELECTED_EDGE}"]`)
  const edgePath = edge.locator(".react-flow__edge-path")
  await edge.locator(".edge-overlay, path").first().click({ force: true })
  const endpoint = edge.locator(".edge-endpoint-handle--target")
  await expect(endpoint).toBeVisible()
  const endpointBox = (await endpoint.boundingBox())!
  const targetBox = (await page
    .locator(`.react-flow__node[data-id="${RECONNECT_TARGET}"]`)
    .boundingBox())!
  const initialPath = await edgePath.getAttribute("d")

  await page.mouse.move(
    endpointBox.x + endpointBox.width / 2,
    endpointBox.y + endpointBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(targetBox.x + 4, targetBox.y + targetBox.height / 2, {
    steps: 18,
  })
  await expect.poll(() => edgePath.getAttribute("d")).not.toEqual(initialPath)
  const livePath = await edgePath.getAttribute("d")
  expect(livePath).toBeTruthy()
  expect(
    (livePath!.match(/[LHV]/g) ?? []).length,
    "the live reconnect must already dogleg around the bystander"
  ).toBeGreaterThan(1)

  await page.mouse.up()
  await expect.poll(() => edgePath.getAttribute("d")).toBe(livePath)
  await expect
    .poll(async () =>
      page.evaluate((edgeId) => {
        const raw = localStorage.getItem("persistenceModelStore")
        if (!raw) return null
        const parsed = JSON.parse(raw)
        const id = parsed.state.currentModelId
        const edges = parsed.state.models[id]?.model?.edges ?? []
        return edges.find(
          (candidate: { id: string }) => candidate.id === edgeId
        )?.target
      }, SELECTED_EDGE)
    )
    .toBe(RECONNECT_TARGET)
  await expect
    .poll(
      () => persistedPoints(page),
      "pinning an endpoint must not freeze an automatic edge into manual waypoints"
    )
    .toEqual([])
})

test("canceling a predicted reconnect does not commit its preview endpoint", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, reconnectObstacleFixture)
  await waitForCanvasReady(page)

  const edge = page.locator(`.react-flow__edge[data-id="${SELECTED_EDGE}"]`)
  await edge.locator(".edge-overlay, path").first().click({ force: true })
  const bend = await pickHorizontalBendHandle(page, edge)
  await page.mouse.move(bend.cx, bend.cy)
  await page.mouse.down()
  await page.mouse.move(bend.cx, bend.cy - 45, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => persistedPoints(page)).not.toEqual([])
  // Let the ordinary bend commit finish its one solver reprojection before taking
  // the cancellation baseline; otherwise this test compares against the transient
  // pointer-up write rather than the settled authored route.
  await page.waitForTimeout(400)
  const pointsBeforeReconnect = await persistedPoints(page)

  const endpoint = edge.locator(".edge-endpoint-handle--target")
  const endpointBox = (await endpoint.boundingBox())!
  const targetBox = (await page
    .locator(`.react-flow__node[data-id="${RECONNECT_TARGET}"]`)
    .boundingBox())!
  const canvasBox = (await page.locator(".react-flow").first().boundingBox())!
  await page.mouse.move(
    endpointBox.x + endpointBox.width / 2,
    endpointBox.y + endpointBox.height / 2
  )
  await page.mouse.down()
  // Enter predicted mode, then leave every node and cancel there.
  await page.mouse.move(targetBox.x + 4, targetBox.y + targetBox.height / 2, {
    steps: 12,
  })
  await page.waitForTimeout(100)
  await page.mouse.move(canvasBox.x + 20, canvasBox.y + 20, { steps: 12 })
  await page.mouse.up()

  await expect
    .poll(
      () => persistedPoints(page),
      "canceling must preserve every authored waypoint, not only the endpoints"
    )
    .toEqual(pointsBeforeReconnect)
  await expect
    .poll(() =>
      page.evaluate((edgeId) => {
        const raw = localStorage.getItem("persistenceModelStore")
        if (!raw) return null
        const parsed = JSON.parse(raw)
        const id = parsed.state.currentModelId
        const edges = parsed.state.models[id]?.model?.edges ?? []
        return edges.find(
          (candidate: { id: string }) => candidate.id === edgeId
        )?.target
      }, SELECTED_EDGE)
    )
    .toBe(TGT)
})

test("pointercancel tears down a live bend without committing it", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, freshEdge)
  await waitForCanvasReady(page)

  const edge = page.locator(`.react-flow__edge[data-id="${SELECTED_EDGE}"]`)
  const edgePath = edge.locator(".react-flow__edge-path")
  const box = await selectAndGetHandle(page, edge)
  const initialPath = await edgePath.getAttribute("d")
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 60, {
    steps: 12,
  })
  await expect.poll(() => edgePath.getAttribute("d")).not.toBe(initialPath)

  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent("pointercancel", { bubbles: true, pointerId: 1 })
    )
  )
  // Playwright still tracks its synthetic mouse button as pressed. The later
  // pointerup must be harmless because pointercancel already detached the gesture.
  await page.mouse.up()

  await expect.poll(() => persistedPoints(page)).toEqual([])
  await expect.poll(() => edgePath.getAttribute("d")).toBe(initialPath)
})

test("pointercancel rejects a predicted endpoint commit and restores all waypoints", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, reconnectObstacleFixture)
  await waitForCanvasReady(page)

  const edge = page.locator(`.react-flow__edge[data-id="${SELECTED_EDGE}"]`)
  await edge.locator(".edge-overlay, path").first().click({ force: true })
  const bend = await pickHorizontalBendHandle(page, edge)
  await page.mouse.move(bend.cx, bend.cy)
  await page.mouse.down()
  await page.mouse.move(bend.cx, bend.cy - 45, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const before = await persistedPoints(page)
  expect(before).not.toEqual([])

  const endpointBox = (await edge
    .locator(".edge-endpoint-handle--target")
    .boundingBox())!
  const targetBox = (await page
    .locator(`.react-flow__node[data-id="${RECONNECT_TARGET}"]`)
    .boundingBox())!
  await page.mouse.move(
    endpointBox.x + endpointBox.width / 2,
    endpointBox.y + endpointBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(targetBox.x + 4, targetBox.y + targetBox.height / 2, {
    steps: 12,
  })
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent("pointercancel", { bubbles: true, pointerId: 1 })
    )
  )
  await page.mouse.up()

  await expect.poll(() => persistedPoints(page)).toEqual(before)
  await expect
    .poll(() =>
      page.evaluate((edgeId) => {
        const raw = localStorage.getItem("persistenceModelStore")
        if (!raw) return null
        const parsed = JSON.parse(raw)
        const id = parsed.state.currentModelId
        return parsed.state.models[id]?.model?.edges?.find(
          (candidate: { id: string }) => candidate.id === edgeId
        )?.target
      }, SELECTED_EDGE)
    )
    .toBe(TGT)
})

test("reconnecting to a straight-eligible target preserves an authored bend", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, reconnectObstacleFixture)
  await waitForCanvasReady(page)

  const edge = page.locator(`.react-flow__edge[data-id="${SELECTED_EDGE}"]`)
  await edge.locator(".edge-overlay, path").first().click({ force: true })
  const bend = await pickHorizontalBendHandle(page, edge)
  await page.mouse.move(bend.cx, bend.cy)
  await page.mouse.down()
  await page.mouse.move(bend.cx, bend.cy - 45, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  expect(await persistedPoints(page)).not.toEqual([])

  const endpointBox = (await edge
    .locator(".edge-endpoint-handle--target")
    .boundingBox())!
  const targetBox = (await page
    .locator(`.react-flow__node[data-id="${RECONNECT_TARGET}"]`)
    .boundingBox())!
  await page.mouse.move(
    endpointBox.x + endpointBox.width / 2,
    endpointBox.y + endpointBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(targetBox.x + 4, targetBox.y + targetBox.height / 2, {
    steps: 12,
  })
  await page.mouse.up()

  await expect
    .poll(
      () => persistedPoints(page),
      "endpoint pinning must not erase independently authored bend topology"
    )
    .not.toEqual([])
  await expect
    .poll(() =>
      page.evaluate((edgeId) => {
        const raw = localStorage.getItem("persistenceModelStore")
        if (!raw) return null
        const parsed = JSON.parse(raw)
        const id = parsed.state.currentModelId
        return parsed.state.models[id]?.model?.edges?.find(
          (candidate: { id: string }) => candidate.id === edgeId
        )?.target
      }, SELECTED_EDGE)
    )
    .toBe(RECONNECT_TARGET)
})
