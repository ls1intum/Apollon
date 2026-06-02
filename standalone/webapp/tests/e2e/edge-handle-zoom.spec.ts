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
const SRC = "95aac2b6-3e6b-4e6d-9201-52a498e6ea20"
const TGT = "32659cdc-bd03-46f3-918c-ee8dbba9c15b"

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

test("edge handles keep a constant on-screen size across zoom", async ({
  page,
}) => {
  await injectFixtureIntoLocalStorage(page, classDiagram)
  await page.goto("/")
  await waitForCanvasReady(page)

  const edge = await selectEdge(page, "edge-bidirectional-dog-imovable")
  const handle = edge.locator(".edge-bend-handle").first()
  await expect(handle).toBeVisible()
  const atDefault = await onScreenSize(handle)

  // Zoom in substantially.
  const zoomIn = page.locator(".react-flow__controls-zoomin")
  for (let i = 0; i < 4; i++) {
    await zoomIn.click()
    await page.waitForTimeout(60)
  }
  await selectEdge(page, "edge-bidirectional-dog-imovable")
  const zoomed = await onScreenSize(edge.locator(".edge-bend-handle").first())

  // Despite a large zoom change, the on-screen handle size stays ~constant
  // (counter-scaled). Without it, the handle would have grown with zoom.
  expect(Math.abs(zoomed.long - atDefault.long) / atDefault.long).toBeLessThan(
    0.2
  )
  // And it stays a comfortably grabbable size.
  expect(atDefault.long).toBeGreaterThanOrEqual(24)
  expect(zoomed.long).toBeGreaterThanOrEqual(24)
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
