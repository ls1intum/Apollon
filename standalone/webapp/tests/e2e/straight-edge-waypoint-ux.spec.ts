import { expect, test, type Locator, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  openFixtureInLocalEditor,
  selectEdgeOnPath,
  waitForCanvasReady,
} from "../helpers/canvas"

const directory = path.dirname(fileURLToPath(import.meta.url))
type StraightEdgeFixture = Record<string, unknown> & {
  nodes: Array<{ position: { x: number; y: number } }>
  edges: Array<{ id: string; data: { points: unknown[] } }>
}

const crowdedFixture = JSON.parse(
  fs.readFileSync(
    path.join(directory, "..", "fixtures", "syntax-tree.json"),
    "utf-8"
  )
) as StraightEdgeFixture
crowdedFixture.version = "4.2.0"
const stepFixture = JSON.parse(
  fs.readFileSync(
    path.join(directory, "..", "fixtures", "class-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

const fixture = structuredClone(crowdedFixture)
fixture.version = "4.2.0"
fixture.nodes = fixture.nodes.slice(0, 2)
fixture.edges = fixture.edges.slice(0, 1)

const edgeId = fixture.edges[0].id
const closeHandleFixture = structuredClone(fixture)
closeHandleFixture.nodes[0].position = { x: 200, y: 0 }
closeHandleFixture.nodes[1].position = { x: 200, y: 180 }
const midpointHandleSelector =
  ".edge-waypoint-handle--proposed + .edge-waypoint-hit-target"

async function persistedPoints(page: Page): Promise<unknown[] | null> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const modelId = parsed.state.currentModelId
    const edges = parsed.state.models[modelId]?.model?.edges ?? []
    return edges.find((edge: { id: string }) => edge.id === id)?.data?.points
  }, edgeId)
}

async function dragBy(page: Page, handle: Locator, dx: number, dy: number) {
  const box = await handle.boundingBox()
  if (!box) throw new Error("waypoint handle has no bounding box")
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 12 })
  await page.mouse.up()
}

async function directChordMidpoint(page: Page) {
  return page.evaluate((id) => {
    const path = document.querySelector(
      `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`
    ) as SVGPathElement | null
    if (!path) return null
    const transform = path.getScreenCTM()
    if (!transform) return null
    const start = path.getPointAtLength(0)
    const end = path.getPointAtLength(path.getTotalLength())
    const point = new DOMPoint(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2
    ).matrixTransform(transform)
    return { x: point.x, y: point.y }
  }, edgeId)
}

async function pathExcessLength(page: Page) {
  return page.evaluate((id) => {
    const path = document.querySelector(
      `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`
    ) as SVGPathElement | null
    if (!path) return null
    const length = path.getTotalLength()
    const start = path.getPointAtLength(0)
    const end = path.getPointAtLength(length)
    return length - Math.hypot(end.x - start.x, end.y - start.y)
  }, edgeId)
}

test.beforeEach(async ({ page }) => {
  await openFixtureInLocalEditor(page, structuredClone(fixture))
  await waitForCanvasReady(page)
  await selectEdgeOnPath(page, edgeId)
})

test("legacy straight-edge route caches do not become visible bends", async ({
  page,
}) => {
  const legacyFixture = structuredClone(fixture)
  legacyFixture.version = "4.1.0"
  legacyFixture.edges[0].data.points = [
    { x: 40, y: 40 },
    { x: 180, y: 220 },
  ]

  await openFixtureInLocalEditor(page, legacyFixture)
  await waitForCanvasReady(page)
  await selectEdgeOnPath(page, edgeId)

  await expect.poll(() => persistedPoints(page)).toEqual([])
  await expect.poll(() => pathExcessLength(page)).toBeLessThan(1)
  await expect(
    page
      .locator(`.react-flow__edge[data-id="${edgeId}"]`)
      .getByRole("button", { name: /^Waypoint:/ })
  ).toHaveCount(0)
})

test("straight and step bend handles share one opaque visual state", async ({
  page,
}) => {
  const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)
  const createTarget = edge.locator(midpointHandleSelector).first()
  const createCircle = edge.locator(".edge-waypoint-handle--proposed").first()

  // Selection clicks the route midpoint, so the newly-mounted midpoint handle
  // initially appears under the stationary pointer. Move clear before measuring
  // its resting state rather than accidentally sampling its hover color.
  await page.mouse.move(280, 680)
  await expect(createCircle).toHaveCSS("opacity", "1")
  // Firefox exposes the interpolated `color(srgb …)` value while the declared
  // 120ms fill transition is active; sample the actual resting state.
  await page.waitForTimeout(150)
  const straightFill = await createCircle.evaluate(
    (element) => getComputedStyle(element).fill
  )

  await createTarget.hover()
  await expect(createCircle).not.toHaveCSS("fill", straightFill)
  await page.mouse.move(280, 680)
  await page.waitForTimeout(150)
  await expect(createCircle).toHaveCSS("fill", straightFill)

  await openFixtureInLocalEditor(page, structuredClone(stepFixture))
  await waitForCanvasReady(page)
  const stepEdgeId = "edge-bidirectional-dog-imovable"
  await selectEdgeOnPath(page, stepEdgeId)
  const stepHandle = page
    .locator(`.react-flow__edge[data-id="${stepEdgeId}"] .edge-bend-handle`)
    .first()

  await expect(stepHandle).toHaveCSS("opacity", "1")
  await expect(stepHandle).toHaveCSS("fill", straightFill)
})

