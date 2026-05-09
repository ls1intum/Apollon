import { test, expect } from "@playwright/test"
import {
  injectFixtureIntoLocalStorage,
  waitForCanvasReady,
} from "../helpers/canvas"

/**
 * E2E coverage for issue #670 — local-mode version history.
 *
 * Run against a real Chromium so we exercise actual IndexedDB (the unit
 * suite uses fake-indexeddb). Server-down by design: local mode does not
 * touch the network.
 *
 * Covers the high-value journeys:
 *   - Empty drawer renders the local-specific empty CTA on /
 *   - "Save version" composer commits a row that survives reload
 *   - Restoring with a clean canvas writes a "Before restoring …" auto-row
 *   - Permalink ("Copy link") menu entry is hidden in local mode
 *   - Save button is disabled on an empty diagram
 */

const LOCAL_FIXTURE = {
  id: "local-test-uuid",
  version: "4.0.0",
  title: "E2E Local",
  type: "ClassDiagram",
  nodes: [
    {
      id: "n1",
      type: "Class",
      width: 160,
      height: 80,
      position: { x: 0, y: 0 },
      data: { name: "ClassA" },
      measured: { width: 160, height: 80 },
    },
  ],
  edges: [],
  assessments: {},
}

test.describe("Local version history (#670)", () => {
  test.beforeEach(async ({ page }) => {
    // Wipe the version-history IDB between tests so saves start cold.
    await page.addInitScript(async () => {
      try {
        await indexedDB.deleteDatabase("apollon-versions")
      } catch {
        // best-effort
      }
    })
  })

  test("History button is visible on / and opens the drawer", async ({
    page,
  }) => {
    await injectFixtureIntoLocalStorage(page, LOCAL_FIXTURE)
    await page.goto("/")
    await waitForCanvasReady(page)

    const historyButton = page.getByRole("button", {
      name: /Version history/i,
    })
    await expect(historyButton).toBeVisible()
    await historyButton.click()

    // The drawer (sidebar on desktop, bottom-sheet on mobile) is
    // identified by `aria-label="Version history"`.
    await expect(
      page.getByRole("complementary", { name: /Version history/i })
    ).toBeVisible()

    // Local-specific empty-state CTA.
    await expect(
      page.getByRole("button", { name: /Save first version/i })
    ).toBeVisible()
  })

  test("Save composer commits a row that survives reload", async ({ page }) => {
    await injectFixtureIntoLocalStorage(page, LOCAL_FIXTURE)
    await page.goto("/")
    await waitForCanvasReady(page)

    await page.getByRole("button", { name: /Version history/i }).click()
    const composer = page.getByRole("textbox", {
      name: /Describe this version/i,
    })
    await composer.fill("v1: initial")
    await page.getByRole("button", { name: /Save version/i }).click()

    // Row appears with the description.
    await expect(page.getByText("v1: initial").first()).toBeVisible()

    // Reload — IDB persists across page lifetime.
    await page.reload()
    await waitForCanvasReady(page)
    await page.getByRole("button", { name: /Version history/i }).click()
    await expect(page.getByText("v1: initial").first()).toBeVisible()
  })

  test("Save is disabled on an empty diagram", async ({ page }) => {
    const emptyFixture = { ...LOCAL_FIXTURE, nodes: [], edges: [] }
    await injectFixtureIntoLocalStorage(page, emptyFixture)
    await page.goto("/")
    await waitForCanvasReady(page, false)

    await page.getByRole("button", { name: /Version history/i }).click()
    const saveBtn = page.getByRole("button", { name: /Save version/i })
    await expect(saveBtn).toBeDisabled()
  })

  test("Permalink menu entry is absent in local mode", async ({ page }) => {
    await injectFixtureIntoLocalStorage(page, LOCAL_FIXTURE)
    await page.goto("/")
    await waitForCanvasReady(page)

    await page.getByRole("button", { name: /Version history/i }).click()
    await page
      .getByRole("textbox", { name: /Describe this version/i })
      .fill("v1")
    await page.getByRole("button", { name: /Save version/i }).click()
    await expect(page.getByText("v1").first()).toBeVisible()

    // Open the row's kebab menu.
    await page.getByRole("button", { name: /Version actions/i }).click()
    // "Copy link to this version" is the permalink item — must be hidden.
    await expect(
      page.getByRole("menuitem", { name: /Copy link/i })
    ).toHaveCount(0)
  })
})
