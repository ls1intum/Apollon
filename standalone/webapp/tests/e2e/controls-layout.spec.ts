import { test, expect, type Page, type Locator } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * The adaptive layout engine behind the controls API, driven through the primary
 * (imperative) consumer: `window.apollonEditor.updateControl / removeControl`.
 * These are the two symptoms the redesign targeted — the palette shrinking when
 * unrelated chrome moved, and controls overlapping — asserted as real on-screen
 * geometry across many placements, plus the hide / move / re-show scenarios.
 *
 * Reserved built-in ids (stable public surface): the palette and zoom cluster
 * are slotted controls (`[data-apollon-control]`); the minimap self-positions as
 * a React-Flow-native widget (collapsed by default to a "Show minimap" toggle).
 */
const PALETTE_ID = "apollon:palette"
const ZOOM_ID = "apollon:zoom"
const MINIMAP_ID = "apollon:minimap"

const MODEL = {
  id: "controls-layout-00",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "controls layout",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: "n1-0000-0000-0000-000000000001",
      type: "class",
      width: 200,
      height: 110,
      position: { x: 300, y: 240 },
      measured: { width: 200, height: 110 },
      data: { name: "Alpha", attributes: [], methods: [] },
    },
  ],
}

type Box = { x: number; y: number; width: number; height: number }

const paletteEl = (page: Page): Locator =>
  page.locator(`[data-apollon-control="${PALETTE_ID}"]`)
const zoomEl = (page: Page): Locator =>
  page.locator(`[data-apollon-control="${ZOOM_ID}"]`)
// The minimap ships collapsed to a single "Show minimap" toggle (its own
// self-positioned React-Flow Panel); expanding it is a separate concern.
const minimapEl = (page: Page): Locator =>
  page.getByRole("button", { name: "Show minimap" })

async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox()
  if (!b) throw new Error("expected the element to have a bounding box")
  return b
}

/** True when two boxes share any area (a strict, gap-of-0 overlap test). */
function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  )
}

async function updateControl(
  page: Page,
  id: string,
  patch: Record<string, unknown>
) {
  await page.evaluate(
    ([id, patch]) => {
      const ed = (window as unknown as { apollonEditor?: any }).apollonEditor
      ed?.updateControl(id, patch)
    },
    [id, patch] as const
  )
  // Let the overlay re-measure + the diagram re-fit against the new insets.
  await page.waitForTimeout(250)
}

async function removeControl(page: Page, id: string) {
  await page.evaluate((id) => {
    const ed = (window as unknown as { apollonEditor?: any }).apollonEditor
    ed?.removeControl(id)
  }, id)
  await page.waitForTimeout(250)
}

const CORNERS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const