test("a waypoint handle wins its circle without blocking endpoint grips", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, structuredClone(closeHandleFixture))
  await waitForCanvasReady(page)
  await selectEdgeOnPath(page, edgeId)

  const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)
  const midpoint = edge.locator(midpointHandleSelector)
  await expect(midpoint).toHaveCount(1)

  const owners = await edge.evaluate((root, selector) => {
    const ownerAtCenter = (element: Element | null) => {
      if (!element) return null
      const box = element.getBoundingClientRect()
      return document
        .elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        ?.getAttribute("class")
    }
    return {
      midpoint: ownerAtCenter(root.querySelector(selector)),
      source: ownerAtCenter(root.querySelector(".edge-endpoint-grip--source")),
      target: ownerAtCenter(root.querySelector(".edge-endpoint-grip--target")),
    }
  }, midpointHandleSelector)

  expect(owners.midpoint).toContain("edge-waypoint-hit-target")
  expect(owners.source).toContain("edge-endpoint-handle--source")
  expect(owners.target).toContain("edge-endpoint-handle--target")

  // Real pointer input—not a dispatched event—proves the visible midpoint owns
  // its grab centre even where the broad endpoint rectangles meet nearby.
  await dragBy(page, midpoint, 55, 0)
  await expect.poll(() => persistedPoints(page)).toHaveLength(1)
  const waypoint = edge.getByRole("button", { name: /^Waypoint:/ })
  await expect(waypoint).toHaveCount(1)
  expect(
    await waypoint.evaluate((element) => {
      const box = element.getBoundingClientRect()
      return document
        .elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        ?.getAttribute("class")
    })
  ).toContain("edge-waypoint-hit-target")

  const before = await persistedPoints(page)
  await dragBy(page, waypoint, 20, 10)
  await expect.poll(() => persistedPoints(page)).not.toEqual(before)
})

test("one threshold-crossing move is enough to create a waypoint", async ({
  page,
}) => {
  const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)
  const midpoint = edge.locator(midpointHandleSelector).first()
  const box = await midpoint.boundingBox()
  if (!box) throw new Error("midpoint handle has no bounding box")
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2

  await page.mouse.move(x, y)
  await page.mouse.down()
  // Keep this deliberately to one move followed immediately by pointer-up. The
  // threshold-to-waypoint handoff must not require a second browser event.
  await page.mouse.move(x + 55, y + 55)
  await page.mouse.up()

  await expect.poll(() => persistedPoints(page)).toHaveLength(1)
  await expect(edge.getByRole("button", { name: /^Waypoint:/ })).toHaveCount(1)
})

test("straight waypoints feel editable and collapse live back to a line", async ({
  page,
}) => {
  const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)
  const createHandle = edge.locator(midpointHandleSelector)
  await expect(createHandle.first()).toBeVisible()
  await dragBy(page, createHandle.first(), 70, 70)

  const waypoint = edge.getByRole("button", { name: /^Waypoint:/ })
  await expect(waypoint).toHaveCount(1)
  await expect.poll(() => persistedPoints(page)).toHaveLength(1)

  const visiblePoint = edge.locator(
    ".edge-waypoint-handle:not(.edge-waypoint-handle--proposed)"
  )
  await expect(visiblePoint).toHaveCSS("opacity", "1")
  await expect(visiblePoint).not.toHaveCSS("fill", "rgb(255, 255, 255)")
  await expect
    .poll(() =>
      edge
        .locator(".edge-waypoint-handle--proposed")
        .evaluateAll((handles) =>
          handles.every((handle) => getComputedStyle(handle).opacity === "1")
        )
    )
    .toBe(true)

  const midpoint = await directChordMidpoint(page)
  if (!midpoint) throw new Error("edge path is not measurable")
  const box = await waypoint.boundingBox()
  if (!box) throw new Error("waypoint handle has no bounding box")
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(midpoint.x, midpoint.y, { steps: 12 })

  // Entering the magnetic band removes the kink before pointer-up. The handle
  // stays mounted until release so it retains pointer capture and the gesture
  // remains reversible.
  await expect(waypoint).toHaveCount(1)
  await expect.poll(() => pathExcessLength(page)).toBeLessThan(1)
  await page.mouse.up()
  await expect(waypoint).toHaveCount(0)
  await expect.poll(() => persistedPoints(page)).toEqual([])
})

test("a focused waypoint can be removed with the keyboard", async ({
  page,
}) => {
  const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)
  await dragBy(page, edge.locator(midpointHandleSelector).first(), 70, 70)

  const waypoint = edge.getByRole("button", { name: /^Waypoint:/ })
  await waypoint.focus()
  // Authored points are keyboard actions. Their circle provides the focus
  // feedback; the invisible SVG hit rectangle must never acquire a square ring.
  await expect(waypoint).toHaveCSS("outline-style", "none")
  await page.keyboard.press("Delete")

  await expect(waypoint).toHaveCount(0)
  await expect.poll(() => persistedPoints(page)).toEqual([])
})

test("the edge toolbar never traps a waypoint underneath it", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, structuredClone(crowdedFixture))
  await waitForCanvasReady(page)
  await selectEdgeOnPath(page, edgeId)

  const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)
  await dragBy(page, edge.locator(midpointHandleSelector).first(), -70, -70)

  const waypoint = edge.getByRole("button", { name: /^Waypoint:/ })
  await expect(waypoint).toHaveCount(1)
  const before = await persistedPoints(page)

  // A sharp bend puts the route's arc midpoint close to its waypoint, which is
  // also where React Flow anchors the edge action toolbar. Exercise this with a
  // real pointer gesture: focusing or dispatching the event would not detect a
  // toolbar layered over the handle.
  await dragBy(page, waypoint, 0, -35)

  await expect.poll(() => persistedPoints(page)).not.toEqual(before)
  await expect(waypoint).toHaveCount(1)
})
