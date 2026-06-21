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
    // so allow generous time for the first light-mode thumbnail to appear. Assert
    // the src is the rendered SVG data URL — not a placeholder/fallback icon — so
    // this can only pass when the render pipeline actually produced a diagram.
    const preview = page.locator("img.theme-thumbnail-light").first()
    await expect(preview).toBeVisible({ timeout: 20_000 })
    await expect(preview).toHaveAttribute("src", /^data:image\/svg\+xml/)
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

    // The pan changes the viewport transform.
    await expect.poll(getTransform).not.toEqual(initialTransform)
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

  test("opening a legal page from the editor offers a way back to the diagram", async ({
    page,
  }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    await page.getByRole("button", { name: "Help" }).click()
    await page.getByRole("menuitem", { name: "Privacy" }).click()
    await expect(page).toHaveURL(/\/privacy$/)

    // Provenance turns the chrome back link into a return to the exact diagram,
    // not the generic dashboard — the editor->Help->legal dead end is gone.
    const backToDiagram = page.getByRole("link", { name: "Back to diagram" })
    await expect(backToDiagram).toBeVisible()
    await backToDiagram.click()
    await expect(page).toHaveURL(/\/local\/e2e-local-model-id$/)
    await waitForCanvasReady(page, false)
  })

  test("provenance survives a legal cross-link hop back to the diagram", async ({
    page,
  }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    await page.getByRole("button", { name: "Help" }).click()
    await page.getByRole("menuitem", { name: "Privacy" }).click()
    await expect(page).toHaveURL(/\/privacy$/)

    // Hop across legal pages via the footer; the origin must be forwarded, not
    // replaced with the current /imprint|/privacy path.
    const footer = page.getByRole("contentinfo")
    await footer.getByRole("link", { name: "Imprint" }).click()
    await expect(page).toHaveURL(/\/imprint$/)
    await footer.getByRole("link", { name: "Privacy" }).click()
    await expect(page).toHaveURL(/\/privacy$/)

    await page.getByRole("link", { name: "Back to diagram" }).click()
    await expect(page).toHaveURL(/\/local\/e2e-local-model-id$/)
    await waitForCanvasReady(page, false)
  })
})

// iPhone-class viewports. Headless Chromium reports 0 for env(safe-area-inset-*),
// so the landscape test injects insets to simulate a notched device; in
// production the same custom properties are derived from env() (webapp.css
// :root), so this exercises the real layout math, not a test-only variable.
const PHONE_PORTRAIT = { width: 390, height: 844 }
const PHONE_LANDSCAPE = { width: 844, height: 390 }
const SAFE_INSET = 47 // simulated side notch inset (iPhone landscape)
// Chrome hugs the safe-area boundary in landscape (max(edge, safe-area)) — the
// side inset itself is the clearance, with no extra constant nudge on top.

