import { test, expect, type Page } from "@playwright/test"

/**
 * E2E behavioural tests for the Apollon2 UML diagram editor.
 *
 * These cover the critical user journeys on the local (/) page and verify
 * that the editor loads correctly, the sidebar is usable and basic
 * interactions (select, pan) work.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForCanvasReady(page: Page) {
  await page
    .locator(".react-flow")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 })
  await page
    .locator(".react-flow__viewport")
    .first()
    .waitFor({ state: "attached", timeout: 10_000 })
  await page.waitForTimeout(800)
}

/**
 * Return the visible "File" menu button.
 * Both desktop and mobile navbars render a button with id="file-menu-button".
 * At the 1280×720 test viewport the desktop variant is visible.
 */
function fileMenuButton(page: Page) {
  return page.locator("#file-menu-button").first()
}

// ---------------------------------------------------------------------------
// Basic loading
// ---------------------------------------------------------------------------

test.describe("Editor loading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await waitForCanvasReady(page)
  })

  test("app loads and shows the editor canvas", async ({ page }) => {
    const canvas = page.locator(".react-flow").first()
    await expect(canvas).toBeVisible()
  })

  test("canvas contains the React Flow viewport", async ({ page }) => {
    const viewport = page.locator(".react-flow__viewport").first()
    await expect(viewport).toBeAttached()
  })

  test("sidebar is visible with draggable elements", async ({ page }) => {
    // The sidebar is an <aside> rendered inside the library's App component
    const sidebar = page.locator("aside").first()
    await expect(sidebar).toBeVisible()

    // It should contain at least one draggable preview element
    const draggableItems = sidebar.locator(".prevent-select")
    await expect(draggableItems.first()).toBeVisible()
    expect(await draggableItems.count()).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Template loading – ensures a non-empty diagram
// ---------------------------------------------------------------------------

test.describe("Template diagram interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await waitForCanvasReady(page)

    // Load the Adapter template via File → Start from Template → Create
    await fileMenuButton(page).click()
    await page.getByText("Start from Template").click()
    await page.getByRole("button", { name: "Create Diagram" }).click()
    await waitForCanvasReady(page)

    // Template has nodes – wait for them
    await page
      .locator(".react-flow__node")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
  })

  test("at least one node is visible on the template diagram", async ({
    page,
  }) => {
    const nodes = page.locator(".react-flow__node")
    expect(await nodes.count()).toBeGreaterThan(0)
    await expect(nodes.first()).toBeVisible()
  })

  test("clicking a node selects it", async ({ page }) => {
    const firstNode = page.locator(".react-flow__node").first()
    await expect(firstNode).toBeVisible()

    // Click the node
    await firstNode.click()

    // React Flow marks selected nodes with the class "selected"
    await expect(firstNode).toHaveClass(/selected/)
  })

  test("at least one edge is visible on the template diagram", async ({
    page,
  }) => {
    const edges = page.locator(".react-flow__edge")
    expect(await edges.count()).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Canvas pan
// ---------------------------------------------------------------------------

test.describe("Canvas panning", () => {
  test("panning the canvas moves the viewport transform", async ({ page }) => {
    await page.goto("/")
    await waitForCanvasReady(page)

    const viewport = page.locator(".react-flow__viewport").first()

    // Read the initial transform
    const getTransform = () =>
      viewport.evaluate((el) => el.getAttribute("style") || el.style.transform)
    const initialTransform = await getTransform()

    // Perform a drag on an empty area of the canvas (centre of the viewport)
    const canvas = page.locator(".react-flow").first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Drag from centre to upper-left to pan the canvas
    const startX = box!.x + box!.width / 2
    const startY = box!.y + box!.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX - 120, startY - 80, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(400)

    // The viewport transform should have changed
    const newTransform = await getTransform()
    expect(newTransform).not.toEqual(initialTransform)
  })
})

// ---------------------------------------------------------------------------
// Playground page
// ---------------------------------------------------------------------------

test.describe("Playground page", () => {
  test("playground loads and shows diagram type selector", async ({ page }) => {
    await page.goto("/playground")
    await waitForCanvasReady(page)

    const selector = page.locator("select").first()
    await expect(selector).toBeVisible()

    // Should list at least the 13 diagram types
    const optionCount = await selector.locator("option").count()
    expect(optionCount).toBeGreaterThanOrEqual(13)
  })

  test("changing diagram type re-renders the sidebar", async ({ page }) => {
    await page.goto("/playground")
    await waitForCanvasReady(page)

    const typeSelector = page.locator("select").first()

    // Switch to ActivityDiagram
    await typeSelector.selectOption("ActivityDiagram")
    await waitForCanvasReady(page)

    // The sidebar content should have changed – just verify the sidebar is
    // still present and has draggable items
    const sidebar = page.locator("aside").first()
    await expect(sidebar).toBeVisible()
    const draggableItems = sidebar.locator(".prevent-select")
    await expect(draggableItems.first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

test.describe("Navbar", () => {
  test("navbar is visible with File button", async ({ page }) => {
    await page.goto("/")
    await waitForCanvasReady(page)

    const fileButton = fileMenuButton(page)
    await expect(fileButton).toBeVisible()
  })

  test("File menu opens and shows expected items", async ({ page }) => {
    await page.goto("/")
    await waitForCanvasReady(page)

    await fileMenuButton(page).click()

    // Verify key menu items are visible
    await expect(page.getByText("New File")).toBeVisible()
    await expect(page.getByText("Start from Template")).toBeVisible()
    await expect(page.getByText("Load Diagram")).toBeVisible()
    await expect(page.getByText("Export")).toBeVisible()
  })
})
