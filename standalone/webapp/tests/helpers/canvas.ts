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

  // 4. Let layout and paint settle
  await page.waitForTimeout(800)
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
