import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

const __d = path.dirname(fileURLToPath(import.meta.url))
const classDiagram = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "class-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

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
  await expect(page.locator(`.react-flow__edge[data-id="${id}"]`)).toHaveClass(
    /selected/
  )
}

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

  const pe = await page
    .locator(
      '.react-flow__edge-toolbar[data-id="edge-bidirectional-dog-imovable"]'
    )
    .evaluate((root) => {
      const body = root.querySelector(
        ".apollon-edge-toolbar"
      ) as HTMLElement | null
      const button = body?.querySelector("button") as HTMLElement | null
      if (!body || !button) return null
      return {
        root: getComputedStyle(root).pointerEvents,
        body: getComputedStyle(body).pointerEvents,
        button: getComputedStyle(button).pointerEvents,
      }
    })

  expect(pe, "toolbar should be rendered for the selected edge").not.toBeNull()
  expect(pe!.root, "React Flow's toolbar portal must be transparent").toBe(
    "none"
  )
  expect(pe!.body, "toolbar body must not steal the pointer").toBe("none")
  expect(pe!.button, "toolbar buttons must stay clickable").toBe("auto")
})
