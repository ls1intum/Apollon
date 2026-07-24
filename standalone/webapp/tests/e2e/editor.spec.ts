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

async function openTemporaryLocalDiagram(
  page: Page,
  diagramType = "ClassDiagram"
) {
  const modelId = "e2e-local-model-id"

  await page.goto("/")
  await page.evaluate(
    ({ id, type }) => {
      const storeValue = JSON.stringify({
        state: {
          models: {
            [id]: {
              id,
              model: {
                id,
                type,
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
    },
    { id: modelId, type: diagramType }
  )

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
// Palette drag alignment — the dragged preview must stay pixel-pinned to the
// cursor (regression guard for the flex-centring "jump on grab" bug).
// ---------------------------------------------------------------------------

test.describe("Palette drag alignment", () => {
  test.beforeEach(async ({ page }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)
  })

  // Read the live on-screen rect of the drag ghost's preview. The ghost is a
  // fixed-position portal appended to <body>, so its preview is the one
  // `[data-draggable-preview]` that is NOT inside the palette <aside>.
  const ghostPreviewRect = (page: Page) =>
    page.evaluate(() => {
      const g = Array.from(
        document.querySelectorAll<HTMLElement>("[data-draggable-preview]")
      ).find((p) => !p.closest('[data-testid="apollon-palette"]'))
      if (!g) return null
      const r = g.getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    })

  test("the grabbed point stays under the cursor — no jump on grab", async ({
    page,
  }) => {
    const palette = page.locator('[data-testid="apollon-palette"]').first()
    const preview = palette.locator("[data-draggable-preview]").first()
    await expect(preview).toBeVisible()
    const box = await preview.boundingBox()
    expect(box).not.toBeNull()

    // Grab at the preview's centre and drag by a known delta.
    const grabX = box!.x + box!.width / 2
    const grabY = box!.y + box!.height / 2
    await page.mouse.move(grabX, grabY)
    await page.mouse.down()
    const DX = 160
    const DY = 120
    await page.mouse.move(grabX + DX, grabY + DY, { steps: 8 })

    const ghost = await ghostPreviewRect(page)
    expect(ghost, "drag ghost should be rendered").not.toBeNull()

    // The grabbed point (the preview's centre) must sit exactly under the cursor.
    // A "jump on grab" would offset the ghost's centre from the cursor; the bug
    // was the palette entry's flex-centring being applied twice.
    const ghostCenterX = ghost!.left + ghost!.width / 2
    const ghostCenterY = ghost!.top + ghost!.height / 2
    expect(Math.abs(ghostCenterX - (grabX + DX))).toBeLessThanOrEqual(1)
    expect(Math.abs(ghostCenterY - (grabY + DY))).toBeLessThanOrEqual(1)

    await page.mouse.up()
  })

  test("the ghost matches the dropped node's on-screen size at the current zoom", async ({
    page,
  }) => {
    const palette = page.locator('[data-testid="apollon-palette"]').first()
    const preview = palette.locator("[data-draggable-preview]").first()
    await expect(preview).toBeVisible()
    const box = await preview.boundingBox()
    expect(box).not.toBeNull()

    // Drag the item onto the canvas centre.
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    const canvas = page.locator(".react-flow").first()
    const cbox = await canvas.boundingBox()
    expect(cbox).not.toBeNull()
    await page.mouse.move(
      cbox!.x + cbox!.width / 2,
      cbox!.y + cbox!.height / 2,
      { steps: 10 }
    )

    // Size of the dragged ghost, captured mid-drag.
    const ghost = await ghostPreviewRect(page)
    expect(ghost, "drag ghost should be rendered").not.toBeNull()

    await page.mouse.up()

    // The node that just landed.
    const node = page.locator(".react-flow__node").first()
    await expect(node).toBeVisible()
    const nodeBox = await node.boundingBox()
    expect(nodeBox).not.toBeNull()

    // WYSIWYG: the dragged ghost is the same on-screen size as the dropped node
    // (both scale with the canvas zoom). Before the fix the ghost was a fixed
    // 0.8x palette preview, so it mismatched the zoom-scaled node by ~20%+.
    // Tolerance covers the node's border/padding vs the bare preview SVG.
    expect(Math.abs(ghost!.width - nodeBox!.width)).toBeLessThanOrEqual(6)
    expect(Math.abs(ghost!.height - nodeBox!.height)).toBeLessThanOrEqual(6)
  })

  // The activity swimlane previews small (160×100) but drops large (400×240),
  // so its ghost must fold the drop/preview ratio (~2.5× wide, ~2.4× tall) into
  // the scale — otherwise it would drag at the tiny preview size and land wrong.
  test("the swimlane ghost reflects its larger drop size, not its small preview", async ({
    page,
  }) => {
    // Re-open as an Activity diagram so the palette exposes the swimlane.
    await openTemporaryLocalDiagram(page, "ActivityDiagram")
    await waitForCanvasReady(page, false)

    const palette = page.locator('[data-testid="apollon-palette"]').first()
    // The swimlane is the one Activity palette entry whose SVG renders the
    // 160×100 preview viewBox (see dropElementConfigs in
    // library/lib/constants.ts) — a stable id that survives palette re-ordering.
    const preview = palette.locator(
      '[data-draggable-preview]:has(svg[viewBox="0 0 160 100"])'
    )
    await expect(preview).toBeVisible()
    const box = await preview.boundingBox()
    expect(box).not.toBeNull()

    // Drag the swimlane onto the canvas centre.
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    const canvas = page.locator(".react-flow").first()
    const cbox = await canvas.boundingBox()
    expect(cbox).not.toBeNull()
    await page.mouse.move(
      cbox!.x + cbox!.width / 2,
      cbox!.y + cbox!.height / 2,
      { steps: 10 }
    )

    // Size of the dragged ghost, captured mid-drag.
    const ghost = await ghostPreviewRect(page)
    expect(ghost, "drag ghost should be rendered").not.toBeNull()

    // Read the live canvas zoom from the React Flow viewport transform
    // (matrix(scaleX, …)). The palette preview is NOT zoom-scaled but everything
    // on the canvas is, so the ghost's true on-screen drop size is dropW/H × zoom.
    const zoom = await page.evaluate(() => {
      const vp = document.querySelector<HTMLElement>(".react-flow__viewport")
      if (!vp) return null
      const m = new DOMMatrixReadOnly(getComputedStyle(vp).transform)
      return m.a
    })
    expect(zoom, "canvas zoom should be readable").not.toBeNull()

    // The ghost reflects the 400×240 DROP size (× zoom), not the 160×100 preview
    // size. Before the fix the ghost scaled only by zoom/previewScale, so it
    // rendered ~2.5× too narrow and ~2.4× too short. Tolerance covers sub-pixel
    // rounding in the transform.
    expect(Math.abs(ghost!.width - 400 * zoom!)).toBeLessThanOrEqual(4)
    expect(Math.abs(ghost!.height - 240 * zoom!)).toBeLessThanOrEqual(4)

    // And it is materially bigger than its own (non-zoom-scaled) palette preview:
    // at zoom 1 the width ratio is dropWidth/width × 1/previewScale ≈ 2.5/0.8.
    expect(ghost!.width).toBeGreaterThan(box!.width * 2)
    expect(ghost!.height).toBeGreaterThan(box!.height * 2)

    await page.mouse.up()

    // WYSIWYG end-to-end: the ghost matches the swimlane node that just landed
    // at its true 400×240 drop size. Without the ratio fix the ghost would be
    // ~2.5× too small versus this node.
    const node = page.locator(".react-flow__node").first()
    await expect(node).toBeVisible()
    const nodeBox = await node.boundingBox()
    expect(nodeBox).not.toBeNull()
    expect(Math.abs(ghost!.width - nodeBox!.width)).toBeLessThanOrEqual(8)
    expect(Math.abs(ghost!.height - nodeBox!.height)).toBeLessThanOrEqual(8)
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
    await page.getByRole("tab", { name: "Use template" }).click()
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
    await page.getByRole("tab", { name: "Use template" }).click()

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
    await page.getByRole("tab", { name: "Use template" }).click()

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
      await page.getByRole("tab", { name: "Use template" }).click()
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

    // The diagram-type control is a shadcn Select (Base UI): a button trigger
    // that opens a listbox of options in a portal.
    const trigger = page.getByTestId("playground-diagram-type")
    await expect(trigger).toBeVisible()
    await trigger.click()

    // Should list at least the 13 diagram types
    const options = page.getByRole("option")
    await expect(options.first()).toBeVisible()
    expect(await options.count()).toBeGreaterThanOrEqual(13)
    await page.keyboard.press("Escape")
  })

  test("changing diagram type re-renders the sidebar", async ({ page }) => {
    await page.goto("/playground")
    await waitForCanvasReady(page, false)

    // Switch to ActivityDiagram via the shadcn Select.
    await page.getByTestId("playground-diagram-type").click()
    await page
      .getByRole("option", { name: "ActivityDiagram", exact: true })
      .click()
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

    // Hop across legal pages via the sub-page Help menu (the footer is retired);
    // the origin must be forwarded, not replaced with the current
    // /imprint|/privacy path.
    await page.getByRole("button", { name: "Help" }).click()
    await page.getByRole("menuitem", { name: "Imprint" }).click()
    await expect(page).toHaveURL(/\/imprint$/)
    await page.getByRole("button", { name: "Help" }).click()
    await page.getByRole("menuitem", { name: "Privacy" }).click()
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

    // The editor mobile pill carries File as its OWN dropdown (no "…" overflow).
    await page.getByRole("button", { name: "File" }).click()

    // Export is a flat labelled group inside the File menu, not a nested submenu.
    const fileMenu = page.getByRole("menu", { name: "File" })
    await expect(fileMenu).toBeVisible()
    await expect(
      fileMenu.getByRole("menuitem", { name: "As SVG" })
    ).toBeVisible()
    await expect(
      fileMenu.getByRole("menuitem", { name: "As PDF" })
    ).toBeVisible()

    const fileMenuBox = await fileMenu.boundingBox()
    expect(fileMenuBox).not.toBeNull()
    expect(fileMenuBox!.x).toBeGreaterThanOrEqual(0)
    expect(fileMenuBox!.x + fileMenuBox!.width).toBeLessThanOrEqual(
      PHONE_PORTRAIT.width
    )
  })

  test("opens a responsive New Diagram modal from the editor", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE_PORTRAIT)
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)

    await page.getByRole("button", { name: "File" }).click()

    await page
      .getByRole("menu", { name: "File" })
      .getByRole("menuitem", { name: "New Diagram" })
      .click()

    const dialog = page.getByRole("dialog", { name: "New Diagram" })
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole("tab", { name: "Blank diagram" })
    ).toBeVisible()
    await expect(
      dialog.getByRole("tab", { name: "Use template" })
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

    await expect(page.getByRole("button", { name: "File" })).toBeVisible()

    const palette = page.getByTestId("apollon-palette")
    await expect(palette).toBeVisible()

    const paletteBox = await palette.boundingBox()
    expect(paletteBox).not.toBeNull()
    // Six class-diagram entries stay in a dense single column instead of
    // stretching their rows to consume the full portrait height.
    expect(paletteBox!.width).toBeLessThanOrEqual(112)
    expect(paletteBox!.height).toBeLessThanOrEqual(396)

    // Portrait uses the unified app-header height (NAVBAR_MIN_HEIGHT = 52).
    const navbar = page.locator("header")
    const navbarBox = await navbar.boundingBox()
    expect(navbarBox?.height).toBeLessThanOrEqual(52)

    // The floating palette lays every element out in view — no scrolling.
    const overflow = await palette.evaluate(
      (el) => el.scrollHeight - el.clientHeight
    )
    expect(overflow).toBeLessThanOrEqual(1)

    // The File dropdown uses the shared mobile-menu width contract (≤ 240px).
    await page.getByRole("button", { name: "File" }).click()
    const fileMenu = page.getByRole("menu", { name: "File" })
    await expect(fileMenu).toBeVisible()
    const menuBox = await fileMenu.boundingBox()
    expect(menuBox?.width).toBeLessThanOrEqual(240)
    await page.keyboard.press("Escape")

    // Theme is a direct icon toggle on the pill, not tucked behind an overflow.
    await expect(
      page.getByRole("button", { name: /Switch to (light|dark) mode/ })
    ).toBeVisible()

    // Share is a primary icon on the pill too.
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

  test("keeps the full action set in landscape and clears the side safe-area insets", async ({
    page,
  }) => {
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

    // A landscape phone is wide enough (844px > NARROW_VIEW_QUERY's 767.95px) to
    // keep the full desktop action set rather than the portrait compact pill —
    // a deliberate choice (see constants/responsive.ts).
    const actions = page.locator('[aria-label="Editor actions"]')
    await expect(actions).toBeVisible()

    const palette = page.getByTestId("apollon-palette")
    await expect(palette).toBeVisible()
    const paletteBox = await palette.boundingBox()
    expect(paletteBox).not.toBeNull()
    // Landscape uses two compact columns, leaving substantially more canvas
    // visible than the old height-filling grid.
    expect(paletteBox!.width).toBeLessThanOrEqual(210)
    expect(paletteBox!.height).toBeLessThanOrEqual(210)
    // The floating palette fits every element without meaningful scroll in the
    // short (390px) viewport too; tolerance covers sub-pixel rounding.
    const overflow = await palette.evaluate(
      (el) => el.scrollHeight - el.clientHeight
    )
    expect(overflow).toBeLessThanOrEqual(4)

    // Same unified app-header height as portrait (≤ NAVBAR_MIN_HEIGHT = 52) — the
    // full desktop chrome, not the shorter compact pill.
    const navbarBox = await page.locator("header").boundingBox()
    expect(navbarBox?.height).toBeLessThanOrEqual(52)

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

    // The zoom cluster / minimap stay inside the left/right insets.
    const controlsBox = await page
      .getByRole("toolbar", { name: "Zoom, history and selection controls" })
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

    // The palette height is ResizeObserver-driven, so poll the relation rather
    // than asserting on a single possibly-pre-reflow frame: the palette bottom
    // edge stays above the zoom cluster's top edge.
    const palette = page.getByTestId("apollon-palette")
    const controls = page.getByRole("toolbar", {
      name: "Zoom, history and selection controls",
    })
    await expect
      .poll(async () => {
        const p = await palette.boundingBox()
        const c = await controls.boundingBox()
        return p && c ? p.y + p.height - c.y : Number.NaN
      })
      .toBeLessThanOrEqual(0)
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
      const entries = palette.locator(".apollon-palette__entry")
      await expect(entries).toHaveCount(14)
      // The cell sizing is ResizeObserver-driven, so poll the overflow rather
      // than reading a single possibly-pre-reflow frame.
      await expect
        .poll(() => palette.evaluate((el) => el.scrollHeight - el.clientHeight))
        .toBeLessThanOrEqual(1)
    })
  }
})
