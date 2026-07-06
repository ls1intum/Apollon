import { test, expect, type Page } from "@playwright/test"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * An edge's edit/delete toolbar is anchored to an SVG <foreignObject> that is
 * ALWAYS present (it positions the popover) and sits OFFSET from the edge line —
 * its box doesn't overlap the visible edge at all. If that box captured the
 * pointer it would select the edge from an empty region ~50px away from the line.
 * The box must be transparent to the pointer: an edge is selected only by clicking
 * its line, while the toolbar's own buttons stay clickable. Same hit-area fix as
 * the node toolbar (#791) and the node handles.
 */

const __dirname2 = path.dirname(fileURLToPath(import.meta.url))
const classDiagram = JSON.parse(
  fs.readFileSync(
    path.join(__dirname2, "..", "fixtures", "class-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

const EDGE = "edge-inheritance-dog-animal"

const edgeLoc = (page: Page) =>
  page.locator(`.react-flow__edge[data-id="${EDGE}"]`)

/** Click a point ON the edge's actual line (25% along the path). */
async function clickEdgeLine(page: Page): Promise<void> {
  const pt = await page.evaluate((id) => {
    const p = document
      .querySelector(`.react-flow__edge[data-id="${id}"]`)
      ?.querySelector("path.react-flow__edge-path") as SVGPathElement | null
    const ctm = p?.getScreenCTM()
    if (!p || !ctm) return null
    const at = p.getPointAtLength(p.getTotalLength() * 0.25)
    const s = new DOMPoint(at.x, at.y).matrixTransform(ctm)
    return { x: s.x, y: s.y }
  }, EDGE)
  if (!pt) throw new Error("edge path not found")
  await page.mouse.click(pt.x, pt.y)
  await page.waitForTimeout(200)
}

const selectedEdgeIds = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll(".react-flow__edge.selected")).map(
      (e) => e.getAttribute("data-id")
    )
  )

test("the edge toolbar's offset anchor box does not select the edge", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)

  // The <foreignObject> anchor is present even while the edge is unselected.
  const foBox = (await edgeLoc(page)
    .locator("foreignObject")
    .first()
    .boundingBox())!
  const lineBox = (await edgeLoc(page)
    .locator(".edge-overlay")
    .first()
    .boundingBox())!

  // Sanity: the anchor box really is off the visible line (this is what makes a
  // click there surprising).
  const anchorRight = foBox.x + foBox.width
  expect(anchorRight).toBeLessThanOrEqual(lineBox.x + 1)

  // Click inside the anchor box, well away from the line: must NOT select the edge.
  await page.mouse.click(foBox.x + 4, foBox.y + 4)
  await page.waitForTimeout(200)
  expect(await selectedEdgeIds(page)).toEqual([])
})

test("clicking the edge line still selects the edge", async ({ page }) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)

  await clickEdgeLine(page)
  expect(await selectedEdgeIds(page)).toEqual([EDGE])
})

test("the selected edge's toolbar buttons still work (foreignObject stays transparent)", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)

  await clickEdgeLine(page)
  expect(await selectedEdgeIds(page)).toEqual([EDGE])

  // The edit (pencil) button sits inside the pointer-events:none foreignObject
  // and must still receive the click, opening the edit popover.
  await edgeLoc(page).getByRole("button", { name: "Edit edge" }).click()
  await page.waitForTimeout(200)
  await expect(page.locator(".apollon-popover")).toHaveCount(1)
})
