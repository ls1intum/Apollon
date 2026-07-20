import { test, expect, type Page, type Locator } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * UX guards for edge-handle ergonomics:
 *  - handles keep a predictable ON-SCREEN size regardless of zoom (counter-
 *    scaled by 1/zoom) so they are always grabbable, mobile included;
 *  - a short edge between close nodes always offers at least one draggable
 *    handle (no "no handle, weird workaround" dead state).
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const load = (f: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__d, "..", "fixtures", f), "utf-8")
  ) as Record<string, unknown>

const classDiagram = load("class-diagram.json")
const closeNodes = load("two-class-close.json")
const noEdge = load("two-class-no-edge.json")
const SRC = "95aac2b6-3e6b-4e6d-9201-52a498e6ea20"
const TGT = "32659cdc-bd03-46f3-918c-ee8dbba9c15b"

// A second, hidden ApollonEditor is transiently mounted on the page (diagram
// thumbnail snapshotting), so `.react-flow*` selectors can match two instances.
// It mounts after the interactive editor, so `.first()` targets the real one —
// matching the convention already used in waitForCanvasReady. Without it these
// selectors hit Playwright strict-mode violations once the suite runs in
// parallel (workers > 1, as of the e2e parallelization in #770).

const viewportZoom = (page: Page) =>
  page.evaluate(() => {
    const vp = document.querySelector(".react-flow__viewport") as HTMLElement
    return new DOMMatrixReadOnly(getComputedStyle(vp).transform).a
  })

/**
 * Click the zoom-out control until the viewport zoom settles at or below
 * `targetZoom`. React Flow animates each zoom step, so a fixed number of
 * clicks spaced by short sleeps is timing-dependent: on a slow CI runner the
 * animations lag and fewer net zoom-outs land, leaving the zoom too high for
 * arc-reduction to kick in. Polling the *actual* settled zoom makes the test
 * deterministic regardless of animation speed. Returns the final zoom.
 */
async function zoomOutUntil(page: Page, targetZoom: number): Promise<number> {
  const zoomOut = page.getByRole("button", { name: "Zoom out" })
  let previousZoom = await viewportZoom(page)
  // The canvas minZoom is 0.4; cap iterations so a clamped/disabled control
  // can never hang the test.
  for (let i = 0; i < 20; i++) {
    const currentZoom = await viewportZoom(page)
    if (currentZoom <= targetZoom) {
      return currentZoom
    }
    await zoomOut.click()
    // Wait for this step's animation to settle (zoom stops changing) before
    // the next click, instead of guessing a fixed delay.
    await expect
      .poll(async () => viewportZoom(page), { timeout: 2000 })
      .not.toBe(previousZoom)
    previousZoom = await viewportZoom(page)
  }
  return previousZoom
}

async function selectEdge(page: Page, id: string): Promise<Locator> {
  const edge = page.locator(`.react-flow__edge[data-id="${id}"]`).first()
  const box = (await edge.locator("path").first().boundingBox())!
  await page.mouse.click(box.x + 12, box.y + box.height / 2)
  await page.waitForTimeout(150)
  return edge
}

async function onScreenSize(handle: Locator) {
  const b = (await handle.boundingBox())!
  return {
    long: Math.max(b.width, b.height),
    short: Math.min(b.width, b.height),
  }
}

/** Distance (screen px) from an edge's target endpoint to the centre of its
 * visible target reconnect grip. */
async function targetGripOffset(page: Page, id: string): Promise<number> {
  return page.evaluate((eid) => {
    const g = document.querySelector(`.react-flow__edge[data-id="${eid}"]`)
    const p = g?.querySelector(
      "path.react-flow__edge-path"
    ) as SVGPathElement | null
    const grip = g?.querySelector(
      ".edge-endpoint-grip--target"
    ) as SVGElement | null
    const ctm = p?.getScreenCTM()
    if (!p || !ctm || !grip) return -1
    const at = p.getPointAtLength(p.getTotalLength())
    const end = new DOMPoint(at.x, at.y).matrixTransform(ctm)
    const r = grip.getBoundingClientRect()
    return Math.hypot(r.x + r.width / 2 - end.x, r.y + r.height / 2 - end.y)
  }, id)
}

