import { test, expect, type Page, type Locator } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
} from "../helpers/canvas"

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

const viewportZoom = (page: Page) =>
  page.evaluate(() => {
    const vp = document.querySelector(".react-flow__viewport") as HTMLElement
    return new DOMMatrixReadOnly(getComputedStyle(vp).transform).a
  })

async function selectEdge(page: Page, id: string): Promise<Locator> {
  const edge = page.locator(`.react-flow__edge[data-id="${id}"]`)
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

test("edge handles stay usable when zoomed out and grow when zoomed in", async ({
  page,
}) => {
  await injectFixtureIntoLocalStorage(page, classDiagram)
  await page.goto("/")
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
  const zoomIn = page.locator(".react-flow__controls-zoomin")
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
    await page.locator(".react-flow__controls-zoomout").click()
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
  await injectFixtureIntoLocalStorage(page, noEdge)
  await page.goto("/")
  await waitForCanvasReady(page)
  const node = page.locator(`.react-flow__node[data-id="${SRC}"]`)

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

  const zoomOut = page.locator(".react-flow__controls-zoomout")
  for (let i = 0; i < 4; i++) {
    await zoomOut.click()
    await page.waitForTimeout(70)
  }
  const zoomedOut = await arcScreenWidth()

  // Without counter-scaling the arc would shrink with zoom; it must stay ~constant.
  expect(Math.abs(zoomedOut - atDefault) / atDefault).toBeLessThan(0.2)
})

test("dragging a bend handle far toward a node clamps instead of snapping back", async ({
  page,
}) => {
  await injectFixtureIntoLocalStorage(page, classDiagram)
  await page.goto("/")
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
  await injectFixtureIntoLocalStorage(page, closeNodes)
  await page.goto("/")
  await waitForCanvasReady(page)

  // Draw a short edge from the source's right handle onto the (close) target.
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
