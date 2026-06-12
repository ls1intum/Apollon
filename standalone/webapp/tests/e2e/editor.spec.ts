import { test, expect, type Page } from "@playwright/test"
import { waitForCanvasReady } from "../helpers/canvas"

/**
 * E2E behavioural tests for the Apollon UML diagram editor.
 *
 * These cover the critical user journeys on the local (/) page and verify
 * that the editor loads correctly, the sidebar is usable and basic
 * interactions (select, pan) work.
 */

// Helpers imported from ../helpers/canvas

/**
 * Return the visible "File" menu button.
 * Both desktop and mobile navbars render a button with id="file-menu-button".
 * At the 1280×720 test viewport the desktop variant is visible.
 */
function fileMenuButton(page: Page) {
  return page.locator("#file-menu-button").first()
}

async function openTemporaryLocalDiagram(page: Page) {
  const modelId = "e2e-local-model-id"

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
              title: "E2E Diagram",
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
  }, modelId)

  await page.goto(`/local/${modelId}`)
  const isLegacyRouting =
    (await page.getByText("Something went wrong.").count()) > 0

  if (isLegacyRouting) {
    await page.goto("/")
  } else {
    await expect(page).toHaveURL(new RegExp(`/local/${modelId}$`))
  }
}

// ---------------------------------------------------------------------------
// Basic loading
// ---------------------------------------------------------------------------

test.describe("Editor loading", () => {
  test.beforeEach(async ({ page }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)
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
    // The element palette is the <aside> that holds the draggable items
    // (the playground also wraps the editor in its own control asides).
    const sidebar = page
      .locator("aside")
      .filter({ has: page.locator(".prevent-select") })
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
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    // Load the Adapter template via File → New Diagram → Use template → Create
    await fileMenuButton(page).click()
    await page.getByText("New Diagram").click()
    await page.getByRole("button", { name: "Use template" }).click()
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

  test("creating from a template uses the shared name field as the diagram title", async ({
    page,
  }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    await fileMenuButton(page).click()
    await page.getByText("New Diagram").click()
    await page.getByRole("button", { name: "Use template" }).click()

    const nameInput = page.getByLabel("Name")
    await expect(nameInput).toHaveValue("Adapter")
    await nameInput.fill("Custom Template Diagram")
    await page.getByRole("button", { name: "Create Diagram" }).click()
    await waitForCanvasReady(page)

    const currentTitle = await page.evaluate(() => {
      const raw = localStorage.getItem("persistenceModelStore")

      if (!raw) {
        return null
      }

      const parsed = JSON.parse(raw)
      const currentModelId = parsed.state.currentModelId

      return parsed.state.models[currentModelId]?.model?.title ?? null
    })

    expect(currentTitle).toBe("Custom Template Diagram")
  })

  test("template tab renders real diagram previews", async ({ page }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    await fileMenuButton(page).click()
    await page.getByText("New Diagram").click()
    await page.getByRole("button", { name: "Use template" }).click()

    // Previews render lazily off an idle queue (a hidden editor per template),
    // so allow generous time for the first light-mode thumbnail to appear.
    await expect(page.locator("img.theme-thumbnail-light").first()).toBeVisible(
      {
        timeout: 20_000,
      }
    )
  })

  test("creating the same template twice yields two distinct diagrams", async ({
    page,
  }) => {
    const createFromTemplate = async () => {
      await fileMenuButton(page).click()
      await page.getByText("New Diagram").click()
      await page.getByRole("button", { name: "Use template" }).click()
      await page.getByRole("button", { name: "Create Diagram" }).click()
      await waitForCanvasReady(page)
    }

    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)
    await createFromTemplate()
    await createFromTemplate()

    // Templates ship with fixed (and shared) ids; each creation must get a
    // fresh id, otherwise the second overwrites the first on the same key.
    const modelIds = await page.evaluate(() => {
      const raw = localStorage.getItem("persistenceModelStore")
      return raw ? Object.keys(JSON.parse(raw).state.models) : []
    })
    expect(new Set(modelIds).size).toBe(modelIds.length)
    expect(modelIds.length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// Canvas pan
// ---------------------------------------------------------------------------

test.describe("Canvas panning", () => {
  test("panning the canvas moves the viewport transform", async ({ page }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

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
    await waitForCanvasReady(page, false)

    const selector = page.locator("select").first()
    await expect(selector).toBeVisible()

    // Should list at least the 13 diagram types
    const optionCount = await selector.locator("option").count()
    expect(optionCount).toBeGreaterThanOrEqual(13)
  })

  test("changing diagram type re-renders the sidebar", async ({ page }) => {
    await page.goto("/playground")
    await waitForCanvasReady(page, false)

    const typeSelector = page.locator("select").first()

    // Switch to ActivityDiagram
    await typeSelector.selectOption("ActivityDiagram")
    await waitForCanvasReady(page, false)

    // The element palette should have changed – just verify it is still
    // present with draggable items. Target the palette by its draggable items,
    // not aside order, since the playground adds its own control asides.
    const sidebar = page
      .locator("aside")
      .filter({ has: page.locator(".prevent-select") })
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
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    const fileButton = fileMenuButton(page)
    await expect(fileButton).toBeVisible()
  })

  test("File menu opens and shows expected items", async ({ page }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    await fileMenuButton(page).click()

    // Verify key menu items are visible
    await expect(page.getByText("New Diagram")).toBeVisible()
    await expect(page.getByText("Export")).toBeVisible()
    // "Start from Template" (now a tab in New Diagram) and "Load Diagram" (the
    // dashboard is the loader) were removed.
    await expect(page.getByText("Start from Template")).toHaveCount(0)
    await expect(page.getByText("Load Diagram")).toHaveCount(0)
  })

  test("the All Diagrams link returns to the dashboard", async ({ page }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)
    await page.getByRole("link", { name: "All diagrams" }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Your diagrams" })
    ).toBeVisible()
  })
})
