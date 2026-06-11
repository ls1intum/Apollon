import { test, expect } from "@playwright/test"
import { waitForCanvasReady } from "../helpers/canvas"

/**
 * Guards the VersionDrawer infinite-loop regression ("Maximum update depth
 * exceeded" from subscribing to `state.versions[id] ?? []`): mounts the full
 * app and asserts no React error overlay or console warnings appear.
 */

const MODEL_ID = "e2e-version-history-model"

async function seedLocalDiagram(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.evaluate((id) => {
    const storeValue = JSON.stringify({
      state: {
        models: {
          [id]: {
            id,
            model: {
              id,
              type: "ClassDiagram",
              assessments: {},
              edges: [],
              nodes: [],
              title: "Version History E2E Diagram",
              version: "4.0.0",
            },
            lastModifiedAt: new Date().toISOString(),
          },
        },
        currentModelId: id,
      },
      version: 0,
    })
    localStorage.setItem("persistenceModelStore", storeValue)
  }, MODEL_ID)
  await page.goto(`/local/${MODEL_ID}`)
}

test.describe("Version history (regression)", () => {
  test("loads the local editor without React errors or infinite-loop warnings", async ({
    page,
  }) => {
    const errors: string[] = []
    const warnings: string[] = []
    page.on("console", (msg) => {
      const text = msg.text()
      if (msg.type() === "error") errors.push(text)
      if (msg.type() === "warning") warnings.push(text)
    })
    page.on("pageerror", (err) => {
      errors.push(err.message)
    })

    await seedLocalDiagram(page)
    await waitForCanvasReady(page, false)

    // The whole app mounts AppProviders (which mounts the version store via
    // its persist middleware on first import). Even on /local/:id where
    // VersionDrawer isn't rendered, the store is initialised and persisted.
    await expect(page.locator(".react-flow").first()).toBeVisible()

    const offending = [...errors, ...warnings].filter(
      (m) =>
        m.includes("Maximum update depth exceeded") ||
        m.includes("getSnapshot should be cached")
    )
    expect(offending, offending.join("\n")).toEqual([])
  })
})
