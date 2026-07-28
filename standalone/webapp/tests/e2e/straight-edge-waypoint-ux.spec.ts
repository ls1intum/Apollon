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
  nodes: unknown[]
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

test("straight and step bend handles share one opaque visual state", async ({
  page,
}) => {
  const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)
  const createTarget = edge
    .getByRole("button", { name: "Drag to add a waypoint" })
    .first()
  const createCircle = edge.locator(".edge-waypoint-handle--proposed").first()

  // Selection clicks the route midpoint, so the newly-mounted midpoint handle
  // initially appears under the stationary pointer. Move clear before measuring
  // its resting state rather than accidentally sampling its hover color.
  await page.mouse.move(280, 680)
  await expect(createCircle).toHaveCSS("opacity", "1")
  const straightFill = await createCircle.evaluate(
    (element) => getComputedStyle(element).fill
  )

  await createTarget.hover()
  await expect(createCircle).not.toHaveCSS("fill", straightFill)
  await page.mouse.move(280, 680)
  await expect(createCircle).toHaveCSS("fill", straightFill)

  // Keyboard users retain a clear darkened-circle focus state, but the browser
  // must not draw a square/ring around the invisible hit rectangle.
  await createTarget.focus()
  await expect(createTarget).toHaveCSS("outline-style", "none")
  await expect(createCircle).not.toHaveCSS("fill", straightFill)

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

test("straight waypoints feel editable and collapse live back to a line", async ({
  page,
}) => {
  const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)
  const createHandle = edge.getByRole("button", {
    name: "Drag to add a waypoint",
  })
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
  await dragBy(
    page,
    edge.getByRole("button", { name: "Drag to add a waypoint" }).first(),
    70,
    70
  )

  const waypoint = edge.getByRole("button", { name: /^Waypoint:/ })
  await waypoint.focus()
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
  await dragBy(
    page,
    edge.getByRole("button", { name: "Drag to add a waypoint" }).first(),
    -70,
    -70
  )

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