test.describe("controls layout engine", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, MODEL)
    await waitForCanvasReady(page)
    await expect(paletteEl(page)).toBeVisible()
    await expect(zoomEl(page)).toBeVisible()
  })

  test("default chrome: palette, zoom, and minimap are all present and mutually non-overlapping", async ({
    page,
  }) => {
    await expect(paletteEl(page)).toBeVisible()
    await expect(zoomEl(page)).toBeVisible()
    await expect(minimapEl(page)).toBeVisible()

    const palette = await box(paletteEl(page))
    const zoom = await box(zoomEl(page))
    const minimap = await box(minimapEl(page))

    expect(overlaps(palette, zoom)).toBe(false)
    expect(overlaps(palette, minimap)).toBe(false)
    expect(overlaps(zoom, minimap)).toBe(false)
  })

  test("the palette size is invariant to where the zoom cluster sits (the adaptation bug)", async ({
    page,
  }) => {
    // Baseline: zoom at its default bottom-left home.
    const baseline = await box(paletteEl(page))

    // The palette must not grow/shrink as UNRELATED chrome moves around it — the
    // exact regression that motivated the two-tier band/slot engine.
    for (const region of [
      "bottom-center",
      "bottom-right",
      "top-right",
    ] as const) {
      await updateControl(page, ZOOM_ID, { region })
      const moved = await box(paletteEl(page))
      expect(Math.abs(moved.width - baseline.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(moved.height - baseline.height)).toBeLessThanOrEqual(1)
    }

    // Removing the zoom cluster entirely also leaves the palette untouched.
    await removeControl(page, ZOOM_ID)
    const withoutZoom = await box(paletteEl(page))
    expect(Math.abs(withoutZoom.width - baseline.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(withoutZoom.height - baseline.height)).toBeLessThanOrEqual(
      1
    )
  })

  test("the zoom cluster never overlaps the palette at any bottom corner", async ({
    page,
  }) => {
    for (const region of ["bottom-left", "bottom-center"] as const) {
      await updateControl(page, ZOOM_ID, { region })
      const palette = await box(paletteEl(page))
      const zoom = await box(zoomEl(page))
      expect(overlaps(palette, zoom)).toBe(false)
      // A bottom-left cluster is offset past the left-rail band, so it sits to
      // the RIGHT of the palette rather than under it.
      if (region === "bottom-left") {
        expect(zoom.x).toBeGreaterThanOrEqual(palette.x + palette.width - 1)
      }
    }
  })

  test("moving the zoom cluster lands it in the target corner's quadrant", async ({
    page,
  }) => {
    const viewport = page.viewportSize()!
    const midX = viewport.width / 2
    const midY = viewport.height / 2

    await updateControl(page, ZOOM_ID, { region: "top-right" })
    let zoom = await box(zoomEl(page))
    expect(zoom.x).toBeGreaterThan(midX)
    expect(zoom.y).toBeLessThan(midY)

    await updateControl(page, ZOOM_ID, { region: "bottom-right" })
    zoom = await box(zoomEl(page))
    expect(zoom.x).toBeGreaterThan(midX)
    expect(zoom.y + zoom.height).toBeGreaterThan(midY)
  })

  test("hiding the palette removes it from the DOM; the other chrome stays", async ({
    page,
  }) => {
    await removeControl(page, PALETTE_ID)
    await expect(paletteEl(page)).toHaveCount(0)
    await expect(zoomEl(page)).toBeVisible()
    await expect(minimapEl(page)).toBeVisible()
  })

  test("hiding the zoom cluster removes it; palette and minimap remain", async ({
    page,
  }) => {
    await removeControl(page, ZOOM_ID)
    await expect(zoomEl(page)).toHaveCount(0)
    await expect(paletteEl(page)).toBeVisible()
    await expect(minimapEl(page)).toBeVisible()
  })

  test("hiding the minimap removes the self-positioned widget", async ({
    page,
  }) => {
    await expect(minimapEl(page)).toBeVisible()
    await removeControl(page, MINIMAP_ID)
    await expect(minimapEl(page)).toHaveCount(0)
  })

  test("visible:false hides a built-in and visible:true brings it back unchanged", async ({
    page,
  }) => {
    const before = await box(zoomEl(page))

    await updateControl(page, ZOOM_ID, { visible: false })
    await expect(zoomEl(page)).toHaveCount(0)

    await updateControl(page, ZOOM_ID, { visible: true })
    await expect(zoomEl(page)).toBeVisible()
    const after = await box(zoomEl(page))
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2)
  })

  test("the zoom cluster stays a labelled single-tab-stop toolbar after relocation", async ({
    page,
  }) => {
    await updateControl(page, ZOOM_ID, { region: "top-center" })
    const toolbar = page.getByRole("toolbar", {
      name: "Zoom and history controls",
    })
    await expect(toolbar).toBeVisible()
    await expect(toolbar.locator("button[tabindex='0']")).toHaveCount(1)
  })

  test("the footer band pins a control to the bottom edge and reserves bottom room", async ({
    page,
  }) => {
    const viewport = page.viewportSize()!
    const insetBottom = () =>
      page.evaluate(() => {
        const el = document.querySelector(".apollon-editor") as HTMLElement
        return parseFloat(
          getComputedStyle(el).getPropertyValue("--apollon-inset-bottom")
        )
      })

    // Baseline: the bottom-left zoom slot floats and reserves nothing.
    expect(await insetBottom()).toBe(0)

    // Move the zoom cluster into the new full-width `footer` band with make-way
    // reservation. It should pin to the bottom edge and, as a band, reserve its
    // height as the bottom inset (unlike a floating slot).
    await updateControl(page, ZOOM_ID, { region: "footer", inset: "auto" })

    const zoom = await box(zoomEl(page))
    expect(zoom.y + zoom.height).toBeGreaterThan(viewport.height - 60)
    expect(await insetBottom()).toBeGreaterThan(0)

    // The palette (a left-rail band) is stretched between the reserved insets, so
    // it never overlaps the footer control.
    expect(overlaps(await box(paletteEl(page)), zoom)).toBe(false)
  })

  test("every corner placement keeps the zoom cluster fully on-screen", async ({
    page,
  }) => {
    const viewport = page.viewportSize()!
    for (const region of CORNERS) {
      await updateControl(page, ZOOM_ID, { region })
      const zoom = await box(zoomEl(page))
      expect(zoom.x).toBeGreaterThanOrEqual(-1)
      expect(zoom.y).toBeGreaterThanOrEqual(-1)
      expect(zoom.x + zoom.width).toBeLessThanOrEqual(viewport.width + 1)
      expect(zoom.y + zoom.height).toBeLessThanOrEqual(viewport.height + 1)
    }
  })
})
