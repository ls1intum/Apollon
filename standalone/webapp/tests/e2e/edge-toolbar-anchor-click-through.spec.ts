import { test, expect, type Page } from "@playwright/test"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

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
  await expect(edgeLoc(page)).toHaveClass(/selected/)
}

const selectedEdgeIds = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll(".react-flow__edge.selected")).map(
      (e) => e.getAttribute("data-id")
    )
  )

test("the edge toolbar's empty surface lets canvas clicks through", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)

  await clickEdgeLine(page)
  const toolbar = page.locator(`.react-flow__edge-toolbar[data-id="${EDGE}"]`)
  const box = (await toolbar.boundingBox())!
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2)
  await expect(edgeLoc(page)).not.toHaveClass(/selected/)
  expect(await selectedEdgeIds(page)).toEqual([])
})

test("clicking the edge line still selects the edge", async ({ page }) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)

  await clickEdgeLine(page)
  expect(await selectedEdgeIds(page)).toEqual([EDGE])
})

test("the selected edge's toolbar buttons remain interactive", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)

  await clickEdgeLine(page)
  expect(await selectedEdgeIds(page)).toEqual([EDGE])

  await page.getByRole("button", { name: "Edit edge" }).click()
  await expect(page.locator(".apollon-popover")).toBeVisible()
})
