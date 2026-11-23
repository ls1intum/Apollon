import { expect, test, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"
import { expectPaintedOnTop, isInEditorPortalRoot } from "../helpers/floating"

/**
 * The editor embedded inside the layers host apps put it in. Its popovers,
 * selects, color picker, tooltips and palette drag ghost all float over the
 * canvas, and each one has to stay visible, clickable and focusable whatever the
 * host wraps around the editor:
 *
 * - `z-index layer`: a fixed, z-indexed overlay without modal semantics (a
 *   legacy modal, a drawer). Surfaces portal to the body and must out-stack it.
 * - `aria-modal dialog`: built like PrimeNG's dialog (the quiz editor in
 *   Artemis): a z-indexed mask, a dialog kept on `transform: scale(1)`, and a
 *   focus trap that pulls focus back into the dialog, as Bootstrap, MUI, Radix
 *   and focus-trap do. Surfaces must stay inside the dialog, and the drag ghost
 *   must follow the cursor although the transform moves its containing block.
 * - `modal <dialog>` and `open popover`: the browser's top layer, which paints
 *   above every z-index on the page and, for a modal dialog, makes the rest of
 *   the page inert.
 */

const CLASS_NAME = "LayeredClass"

const MODEL = {
  id: "e2e-host-layers",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "Host layers",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: "host-layers-class-0000-000000000001",
      type: "class",
      width: 200,
      height: 100,
      position: { x: 320, y: 160 },
      measured: { width: 200, height: 100 },
      data: { name: CLASS_NAME, attributes: [], methods: [] },
    },
  ],
}

type HostKind =
  | "z-index layer"
  | "aria-modal dialog"
  | "modal <dialog>"
  | "open popover"

const HOSTS: ReadonlyArray<{ kind: HostKind; portalsLocally: boolean }> = [
  { kind: "z-index layer", portalsLocally: false },
  { kind: "aria-modal dialog", portalsLocally: true },
  { kind: "modal <dialog>", portalsLocally: true },
  { kind: "open popover", portalsLocally: true },
]

/** Moves the live editor into a host shell of the given kind. */
async function mountInHost(page: Page, kind: HostKind) {
  await page.evaluate((kind) => {
    const editorHost = document.querySelector(".apollon-editor")?.parentElement
    if (!editorHost) throw new Error("editor not mounted")
    editorHost.style.width = "100%"
    editorHost.style.height = "100%"

    const frame = (element: HTMLElement) => {
      element.dataset.testid = "host-frame"
      element.style.width = "960px"
      element.style.height = "560px"
      element.style.padding = "0"
      element.style.border = "0"
      element.style.background = "white"
      element.style.overflow = "hidden"
    }

    // A body-level mask above the app, as PrimeNG/Bootstrap/MUI append one.
    const mask = () => {
      const element = document.createElement("div")
      element.style.cssText =
        "position:fixed;inset:0;z-index:1101;display:flex;align-items:center;justify-content:center;background:rgb(0 0 0 / 0.4)"
      document.body.append(element)
      return element
    }

    switch (kind) {
      case "z-index layer": {
        const panel = document.createElement("div")
        frame(panel)
        panel.append(editorHost)
        mask().append(panel)
        break
      }
      case "aria-modal dialog": {
        const dialog = document.createElement("div")
        dialog.setAttribute("role", "dialog")
        dialog.setAttribute("aria-modal", "true")
        dialog.setAttribute("aria-label", "Host dialog")
        dialog.tabIndex = -1
        // PrimeNG keeps its open dialog on `transform: scale(1)` with
        // `will-change: transform`, so the dialog is the containing block of
        // every `position: fixed` descendant.
        dialog.style.transform = "scale(1)"
        dialog.style.willChange = "transform"
        dialog.style.overflow = "visible"
        const content = document.createElement("div")
        frame(content)
        content.append(editorHost)
        dialog.append(content)
        mask().append(dialog)
        // A focus trap that takes focus back the moment it leaves the dialog.
        document.addEventListener("focusin", (event) => {
          if (!dialog.contains(event.target as Node)) dialog.focus()
        })
        break
      }
      case "modal <dialog>": {
        const dialog = document.createElement("dialog")
        frame(dialog)
        dialog.append(editorHost)
        document.body.append(dialog)
        dialog.showModal()
        break
      }
      case "open popover": {
        const layer = document.createElement("div")
        layer.setAttribute("popover", "manual")
        frame(layer)
        layer.style.margin = "auto"
        layer.append(editorHost)
        document.body.append(layer)
        layer.showPopover()
        break
      }
    }
  }, kind)
  await expect(
    page.getByTestId("host-frame").locator(".apollon-editor")
  ).toBeVisible()
}

async function openEditPopover(page: Page) {
  const node = page.locator(".react-flow__node").filter({ hasText: CLASS_NAME })
  await node.click()
  await page.getByRole("button", { name: "Edit element" }).click()
  const popover = page.locator(".apollon-popover")
  await expect(popover).toBeVisible()
  return popover
}

