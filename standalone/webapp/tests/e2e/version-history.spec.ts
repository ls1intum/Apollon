import { test, expect } from "@playwright/test"
import { waitForCanvasReady } from "../helpers/canvas"

/**
 * E2E coverage for the version-history drawer.
 *
 * The local (/) page does not have a versionable diagram (versioning is for
 * shared/connected diagrams under /:diagramId). What we *can* verify here
 * without a running server is the regression that triggered the original bug
 * report:
 *
 *   "Maximum update depth exceeded" + "The result of getSnapshot should be
 *    cached to avoid an infinite loop"   in <VersionDrawer>
 *
 * This used to fire whenever the page rendered ApollonWithConnection because
 * VersionDrawer subscribed to `state.versions[id] ?? []`, which returned a
 * fresh array every call when the key was undefined. The Vitest unit test
 * `VersionDrawer.test.tsx` covers the static mount; this E2E test covers the
 * full app mount and asserts no React error overlay or runtime warnings hit
 * the browser console.
 */

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

    await page.goto("/")
    await waitForCanvasReady(page, false)

    // The whole app mounts AppProviders (which mounts the version store via
    // its persist middleware on first import). Even on the local page where
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