test("the endpoint reconnect grip stays anchored to the endpoint across zoom", async ({
  page,
}) => {
  // The visible grip hugs the endpoint at any zoom, while the invisible
  // hit-target stays wide for grabbing — the grip is not centred on that wide
  // target, which would float it off the endpoint when zoomed out.
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)
  const id = "edge-inheritance-dog-animal"

  await selectEdge(page, id)
  const atDefault = await targetGripOffset(page, id)
  expect(atDefault, "grip must be measurable").toBeGreaterThan(0)
  expect(
    atDefault,
    "grip must hug the endpoint at default zoom"
  ).toBeLessThanOrEqual(16)

  await zoomOutUntil(page, 0.45)
  await selectEdge(page, id)
  const zoomedOut = await targetGripOffset(page, id)
  expect(
    zoomedOut,
    "grip must stay hugging the endpoint when zoomed out (not float in the gap)"
  ).toBeLessThanOrEqual(16)
})

test("the endpoint grip outline scales with the handle across zoom (not a fixed screen width)", async ({
  page,
}) => {
  // The grip's outline must track the handle body, not stay pinned to a constant screen
  // width (which reads too thick zoomed out / too thin zoomed in). The stroke-width is set
  // in flow units as `2 * screenScale`, so as you zoom OUT (screenScale = 1/zoom grows) the
  // flow-space width grows to hold a constant ON-SCREEN width — proving it is NOT a
  // non-scaling-stroke pinned at 2px.
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)
  const id = "edge-inheritance-dog-animal"
  const strokeUserUnits = () =>
    page.evaluate((eid) => {
      const g = document.querySelector(`.react-flow__edge[data-id="${eid}"]`)
      const grip = g?.querySelector(".edge-endpoint-grip--source") as SVGElement
      return grip ? parseFloat(getComputedStyle(grip).strokeWidth) : -1
    }, id)

  await selectEdge(page, id)
  const atDefault = await strokeUserUnits()
  expect(atDefault, "outline ~2 flow-units at zoom 1").toBeGreaterThan(1.5)
  expect(atDefault).toBeLessThan(3)

  const zoom = await zoomOutUntil(page, 0.5)
  await selectEdge(page, id)
  const zoomedOut = await strokeUserUnits()
  // Zoomed out to `zoom`, the flow-space stroke must have grown by ~1/zoom to hold its
  // on-screen width — a fixed non-scaling stroke would have stayed at ~2.
  expect(
    zoomedOut,
    "outline flow-width must grow when zoomed out so its on-screen width is constant"
  ).toBeGreaterThan(atDefault + 0.5)
  expect(zoomedOut).toBeCloseTo(atDefault / zoom, 0)
})

test("edge handles stay usable when zoomed out and grow when zoomed in", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)
  const id = "edge-bidirectional-dog-imovable"

  const measure = async () => {
    const edge = await selectEdge(page, id)
    const handle = edge.locator(".edge-bend-handle").first()
    await expect(handle).toBeVisible()
    return onScreenSize(handle)
  }

  // The editor initialises at zoom 1.0.
  const atDefault = await measure()
  expect(atDefault.long).toBeGreaterThanOrEqual(24)

  // Zoom in: the handle grows with the (now-thicker) edge, staying proportional
  // rather than looking like a tiny dot on it.
  const zoomIn = page.getByRole("button", { name: "Zoom in" })
  for (let i = 0; i < 3; i++) {
    await zoomIn.click()
    await page.waitForTimeout(70)
  }
  const zoomedIn = await measure()
  expect(zoomedIn.long, "handle should grow when zoomed in").toBeGreaterThan(
    atDefault.long
  )

  // Zoom back out below 1x: the handle counter-scales to keep a usable minimum
  // on-screen size instead of shrinking to a few px.
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Zoom out" }).click()
    await page.waitForTimeout(70)
  }
  const zoomedOut = await measure()
  expect(
    zoomedOut.long,
    "handle should stay usable when zoomed out"
  ).toBeGreaterThanOrEqual(24)
})

test("node connection indicators keep a constant on-screen size across zoom", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, noEdge)
  await waitForCanvasReady(page)
  const node = page.locator(`.react-flow__node[data-id="${SRC}"]`).first()

  // On-screen width of a visible arc indicator = its ::before width * zoom.
  const arcScreenWidth = async () => {
    await node.hover()
    await page.waitForTimeout(120)
    const flowWidth = await page.evaluate(() => {
      const arc = document.querySelector(".apollon-arc-handle")
      if (!arc) return 0
      return parseFloat(getComputedStyle(arc, "::before").width)
    })
    return flowWidth * (await viewportZoom(page))
  }

  const atDefault = await arcScreenWidth()
  expect(atDefault).toBeGreaterThan(0)

  const zoomOut = page.getByRole("button", { name: "Zoom out" })
  for (let i = 0; i < 4; i++) {
    await zoomOut.click()
    await page.waitForTimeout(70)
  }
  const zoomedOut = await arcScreenWidth()

  // Without counter-scaling the arc would shrink with zoom; it must stay ~constant.
  expect(Math.abs(zoomedOut - atDefault) / atDefault).toBeLessThan(0.2)
})