for (const { kind, portalsLocally } of HOSTS) {
  test.describe(`editor inside a ${kind}`, () => {
    test.beforeEach(async ({ page }) => {
      await openFixtureInLocalEditor(page, MODEL)
      await waitForCanvasReady(page)
      await mountInHost(page, kind)
    })

    test("the edit popover is on top, and typing in it edits the element", async ({
      page,
    }) => {
      const popover = await openEditPopover(page)
      await expectPaintedOnTop(popover)
      expect(await isInEditorPortalRoot(popover)).toBe(portalsLocally)

      // `click()` fails on a covered field, and the typed text only lands if
      // no focus trap took the field's focus away.
      const name = popover.getByRole("textbox").first()
      await name.click()
      await expect(name).toBeFocused()
      await page.keyboard.press("ControlOrMeta+A")
      await page.keyboard.type("RenamedClass")
      await expect(name).toBeFocused()
      await expect(
        page.locator(".react-flow__node").filter({ hasText: "RenamedClass" })
      ).toHaveCount(1)
    })

    test("a select inside the popover opens on top of it", async ({ page }) => {
      const popover = await openEditPopover(page)
      await popover.getByRole("combobox").first().click()

      const listbox = page.getByRole("listbox")
      await expectPaintedOnTop(listbox)
      await listbox.getByRole("option", { name: "Interface" }).click()
      await expect(
        page.locator(".react-flow__node").filter({ hasText: "«interface»" })
      ).toHaveCount(1)
    })

    test("the color editor opens on top of the popover", async ({ page }) => {
      const popover = await openEditPopover(page)
      await popover
        .getByRole("button", { name: "Edit class colors" })
        .first()
        .click()

      await expectPaintedOnTop(
        page.locator('[data-slot="style-editor-content"]')
      )
    })

    test("tooltips are on top", async ({ page }) => {
      await page
        .getByTestId("host-frame")
        .getByRole("button", { name: "Fit view" })
        .hover()

      await expectPaintedOnTop(page.locator('[data-slot="tooltip-content"]'))
    })

    test("the palette drag ghost stays under the cursor and on top", async ({
      page,
    }) => {
      const frame = page.getByTestId("host-frame")
      const nodes = frame.locator(".react-flow__node")
      const before = await nodes.count()

      const paletteBox = await frame
        .getByRole("button", { name: "Add element: Class" })
        .boundingBox()
      const canvasBox = await frame.locator(".react-flow").boundingBox()
      expect(paletteBox).not.toBeNull()
      expect(canvasBox).not.toBeNull()

      const target = {
        x: canvasBox!.x + canvasBox!.width * 0.6,
        y: canvasBox!.y + canvasBox!.height * 0.7,
      }
      await page.mouse.move(
        paletteBox!.x + paletteBox!.width / 2,
        paletteBox!.y + paletteBox!.height / 2
      )
      await page.mouse.down()
      try {
        await page.mouse.move(target.x, target.y, { steps: 10 })
        // The palette entries carry the same attribute; the ghost is the copy
        // portaled out to the body or to the editor's portal root.
        const ghost = page.locator(
          ":is(body, [data-apollon-portal-root]) > [data-draggable-preview]"
        )
        await expectPaintedOnTop(ghost)
        const ghostBox = await ghost.boundingBox()
        expect(ghostBox).not.toBeNull()
        // The ghost is grabbed where the palette entry was pressed, so the
        // cursor sits inside it — unless a transformed host shifted the ghost.
        expect(target.x).toBeGreaterThanOrEqual(ghostBox!.x)
        expect(target.x).toBeLessThanOrEqual(ghostBox!.x + ghostBox!.width)
        expect(target.y).toBeGreaterThanOrEqual(ghostBox!.y)
        expect(target.y).toBeLessThanOrEqual(ghostBox!.y + ghostBox!.height)
      } finally {
        await page.mouse.up()
      }
      await expect(nodes).toHaveCount(before + 1)
    })
  })
}

test("surfaces move into the editor when its host turns modal, and back out", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, MODEL)
  await waitForCanvasReady(page)
  await page.evaluate(() => {
    const host = document.querySelector(".apollon-editor")?.parentElement
    host?.setAttribute("data-testid", "editor-host")
  })

  const popover = await openEditPopover(page)
  expect(await isInEditorPortalRoot(popover)).toBe(false)
  await page.keyboard.press("Escape")
  await expect(popover).toBeHidden()

  await page.getByTestId("editor-host").evaluate((host) => {
    host.setAttribute("aria-modal", "true")
  })
  const reopened = await openEditPopover(page)
  expect(await isInEditorPortalRoot(reopened)).toBe(true)
  await expectPaintedOnTop(reopened)
})
