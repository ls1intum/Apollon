import { test, expect, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * Tapping a palette element (a press that does not travel) must place the
 * element at the centre of the visible canvas and select it — never drop it
 * hidden beneath the palette. Consecutive taps cascade so they do not stack
 * exactly on top of one another.
 */

const EMPTY_MODEL = {
  id: "e2e-palette-tap-model-id",
  type: "ClassDiagram",
  assessments: {},
  edges: [],
  nodes: [],
  title: "E2E Diagram",
  version: "4.0.0",
}

// Press and release on the first palette element WITHOUT moving — a tap.
async function tapFirstPaletteElement(page: Page) {
  const palette = page.locator('[data-testid="apollon-palette"]').first()
  const preview = palette.locator("[data-draggable-preview]").first()
  await expect(preview).toBeVisible()
  const box = await preview.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.up()
}

// Selection flag + on-screen transform (React Flow positions nodes with a
// `transform: translate(...)`, not `left`/`top`) for every node.
async function nodePositions(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>(".react-flow__node")).map(
      (node) => ({
        selected: node.classList.contains("selected"),
        transform: node.style.transform,
      })
    )
  )
}

test.describe("Palette tap-to-place", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, EMPTY_MODEL)
    await expect(page).toHaveURL(new RegExp(`/local/${EMPTY_MODEL.id}$`))
    await waitForCanvasReady(page, false)
  })

  test("tap places a selected node on the canvas; repeats cascade", async ({
    page,
  }) => {
    // First tap: one selected node, sitting inside the canvas (not hidden
    // under the left-rail palette — an X-containment check).
    await tapFirstPaletteElement(page)
    await expect(page.locator(".react-flow__node")).toHaveCount(1)
    await expect(page.locator(".react-flow__node.selected")).toHaveCount(1)

    const box = await page.locator(".react-flow__node").first().boundingBox()
    const canvasBox = await page.locator(".react-flow").first().boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(canvasBox!.x)
    expect(box!.x + box!.width).toBeLessThanOrEqual(
      canvasBox!.x + canvasBox!.width + 1
    )

    // Second tap: two nodes, only the latest selected, and cascaded (React Flow
    // positions nodes with `transform: translate()`, not left/top).
    await tapFirstPaletteElement(page)
    await expect(page.locator(".react-flow__node")).toHaveCount(2)

    const placed = await nodePositions(page)
    expect(placed.filter((n) => n.selected)).toHaveLength(1)
    expect(placed[0].transform).not.toBe(placed[1].transform)
  })
})