test("node shows fewer connection arcs when zoomed out so they do not overlap", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, noEdge)
  await waitForCanvasReady(page)
  const node = page.locator(`.react-flow__node[data-id="${SRC}"]`).first()
  await node.hover()
  await page.waitForTimeout(120)

  const arcs = () => node.locator(".apollon-arc-handle").count()
  const atDefault = await arcs()
  expect(atDefault).toBeGreaterThan(0)

  // Zoom out until the viewport zoom is low enough that arc-reduction must
  // trigger. The SRC node is 160×100; the width axis drops from 3→1 arcs
  // below ~0.5x, so settling at ≤0.45x guarantees a reduction. Driving by the
  // real zoom (not a fixed click count) keeps this stable on slow CI runners.
  await zoomOutUntil(page, 0.45)
  await node.hover()
  await page.waitForTimeout(120)
  const zoomedOut = await arcs()

  // Zooming out reduces the number of visible arcs (never increases), so the
  // constant-size arcs stop colliding.
  expect(zoomedOut).toBeLessThan(atDefault)
  expect(zoomedOut).toBeGreaterThan(0) // always at least the centre arcs
})

test("dragging a bend handle far toward a node clamps instead of snapping back", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)
  const edge = await selectEdge(page, "edge-bidirectional-dog-imovable")
  const mainPath = edge.locator(".react-flow__edge-path").first()
  const before = await mainPath.getAttribute("d")

  // Drag the terminal bend handle a long way toward the opposite node — far
  // enough that it would collapse a stub and (previously) snap all the way
  // back to a straight line.
  const handles = edge.locator(".edge-bend-handle")
  const handle = handles.nth((await handles.count()) - 1)
  const box = (await handle.boundingBox())!
  const horizontal = box.width > box.height
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(
    cx + (horizontal ? 0 : -220),
    cy + (horizontal ? -220 : 0),
    {
      steps: 18,
    }
  )
  await page.mouse.up()
  await page.waitForTimeout(350)

  const after = await mainPath.getAttribute("d")
  // It must keep a bend (clamped at the last valid position), not revert.
  expect(after, "far near-node drag snapped all the way back").not.toEqual(
    before
  )
  const pointCount = (after?.match(/[ML]/g) ?? []).length
  expect(pointCount, "edge collapsed to a straight line").toBeGreaterThan(2)
})

test("a short edge between close nodes always offers a draggable handle", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, closeNodes)
  await waitForCanvasReady(page)

  // Draw a short edge from the source's right handle onto the (close) target.
  const srcNode = page.locator(`.react-flow__node[data-id="${SRC}"]`).first()
  const tgtNode = page.locator(`.react-flow__node[data-id="${TGT}"]`).first()
  await srcNode.hover()
  await page.waitForTimeout(120)
  const rightHandle = srcNode.locator(
    '.react-flow__handle[data-handleid="right"]'
  )
  const hb = (await rightHandle.first().boundingBox())!
  const tb = (await tgtNode.boundingBox())!
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(tb.x + 8, tb.y + tb.height / 2, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(400)

  const edge = page.locator(".react-flow__edge").first()
  await expect(edge).toHaveCount(1)

  // The edge is short (no bend handle), but it must still be editable: at least
  // one non-disabled endpoint handle, or a bend handle, must be present.
  const draggable = await page.evaluate(() => {
    const g = document.querySelector(".react-flow__edge")
    if (!g) return 0
    const bend = g.querySelectorAll(".edge-bend-handle").length
    const endpoints = Array.from(
      g.querySelectorAll(".edge-endpoint-handle")
    ).filter(
      (el) =>
        !el.classList.contains("edge-endpoint-handle--disabled") &&
        (el as SVGElement).getAttribute("pointer-events") !== "none"
    ).length
    return bend + endpoints
  })
  expect(
    draggable,
    "short edge has no draggable handle (dead state)"
  ).toBeGreaterThan(0)
})