test.describe("Mobile responsive layout", () => {
  test("opens export actions with a tap", async ({ page }) => {
    await page.setViewportSize(PHONE_PORTRAIT)
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    await page.getByRole("button", { name: "open options" }).click()

    const optionsMenu = page.getByRole("menu", { name: "open options" })
    await optionsMenu.getByRole("button", { name: "File" }).click()
    await page.getByRole("menuitem", { name: "Export" }).click()

    const exportMenu = page.getByRole("menu", { name: "Export" })
    await expect(exportMenu).toBeVisible()
    await expect(
      exportMenu.getByRole("menuitem", { name: "As SVG" })
    ).toBeVisible()
    await expect(
      exportMenu.getByRole("menuitem", { name: "As PDF" })
    ).toBeVisible()

    const exportMenuBox = await exportMenu.boundingBox()
    expect(exportMenuBox).not.toBeNull()
    expect(exportMenuBox!.x).toBeGreaterThanOrEqual(0)
    expect(exportMenuBox!.x + exportMenuBox!.width).toBeLessThanOrEqual(
      PHONE_PORTRAIT.width
    )
  })

  test("opens a responsive New Diagram modal from the editor", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE_PORTRAIT)
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    await page.getByRole("button", { name: "open options" }).click()

    const optionsMenu = page.getByRole("menu", { name: "open options" })
    await optionsMenu.getByRole("button", { name: "File" }).click()
    await page.getByRole("menuitem", { name: "New Diagram" }).click()

    const dialog = page.getByRole("dialog", { name: "New Diagram" })
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: "Blank diagram" })
    ).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: "Use template" })
    ).toBeVisible()

    const dialogBox = await dialog.boundingBox()
    expect(dialogBox).not.toBeNull()
    expect(dialogBox!.x).toBeGreaterThanOrEqual(12)
    expect(dialogBox!.width).toBeLessThanOrEqual(PHONE_PORTRAIT.width - 24)
    expect(dialogBox!.height).toBeLessThanOrEqual(PHONE_PORTRAIT.height - 24)

    const hasHorizontalOverflow = await dialog.evaluate(
      (element) => element.scrollWidth > element.clientWidth
    )
    expect(hasHorizontalOverflow).toBe(false)
  })

  test("uses the compact navbar and floating palette in portrait", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE_PORTRAIT)
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    await expect(
      page.getByRole("button", { name: "open options" })
    ).toBeVisible()

    const palette = page.getByTestId("apollon-palette")
    await expect(palette).toBeVisible()

    // Portrait uses the unified app-header height (NAVBAR_MIN_HEIGHT = 52).
    const navbar = page.locator("header")
    const navbarBox = await navbar.boundingBox()
    expect(navbarBox?.height).toBeLessThanOrEqual(52)

    // The floating palette lays every element out in view — no scrolling.
    const overflow = await palette.evaluate(
      (el) => el.scrollHeight - el.clientHeight
    )
    expect(overflow).toBeLessThanOrEqual(1)

    await page.getByRole("button", { name: "open options" }).click()

    const menu = page.getByRole("menu", { name: "open options" })
    await expect(menu).toBeVisible()
    await expect(menu.getByText("Theme", { exact: true })).toBeVisible()

    const menuBox = await menu.boundingBox()
    expect(menuBox?.width).toBeLessThanOrEqual(240)

    // Share is a primary icon on the pill, not in the overflow menu.
    await page.keyboard.press("Escape")
    await page.getByRole("button", { name: "Share" }).click()

    const shareDialog = page.getByRole("dialog", { name: "Share" })
    await expect(shareDialog).toBeVisible()
    const shareDialogBox = await shareDialog.boundingBox()
    expect(shareDialogBox?.x).toBeGreaterThanOrEqual(12)
    expect(shareDialogBox?.width).toBeLessThanOrEqual(PHONE_PORTRAIT.width - 24)

    const shareContent = page.getByTestId("share-modal-content")
    const hasHorizontalOverflow = await shareContent.evaluate(
      (element) => element.scrollWidth > element.clientWidth
    )
    expect(hasHorizontalOverflow).toBe(false)
  })

  test("keeps the phone layout in landscape", async ({ page }) => {
    await page.setViewportSize(PHONE_LANDSCAPE)
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    // Guard the env() floor itself: the custom property must be defined on
    // :root (from env()) before we simulate insets — otherwise the consumers
    // below would silently fall back to the literal 0px and still pass.
    const floorDefined = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--safe-area-inset-left")
        .trim()
    )
    expect(floorDefined).not.toBe("")

    // Simulate a side notch so the safe-area offsets are exercised.
    await page.evaluate((inset) => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-left",
        `${inset}px`
      )
      document.documentElement.style.setProperty(
        "--safe-area-inset-right",
        `${inset}px`
      )
    }, SAFE_INSET)

    // Landscape is wide enough for the full action bar — it keeps every control
    // (the overflow "open options" pill is for narrow portrait only).
    const actions = page.locator('[aria-label="Editor actions"]')
    await expect(actions).toBeVisible()

    const palette = page.getByTestId("apollon-palette")
    await expect(palette).toBeVisible()
    // The floating palette fits every element without scrolling here too.
    const overflow = await palette.evaluate(
      (el) => el.scrollHeight - el.clientHeight
    )
    expect(overflow).toBeLessThanOrEqual(1)

    const navbarBox = await page.locator("header").boundingBox()
    expect(navbarBox?.height).toBeLessThanOrEqual(36)

    // Logo and actions clear the dynamic island by hugging the side safe area.
    const homeLinkBox = await page
      .getByRole("link", { name: "Apollon home" })
      .boundingBox()
    expect(homeLinkBox?.x).toBeGreaterThanOrEqual(SAFE_INSET)

    const actionsBox = await actions.boundingBox()
    expect(actionsBox).not.toBeNull()
    expect(actionsBox!.x + actionsBox!.width).toBeLessThanOrEqual(
      PHONE_LANDSCAPE.width - SAFE_INSET
    )

    // React Flow controls/minimap stay inside the left/right insets.
    const controlsBox = await page
      .locator(".react-flow__controls")
      .boundingBox()
    expect(controlsBox?.x).toBeGreaterThanOrEqual(SAFE_INSET)

    const minimapBox = await page
      .locator(".react-flow__panel.bottom.right")
      .boundingBox()
    expect(minimapBox).not.toBeNull()
    expect(minimapBox!.x + minimapBox!.width).toBeLessThanOrEqual(
      PHONE_LANDSCAPE.width - SAFE_INSET
    )
  })

  test("palette never overlaps the canvas controls", async ({ page }) => {
    // BPMN has the most palette items; in a short viewport the palette must
    // stop above the zoom/controls toolbar, not grow into it.
    await page.setViewportSize({ width: 844, height: 390 })
    const modelId = "e2e-bpmn-overlap"
    await page.goto("/")
    await page.evaluate((id) => {
      localStorage.setItem(
        "persistenceModelStore",
        JSON.stringify({
          state: {
            models: {
              [id]: {
                id,
                model: {
                  id,
                  type: "BPMN",
                  assessments: {},
                  edges: [],
                  nodes: [],
                  title: "BPMN",
                  version: "4.0.0",
                },
                lastModifiedAt: new Date().toISOString(),
              },
            },
            currentModelId: id,
          },
          version: 0,
        })
      )
    }, modelId)
    await page.goto(`/local/${modelId}`)
    await waitForCanvasReady(page, false)

    const paletteBox = await page.getByTestId("apollon-palette").boundingBox()
    const controlsBox = await page
      .locator(".react-flow__controls")
      .boundingBox()
    expect(paletteBox).not.toBeNull()
    expect(controlsBox).not.toBeNull()
    // Palette bottom edge stays above the controls' top edge.
    expect(paletteBox!.y + paletteBox!.height).toBeLessThanOrEqual(
      controlsBox!.y
    )
  })
})

