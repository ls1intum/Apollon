import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * The keyboard shortcuts, end to end. Undo/redo and Delete are covered by the
 * other editor specs; these are the paths this feature added.
 *
 * The fixture is the 7-node class diagram on purpose: a single-node diagram
 * fits at the 100% cap, which makes a broken zoom-to-fit indistinguishable from
 * reset-zoom, and makes select-all indistinguishable from select-one.
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const classDiagram = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "fixtures", "class-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

const nodes = (page: Page) => page.locator(".react-flow__node")
const selectedNodes = (page: Page) => page.locator(".react-flow__node.selected")
const zoomReadout = (page: Page) =>
  page.locator(".apollon-chrome-iconbtn--readout")

test.describe("Keyboard shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, classDiagram)
    await waitForCanvasReady(page)
  })

  test("Ctrl+D duplicates the selection", async ({ page }) => {
    const before = await nodes(page).count()
    await nodes(page).first().click()
    await expect(selectedNodes(page)).toHaveCount(1)

    await page.keyboard.press("ControlOrMeta+KeyD")

    await expect(nodes(page)).toHaveCount(before + 1)
    // The copy takes the selection, so it can be moved straight away.
    await expect(selectedNodes(page)).toHaveCount(1)
  })

  test("Ctrl+A selects every node, Escape clears", async ({ page }) => {
    const total = await nodes(page).count()

    await page.keyboard.press("ControlOrMeta+KeyA")
    await expect(selectedNodes(page)).toHaveCount(total)

    await page.keyboard.press("Escape")
    await expect(selectedNodes(page)).toHaveCount(0)
  })

  test("zoom shortcuts drive the viewport", async ({ page }) => {
    await expect(zoomReadout(page)).toHaveText("100%")

    await page.keyboard.press("ControlOrMeta+Minus")
    await expect(zoomReadout(page)).toHaveText("75%")

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
