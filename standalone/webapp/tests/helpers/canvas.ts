import type { Page } from "@playwright/test"

/**
 * Wait until the React Flow canvas is fully rendered and paint-settled.
 * @param page - Playwright page
 * @param expectNodes - if true, also waits for at least one .react-flow__node
 */
export async function waitForCanvasReady(page: Page, expectNodes = true) {
  // 1. React Flow container is visible
  await page
    .locator(".react-flow")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 })

  // 2. Viewport layer is attached
  await page
    .locator(".react-flow__viewport")
    .first()
    .waitFor({ state: "attached", timeout: 10_000 })

  // 3. At least one node is rendered and visible (when expected)
  if (expectNodes) {
    await page
      .locator(".react-flow__node")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 })
  }

  // 4. Web fonts are loaded before we paint. Diagram labels render in the
  //    bundled Inter font; screenshotting before the font swaps in captures
  //    fallback glyphs of a different width → a full-canvas pixel diff.
  await page.evaluate(() => document.fonts.ready)

  // 5. Park the cursor in the corner so a stray hover state left by a prior
  //    action (e.g. the fit-view click) can't bleed into the screenshot.
  await page.mouse.move(0, 0)

  // 6. Let layout and paint settle
  await page.waitForTimeout(800)
}

/**
 * Click the built-in ReactFlow "fit view" button from the <Controls> panel.
 * This zooms/pans so ALL nodes fit within the viewport (respects the global
 * minZoom of 0.4, unlike the onInit fitView which is clamped to 1.0).
 * Useful for large diagrams (e.g. BPMN) that overflow at zoom 1.0.
 */
export async function clickFitView(page: Page) {
  const fitViewBtn = page.locator('[aria-label="Fit to view"]')
  await fitViewBtn.click()
  // Let the zoom/pan animation settle
  await page.waitForTimeout(500)
}

/**
 * Inject a UMLModel fixture into localStorage so Zustand hydrates with it.
 * Must be called BEFORE navigation (page.goto).
 */
export async function injectFixtureIntoLocalStorage(
  page: Page,
  fixture: Record<string, unknown>
) {
  const modelId = fixture.id as string
  const storeValue = JSON.stringify({
    state: {
      models: {
        [modelId]: {
          id: modelId,
          model: fixture,
          lastModifiedAt: new Date().toISOString(),
        },
      },
      currentModelId: modelId,
    },
    version: 0,
  })

  await page.addInitScript((val) => {
    localStorage.setItem("persistenceModelStore", val)
  }, storeValue)
}

/**
 * Seed a fixture into localStorage and navigate directly to the local editor
 * route for that diagram. Use this instead of injectFixtureIntoLocalStorage +
 * page.goto("/") — the home route now renders the dashboard, not the editor.
 */
export async function openFixtureInLocalEditor(
  page: Page,
  fixture: Record<string, unknown>
) {
  await injectFixtureIntoLocalStorage(page, fixture)
  await page.goto(`/local/${fixture.id as string}`)
}
