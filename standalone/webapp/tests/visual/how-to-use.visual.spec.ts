import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Visual spec that generates the "How this editor works" modal images from the
 * CURRENT editor — one source of truth. Each test drives the live editor to a
 * clean, deterministic, instructional end-state and screenshots the editor area
 * (no browser chrome). The baselines ARE the modal assets: the dedicated
 * "howto-assets" Playwright project (see playwright.config.ts) points
 * snapshotPathTemplate at assets/images/how-to-use-{arg}.png, the exact files
 * HowToUseModal.tsx imports.
 *
 * Regenerate the four modal images with:
 *
 *   pnpm exec playwright test --project howto-assets --update-snapshots
 *
 * Then run the same project WITHOUT --update-snapshots to confirm the diff is
 * stable (maxDiffPixelRatio 0.01). The snapshot names below MUST stay in sync
 * with the filenames HowToUseModal.tsx imports:
 *   node-creation, edge-creation, node-edit, node-move.
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fixturesDir = path.join(__dirname, "..", "fixtures")

function loadFixture(filename: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(fixturesDir, filename), "utf-8")
  return JSON.parse(raw) as Record<string, unknown>
}

const singleClass = loadFixture("single-class.json")
const twoClassWithEdge = loadFixture("two-class-fresh-edge.json")

const editorArea = (page: Page) => page.locator('[data-testid="editor-area"]')

/**
 * Select the only class node and wait for its floating NodeToolbar (Trash2 +
 * Pencil) to appear. ReactFlow renders the toolbar into the canvas, so it is
 * captured inside the editor-area clip.
 */
async function selectNodeAndShowToolbar(page: Page) {
  const node = page.locator(".react-flow__node").first()
  await node.click()
  await expect(node).toHaveClass(/selected/)
  await page.locator(".react-flow__node-toolbar").first().waitFor({
    state: "visible",
    timeout: 10_000,
  })
  // Park the cursor so a hover state from the click can't bleed into the shot.
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
}

test.describe("How-to-use modal assets", () => {
  // node-creation: the element palette on the left + a node placed on the
  // canvas. A stable injected end-state (rather than a flaky mid-drag frame)
  // clearly illustrates "drag a node onto the canvas".
  test("node-creation", async ({ page }) => {
    await openFixtureInLocalEditor(page, singleClass)
    await waitForCanvasReady(page)

    // No header mask: unlike the diagram-fixture suite (where the floating
    // in-canvas header would bleed unrelated diffs), here the current chrome IS
    // part of the instructional image and renders deterministically.
    await expect(editorArea(page)).toHaveScreenshot("node-creation.png")
  })

  // edge-creation: two class nodes joined by an edge.
  test("edge-creation", async ({ page }) => {
    await openFixtureInLocalEditor(page, twoClassWithEdge)
    await waitForCanvasReady(page)
    // Wait for the edge path to render before capturing.
    await page.locator(".react-flow__edge").first().waitFor({
      state: "visible",
      timeout: 10_000,
    })
    await page.mouse.move(0, 0)
    await page.waitForTimeout(300)

    await expect(editorArea(page)).toHaveScreenshot("edge-creation.png")
  })

  // node-edit: a class node with its Edit popover open (the "Class type" kind
  // Select, plus the name/attributes/methods fields visible). The popover is
  // portaled to <body>, so screenshot the full page (not just the editor-area
  // locator) to capture the canvas node AND the popover.
  test("node-edit", async ({ page }) => {
    await openFixtureInLocalEditor(page, singleClass)
    await waitForCanvasReady(page)
    await selectNodeAndShowToolbar(page)

    // Open the edit popover via the Pencil (second icon in the toolbar). The
    // Trash2 is first; targeting by position avoids depending on lucide class
    // names.
    await page.locator(".react-flow__node-toolbar svg").nth(1).click()

    // The popover renders the "Class type" Select — wait for its trigger to
    // confirm the popover has painted.
    await expect(
      page.locator('.apollon-select-trigger[aria-label="Class type"]')
    ).toBeVisible({ timeout: 10_000 })
    await page.mouse.move(0, 0)
    await page.waitForTimeout(400)

    await expect(editorArea(page)).toHaveScreenshot("node-edit.png")
  })

  // node-move (the "Delete Class" modal step): a selected node showing its
  // selection outline + the Trash2/Pencil delete affordance.
  test("node-move", async ({ page }) => {
    await openFixtureInLocalEditor(page, singleClass)
    await waitForCanvasReady(page)
    await selectNodeAndShowToolbar(page)

    await expect(editorArea(page)).toHaveScreenshot("node-move.png")
  })
})
