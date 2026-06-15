import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Guards against the "visible but undraggable bend handle" bug. A selected
 * edge's handle could be covered by (a) another edge's interaction/overlay
 * ribbon, or (b) the edge's own toolbar box — stealing the pointer (the
 * reported "finger" cursor). The fixes: elevate the selected edge above other
 * edges, and make the toolbar body pointer-transparent (only its buttons take
 * the pointer).
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const classDiagram = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "class-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

/** Select an edge by clicking a point ON its path (25% along its length, away
 * from the centre bend handle) so React Flow actually selects it. Clicking an
 * L-shaped edge's bounding-box centre misses the stroke. */
async function selectEdgeById(page: Page, id: string): Promise<void> {
  const pt = await page.evaluate((edgeId) => {
    const g = document.querySelector(`.react-flow__edge[data-id="${edgeId}"]`)
    const p = g?.querySelector(
      "path.react-flow__edge-path"
    ) as SVGPathElement | null
    const ctm = p?.getScreenCTM()
    if (!p || !ctm) return null
    const at = p.getPointAtLength(p.getTotalLength() * 0.25)
    const screen = new DOMPoint(at.x, at.y).matrixTransform(ctm)
    return { x: screen.x, y: screen.y }
  }, id)
  if (!pt) throw new Error(`edge ${id} path not found`)
  await page.mouse.click(pt.x, pt.y)
  await page.waitForTimeout(150)
}

/** zIndex of the <svg> wrapping a given edge's `.react-flow__edge` group. */
async function edgeZIndex(page: Page, id: string): Promise<number> {
  return page.evaluate((edgeId) => {
    const g = document.querySelector(`.react-flow__edge[data-id="${edgeId}"]`)
    const svg = g?.closest("svg") as SVGElement | null
    return svg ? Number(getComputedStyle(svg).zIndex) || 0 : 0
  }, id)
}

test("selecting an edge elevates it above unselected edges", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)

  const selectedId = "edge-bidirectional-dog-imovable"
  const otherId = "edge-inheritance-dog-animal"

  await selectEdgeById(page, selectedId)

  const selectedZ = await edgeZIndex(page, selectedId)
  const otherZ = await edgeZIndex(page, otherId)
  expect(
    selectedZ,
    "selected edge must paint above unselected edges so its handles are hittable"
  ).toBeGreaterThan(otherZ)
})

test("the edge toolbar body does not capture pointer events (only its buttons do)", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)

  await selectEdgeById(page, "edge-bidirectional-dog-imovable")

  const pe = await page.evaluate((edgeId) => {
    const g = document.querySelector(`.react-flow__edge[data-id="${edgeId}"]`)
    const fo = g?.querySelector("foreignObject")
    const body = fo?.querySelector(":scope > div") as HTMLElement | null
    if (!body) return null
    const button = body.querySelector(":scope > *") as HTMLElement | null
    return {
      body: getComputedStyle(body).pointerEvents,
      button: button ? getComputedStyle(button).pointerEvents : null,
    }
  }, "edge-bidirectional-dog-imovable")

  expect(pe, "toolbar should be rendered for the selected edge").not.toBeNull()
  expect(pe!.body, "toolbar body must not steal the pointer").toBe("none")
  expect(pe!.button, "toolbar buttons must stay clickable").toBe("auto")
})
