import { test, expect, type Page } from "@playwright/test"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * The keyboard shortcuts, end to end. Undo/redo and Delete are covered by the
 * other editor specs; these are the paths this feature added.
 *
 * A hand-built fixture keeps the counts deterministic: two leaf classes (no
 * attribute/method child nodes, so one `.react-flow__node` each) joined by an
 * edge, placed far enough apart that the diagram overflows the viewport at
 * 100% — otherwise a broken zoom-to-fit is indistinguishable from reset-zoom.
 */
const TWO_CLASSES = {
  id: "e2e-keyboard-shortcuts",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "Keyboard shortcuts",
  assessments: {},
  nodes: [
    {
      id: "class-a-0000-0000-0000-000000000001",
      type: "class",
      width: 200,
      height: 100,
      position: { x: 400, y: 300 },
      measured: { width: 200, height: 100 },
      data: { name: "Alpha", attributes: [], methods: [] },
    },
    {
      id: "class-b-0000-0000-0000-000000000002",
      type: "class",
      width: 200,
      height: 100,
      position: { x: 2200, y: 1400 },
      measured: { width: 200, height: 100 },
      data: { name: "Beta", attributes: [], methods: [] },
    },
  ],
  edges: [
    {
      id: "edge-1-0000-0000-0000-000000000003",
      type: "class",
      source: "class-a-0000-0000-0000-000000000001",
      target: "class-b-0000-0000-0000-000000000002",
      data: {},
    },
  ],
}

const nodes = (page: Page) => page.locator(".react-flow__node")
const selectedNodes = (page: Page) => page.locator(".react-flow__node.selected")
const edges = (page: Page) => page.locator(".react-flow__edge")
const zoomReadout = (page: Page) =>
  page.locator(".apollon-chrome-iconbtn--readout")

test.describe("Keyboard shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, TWO_CLASSES)
    await waitForCanvasReady(page)
  })

  test("Ctrl+A selects everything, Ctrl+D duplicates it with its edges", async ({
    page,
  }) => {
    // Selecting with the keyboard sidesteps the flaky node click — React Flow
    // keeps the canvas subtly animating, so Playwright never sees a node
    // "stable" enough to click.
    await page.keyboard.press("ControlOrMeta+KeyA")
    await expect(selectedNodes(page)).toHaveCount(2)

    await page.keyboard.press("ControlOrMeta+KeyD")

    // Both classes are copied, the association between them comes along (the
    // bug this fixes dropped it), and the copies carry the selection.
    await expect(nodes(page)).toHaveCount(4)
    await expect(edges(page)).toHaveCount(2)
    await expect(selectedNodes(page)).toHaveCount(2)
  })

  test("Escape clears the selection", async ({ page }) => {
    await page.keyboard.press("ControlOrMeta+KeyA")
    await expect(selectedNodes(page)).toHaveCount(2)

    await page.keyboard.press("Escape")
    await expect(selectedNodes(page)).toHaveCount(0)
  })

  test("zoom shortcuts drive the viewport", async ({ page }) => {
    await expect(zoomReadout(page)).toHaveText("100%")

    // React Flow steps zoom by 1/1.2, so one step out of 100% lands on 83%.
    await page.keyboard.press("ControlOrMeta+Minus")
    await expect(zoomReadout(page)).toHaveText("83%")

    await page.keyboard.press("ControlOrMeta+Equal")
    await expect(zoomReadout(page)).toHaveText("100%")

    // This diagram overflows the viewport at 100%, so a fit that silently fell
    // through to reset-zoom would leave the readout at 100%.
    await page.keyboard.press("ControlOrMeta+Shift+Digit1")
    await expect(zoomReadout(page)).not.toHaveText("100%")

    await page.keyboard.press("ControlOrMeta+Digit0")
    await expect(zoomReadout(page)).toHaveText("100%")
  })

  test("Ctrl+S downloads the diagram as JSON", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download")
    await page.keyboard.press("ControlOrMeta+KeyS")
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.json$/)
  })
})
