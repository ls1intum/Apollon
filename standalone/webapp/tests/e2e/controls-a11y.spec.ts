import { test, expect } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * Accessibility of the built-in editor controls now that they route through the
 * overlay engine: the zoom cluster follows the WAI-ARIA APG *toolbar* pattern
 * (one Tab stop, arrow-key roving), and the palette/minimap expose stable names.
 */

const MODEL = {
  id: "a11y-controls-0000",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "a11y controls",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: "n1-0000-0000-0000-000000000001",
      type: "class",
      width: 200,
      height: 110,
      position: { x: 260, y: 220 },
      measured: { width: 200, height: 110 },
      data: { name: "Alpha", attributes: [], methods: [] },
    },
  ],
}

const activeLabel = (page: import("@playwright/test").Page) =>
  page.evaluate(
    () => document.activeElement?.getAttribute("aria-label") ?? null
  )

test.describe("built-in controls accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, MODEL)
    await waitForCanvasReady(page)
  })

  test("zoom cluster is a single-tab-stop toolbar with arrow-key roving", async ({
    page,
  }) => {
    const toolbar = page.getByRole("toolbar", {
      name: "Zoom, history and selection controls",
    })
    await expect(toolbar).toBeVisible()

    // Exactly one control is in the tab order (roving tabindex).
    const tabbable = toolbar.locator("button[tabindex='0']")
    await expect(tabbable).toHaveCount(1)

    // The tab stop is the first control ("Zoom out").
    await tabbable.focus()
    expect(await activeLabel(page)).toBe("Zoom out")

    // ArrowRight roves across BOTH glass islands (view [−][%][+][fit][multi-
    // select] then history), staying a single tab stop — the toolbar spans
    // both islands.
    await page.keyboard.press("ArrowRight")
    expect(await activeLabel(page)).toBe("Zoom is 100%, reset to 100%")
    await expect(toolbar.locator("button[tabindex='0']")).toHaveCount(1)

    // End jumps to the last ENABLED control (roving skips disabled buttons). With
    // a freshly-loaded diagram the history island is either absent (no undo
    // manager) or its undo/redo start disabled, so the last reachable control is
    // the multi-select toggle; if an enabled redo is present it is "Redo". Assert
    // the concrete last DOM control — not merely "not the first".
    const expectedLast = await toolbar
      .locator("button:enabled")
      .last()
      .getAttribute("aria-label")
    expect(["Select multiple elements", "Redo"]).toContain(expectedLast)
    await page.keyboard.press("End")
    expect(await activeLabel(page)).toBe(expectedLast)

    // Home back to the first.
    await page.keyboard.press("Home")
    expect(await activeLabel(page)).toBe("Zoom out")

    // The fit-view control is keyboard-reachable within the toolbar
    // (Zoom out → %-reset → Zoom in → Fit view).
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    expect(await activeLabel(page)).toBe("Fit view")
  })

  test("palette and minimap expose accessible names", async ({ page }) => {
    const palette = page.getByTestId("apollon-palette")
    await expect(palette).toBeVisible()
    await expect(palette).toHaveAttribute("aria-label", "Element palette")
    await expect(
      page.getByRole("button", { name: "Show minimap" })
    ).toBeVisible()
  })
})
