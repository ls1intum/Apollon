import { expect, type Page } from "@playwright/test"

async function waitForCanvasGeometryStable(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        let previous = ""
        let stableFrames = 0
        let frame = 0

        const sample = () => {
          const viewport =
            document
              .querySelector(".react-flow__viewport")
              ?.getAttribute("style") ?? ""
          const paths = [...document.querySelectorAll(".react-flow__edge-path")]
            .map((path) => path.getAttribute("d") ?? "")
            .join("|")
          const nodes = [...document.querySelectorAll(".react-flow__node")]
            .map(
              (node) =>
                `${node.getAttribute("style") ?? ""}:${node.getAttribute("class") ?? ""}`
            )
            .join("|")
          const current = `${viewport}::${nodes}::${paths}`
          stableFrames = current === previous ? stableFrames + 1 : 0
          previous = current

          if (stableFrames >= 6) return resolve()
          if (frame++ >= 180)
            return reject(new Error("canvas geometry did not settle"))
          requestAnimationFrame(sample)
        }

        requestAnimationFrame(sample)
      })
  )
}

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

  // 6. Await stable rendered geometry rather than guessing a delay.
  await waitForCanvasGeometryStable(page)
}

/**
 * Click the "Fit view" button from the bottom-left zoom cluster. This zooms/pans
 * so ALL nodes fit within the viewport (respects the global minZoom of 0.4,
 * unlike the onInit fitView which is clamped to 1.0), reserving the overlay
 * insets so content is framed clear of the chrome. Useful for large diagrams
 * (e.g. BPMN) that overflow at zoom 1.0.
 */
export async function clickFitView(page: Page) {
  // The zoom cluster is a slotted overlay control (no longer React Flow's
  // built-in <Controls> panel); its fit button carries this stable aria-label.
  const fitViewBtn = page.getByRole("button", { name: "Fit view" })
  await fitViewBtn.click()
  await waitForCanvasGeometryStable(page)
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

export async function openNewDiagramDialog(page: Page) {
  const trigger = page.getByRole("button", { name: "New diagram" }).first()
  const dialog = page.getByRole("dialog")

  await expect(async () => {
    if (!(await dialog.isVisible())) await trigger.click()
    await expect(dialog).toBeVisible()
  }).toPass({ timeout: 15_000 })

  return dialog
}

/**
 * Create one of the bundled presets through the real dashboard dialog.
 *
 * Template visual tests use this instead of injecting the asset directly:
 * cloning, transient-state cleanup, fresh-id assignment, persistence and route
 * navigation are all part of what a user sees when choosing a preset.
 */
export async function createTemplateInLocalEditor(
  page: Page,
  templateName: string
) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "persistenceModelStore",
      JSON.stringify({
        state: { models: {}, currentModelId: null },
        version: 3,
      })
    )
  })
  await page.goto("/")
  await page
    .getByRole("heading", { level: 1, name: "Your diagrams" })
    .waitFor({ timeout: 15_000 })

  const dialog = await openNewDiagramDialog(page)
  await dialog.getByRole("tab", { name: "Use template" }).click()
  await dialog.getByRole("button", { name: templateName, exact: true }).click()
  await dialog.getByRole("button", { name: "Create Diagram" }).click()

  await page.waitForURL(/\/local\/[^/]+$/, { timeout: 15_000 })
  await waitForCanvasReady(page)

  return page.evaluate(() => {
    const persisted = localStorage.getItem("persistenceModelStore")
    if (!persisted) return null

    const state = JSON.parse(persisted).state as {
      currentModelId?: string
      models?: Record<string, { model?: Record<string, unknown> }>
    }
    const currentId = state.currentModelId
    return currentId ? (state.models?.[currentId]?.model ?? null) : null
  })
}

/** Select an edge through the visible middle of its rendered path. */
export async function selectEdgeOnPath(page: Page, edgeId: string) {
  const point = await page.evaluate((id) => {
    const path = document.querySelector(
      `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`
    ) as SVGPathElement | null
    if (!path) return null

    const transform = path.getScreenCTM()
    if (!transform) return null

    const midpoint = path.getPointAtLength(path.getTotalLength() / 2)
    const screenPoint = new DOMPoint(midpoint.x, midpoint.y).matrixTransform(
      transform
    )
    return { x: screenPoint.x, y: screenPoint.y }
  }, edgeId)

  if (!point) {
    throw new Error(`Edge "${edgeId}" path was not rendered`)
  }

  await page.mouse.click(point.x, point.y)
  await expect(
    page.locator(`.react-flow__edge[data-id="${edgeId}"]`)
  ).toHaveClass(/selected/)
}