test.describe("Element palette", () => {
  // The floating palette grid must show every element without scrolling across
  // viewports — verified here with BPMN (the most element-rich diagram).
  for (const [w, h, label] of [
    [375, 667, "phone portrait"],
    [844, 390, "phone landscape"],
    [1280, 600, "short laptop"],
    [1920, 1080, "desktop"],
  ] as const) {
    test(`fits every element in view without scrolling (${label})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h })
      const modelId = `e2e-bpmn-palette-${w}x${h}`
      await page.goto("/")
      await page.evaluate((id) => {
        localStorage.setItem(
          "persistenceModelStore",
          JSON.stringify({
            state: {
              models: {
                [id]: {
                  id,
                  model: {
                    id,
                    type: "BPMN",
                    assessments: {},
                    edges: [],
                    nodes: [],
                    title: "BPMN",
                    version: "4.0.0",
                  },
                  lastModifiedAt: new Date().toISOString(),
                },
              },
              currentModelId: id,
            },
            version: 0,
          })
        )
      }, modelId)
      await page.goto(`/local/${modelId}`)
      await waitForCanvasReady(page, false)

      const palette = page.getByTestId("apollon-palette")
      await expect(palette).toBeVisible()

      // All 14 BPMN cells (13 elements + color) are present and none scroll.
      // toHaveCount auto-retries, so it also settles the measured-layout effect.
      const entries = palette.locator(".apollon-palette__entry")
      await expect(entries).toHaveCount(14)
      const overflow = await palette.evaluate(
        (el) => el.scrollHeight - el.clientHeight
      )
      expect(overflow).toBeLessThanOrEqual(1)
    })
  }
})
