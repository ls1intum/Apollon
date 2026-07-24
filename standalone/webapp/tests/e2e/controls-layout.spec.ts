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
 * are slotted controls (`[data-apollon-control]`); the minimap is also a managed
 * control, collapsed by default to a "Show minimap" toggle.
 */
/** The dev-only editor handle exposed on `window` for e2e driving. */
type EditorHandle = {
  updateControl: (id: string, patch: Record<string, unknown>) => void
  removeControl: (id: string) => void
  setLabels: (labels: Record<string, string>) => void
  fitView: (options?: Record<string, unknown>) => void
}

/** Simulate device safe-area insets. Headless browsers report `env()` as 0, so
 *  this seam (see `src/index.tsx`) is the only way to exercise a notch. */
type SafeAreaSim = (value: number[] | number | null) => void

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
// The minimap ships collapsed to a single "Show minimap" toggle; expanding it
// is a separate concern.
const minimapEl = (page: Page): Locator =>
  page.getByRole("button", { name: "Show minimap" })
const minimapControlEl = (page: Page): Locator =>
  page.locator(`[data-apollon-control="${MINIMAP_ID}"]`)
const editorEl = (page: Page): Locator => page.locator(".apollon-editor")

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

// Fire-and-forget imperative mutations. They do NOT wait: the overlay re-measure
// + re-fit is asynchronous (ResizeObserver → rAF → fitView), so each CALL SITE
// asserts the resulting geometry/state with a web-first, auto-retrying matcher
// (`expect.poll`, `toBeVisible`, `toHaveCount`) — the wait is on a CONDITION, not
// a fixed 250ms clock guess that flakes on a slow re-fit and idles on a fast one.
async function updateControl(
  page: Page,
  id: string,
  patch: Record<string, unknown>
) {
  await page.evaluate(
    ([id, patch]) => {
      const ed = (window as unknown as { apollonEditor?: EditorHandle })
        .apollonEditor
      ed?.updateControl(id, patch)
    },
    [id, patch] as const
  )
}

async function removeControl(page: Page, id: string) {
  await page.evaluate((id) => {
    const ed = (window as unknown as { apollonEditor?: EditorHandle })
      .apollonEditor
    ed?.removeControl(id)
  }, id)
}

async function mountHostRegion(
  page: Page,
  region: string,
  html: string
): Promise<void> {
  await page.evaluate(
    ([region, html]) => {
      const ed = (
        window as unknown as {
          apollonEditor?: { getRegionElement: (region: string) => HTMLElement }
        }
      ).apollonEditor
      const host = ed?.getRegionElement(region)
      if (host) host.innerHTML = html
    },
    [region, html] as const
  )
}

async function cssPx(page: Page, name: string): Promise<number> {
  return page.evaluate((name) => {
    const el = document.querySelector(".apollon-editor") as HTMLElement
    return parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0
  }, name)
}

/** The zoom cluster's live bounding box, polled — resolves once it exists. */
async function zoomBox(page: Page): Promise<Box> {
  return box(zoomEl(page))
}
async function paletteBox(page: Page): Promise<Box> {
  return box(paletteEl(page))
}

const CORNERS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const

/** [top, right, bottom, left] — roughly an iPhone in portrait. */
const NOTCH = [47, 0, 34, 0] as const

/**
 * Two nodes spanning 1000×800, which at a 1280×720 viewport makes the fit
 * height-bound and padding-limited: the content's top and bottom edges land
 * exactly on the reserved padding, so a missing inset shows up as overlap.
 *
 * The span is deliberate. A single small node fits at `maxZoom: 1.0` and sits
 * centered with slack on every side, passing whatever the padding is; a much
 * larger span clamps at `minZoom` (0.4) and overflows regardless of padding.
 * Only in between does the assertion actually measure the padding.
 */
const SPREAD_MODEL = {
  ...MODEL,
  id: "controls-layout-spread",
  title: "controls layout spread",
  nodes: [
    { ...MODEL.nodes[0], position: { x: 0, y: 0 } },
    {
      ...MODEL.nodes[0],
      id: "n2-0000-0000-0000-000000000002",
      position: { x: 800, y: 690 },
      data: { name: "Omega", attributes: [], methods: [] },
    },
  ],
}

async function simulateSafeArea(page: Page, insets: number[]): Promise<void> {
  await page.evaluate((insets) => {
    ;(
      window as unknown as { __apollonSafeArea?: SafeAreaSim }
    ).__apollonSafeArea?.(insets)
  }, insets)
  // The grid's padding IS the safe area, and it is what `fitView` reads.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const grid = document.querySelector(".apollon-overlay-grid")
        return grid ? getComputedStyle(grid).paddingTop : ""
      })
    )
    .toBe(`${insets[0]}px`)
}

async function fitView(page: Page): Promise<void> {
  await page.evaluate(() => {
    ;(
      window as unknown as { apollonEditor?: EditorHandle }
    ).apollonEditor?.fitView({ duration: 0 })
  })
  // fitView retries across animation frames until every node is measured.
  await page.waitForTimeout(300)
}

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
      // Web-first: settle on the zoom having relocated (its box is the effect of
      // the mutation), then assert the palette dimensions are unchanged.
      await expect
        .poll(async () =>
          Math.abs((await paletteBox(page)).width - baseline.width)
        )
        .toBeLessThanOrEqual(1)
      const moved = await paletteBox(page)
      expect(Math.abs(moved.height - baseline.height)).toBeLessThanOrEqual(1)
    }

    // Removing the zoom cluster entirely also leaves the palette untouched.
    await removeControl(page, ZOOM_ID)
    await expect(zoomEl(page)).toHaveCount(0)
    await expect
      .poll(async () =>
        Math.abs((await paletteBox(page)).width - baseline.width)
      )
      .toBeLessThanOrEqual(1)
    const withoutZoom = await paletteBox(page)
    expect(Math.abs(withoutZoom.height - baseline.height)).toBeLessThanOrEqual(
      1
    )
  })

  test("the zoom cluster never overlaps the palette at any bottom corner", async ({
    page,
  }) => {
    for (const region of ["bottom-left", "bottom-center"] as const) {
      await updateControl(page, ZOOM_ID, { region })
      // Web-first: poll until the (re-fit) layout has the cluster clear of the
      // palette, rather than reading a single possibly-mid-animation frame.
      await expect
        .poll(async () => overlaps(await paletteBox(page), await zoomBox(page)))
        .toBe(false)
      // Extent-aware clearance: the palette is top-anchored and short, so it ends
      // ABOVE the bottom-left corner. The zoom cluster therefore sits FLUSH at the
      // left edge — it must NOT be shoved right past the palette's width (the
      // wasted-space bug). It clears the palette because the palette isn't there,
      // not by reserving its full column.
      if (region === "bottom-left") {
        const palette = await paletteBox(page)
        await expect
          .poll(async () => (await zoomBox(page)).x)
          .toBeLessThan(palette.x + palette.width / 2)
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
    await expect.poll(async () => (await zoomBox(page)).x).toBeGreaterThan(midX)
    expect((await zoomBox(page)).y).toBeLessThan(midY)

    await updateControl(page, ZOOM_ID, { region: "bottom-right" })
    await expect
      .poll(async () => {
        const zoom = await zoomBox(page)
        return zoom.y + zoom.height
      })
      .toBeGreaterThan(midY)
    expect((await zoomBox(page)).x).toBeGreaterThan(midX)
  })

  test("placing the palette in the right rail keeps its edge breathing room", async ({
    page,
  }) => {
    await updateControl(page, PALETTE_ID, { region: "right-rail" })

    await expect
      .poll(async () => (await paletteBox(page)).x)
      .toBeGreaterThan(900)

    const editor = await box(editorEl(page))
    const palette = await box(paletteEl(page))
    const zoom = await box(zoomEl(page))
    const minimap = await box(minimapEl(page))
    const margins = await paletteEl(page)
      .locator(".apollon-palette")
      .evaluate((el) => {
        const style = getComputedStyle(el)
        return {
          left: parseFloat(style.marginLeft) || 0,
          right: parseFloat(style.marginRight) || 0,
        }
      })

    expect(margins.left).toBe(0)
    expect(margins.right).toBeGreaterThan(0)
    expect(
      editor.x + editor.width - (palette.x + palette.width)
    ).toBeLessThanOrEqual(32)
    expect(overlaps(palette, zoom)).toBe(false)
    expect(overlaps(palette, minimap)).toBe(false)
  })

  test("the bottom-left zoom cluster sits flush, not shoved right by a short palette (dead-space regression)", async ({
    page,
  }) => {
    // The palette is a top-anchored left-rail. On a tall viewport it ends far
    // above the bottom-left corner, so reserving its full width down the whole
    // left edge (the old per-edge scalar model) left the zoom cluster stranded in
    // an empty column. The cluster must now sit flush at the edge margin.
    await page.setViewportSize({ width: 1280, height: 1000 })
    await expect(paletteEl(page)).toBeVisible()
    await expect(zoomEl(page)).toBeVisible()

    const palette = await box(paletteEl(page))
    const zoom = await box(zoomEl(page))

    // The palette really does end above the cluster (precondition for "flush").
    expect(palette.y + palette.height).toBeLessThan(zoom.y)
    // Flush: the cluster's left edge is at the edge margin, near the palette's own
    // left — NOT pushed out past the palette's width.
    expect(zoom.x).toBeLessThan(palette.x + palette.width / 2)
    // And of course they don't overlap.
    expect(overlaps(palette, zoom)).toBe(false)
  })

  test("a short right rail does not push the collapsed minimap away from the right edge", async ({
    page,
  }) => {
    await mountHostRegion(
      page,
      "right-rail",
      `<aside data-testid="host-short-right-rail" style="box-sizing:border-box;width:300px;height:180px;margin:8px;padding:12px;background:white;border:1px solid #ddd">Problem statement</aside>`
    )

    await expect(page.getByTestId("host-short-right-rail")).toBeVisible()
    await expect(minimapControlEl(page)).toBeVisible()
    await expect(minimapEl(page)).toBeVisible()
    await expect
      .poll(() => cssPx(page, "--apollon-inset-right"))
      .toBeGreaterThan(250)

    const editor = await box(editorEl(page))
    const rail = await box(page.getByTestId("host-short-right-rail"))
    const minimap = await box(minimapEl(page))

    expect(overlaps(rail, minimap)).toBe(false)
    expect(
      editor.x + editor.width - (minimap.x + minimap.width)
    ).toBeLessThanOrEqual(32)
  })

  test("wide immersive rails do not make the overlay grid overflow on phone widths", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mountHostRegion(
      page,
      "right-rail",
      `<aside data-testid="host-wide-right-rail" style="box-sizing:border-box;width:535px;height:220px;margin:8px;padding:12px;background:white;border:1px solid #ddd;overflow:auto">Problem statement</aside>`
    )

    await expect(page.getByTestId("host-wide-right-rail")).toBeVisible()
    await expect(minimapControlEl(page)).toBeVisible()
    await expect(minimapEl(page)).toBeVisible()

    await expect
      .poll(() =>
        page.locator(".apollon-overlay-grid").evaluate((el) => {
          const grid = el as HTMLElement
          return grid.scrollWidth - grid.clientWidth
        })
      )
      .toBeLessThanOrEqual(1)

    const editor = await box(editorEl(page))
    const controls = await page
      .locator("[data-apollon-control]")
      .evaluateAll((els) =>
        els.map((el) => {
          const rect = el.getBoundingClientRect()
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }
        })
      )

    for (const control of controls) {
      expect(control.x).toBeGreaterThanOrEqual(editor.x - 1)
      expect(control.y).toBeGreaterThanOrEqual(editor.y - 1)
      expect(control.x + control.width).toBeLessThanOrEqual(
        editor.x + editor.width + 1
      )
      expect(control.y + control.height).toBeLessThanOrEqual(
        editor.y + editor.height + 1
      )
    }
  })

  test("a bottom-right action island shares the bottom slot without lifting bottom-left zoom", async ({
    page,
  }) => {
    const baselineZoom = await box(zoomEl(page))

    await mountHostRegion(
      page,
      "bottom-right",
      `<button data-testid="host-bottom-action" style="box-sizing:border-box;width:220px;height:40px;margin:0;padding:0;background:white;border:1px solid #ddd;pointer-events:auto">Save & submit</button>`
    )

    await expect(page.getByTestId("host-bottom-action")).toBeVisible()
    await expect(minimapControlEl(page)).toBeVisible()
    await expect(minimapEl(page)).toBeVisible()
    await expect
      .poll(() => cssPx(page, "--apollon-inset-bottom"))
      .toBeGreaterThan(40)

    const zoom = await box(zoomEl(page))
    const action = await box(page.getByTestId("host-bottom-action"))
    const minimap = await box(minimapEl(page))

    expect(overlaps(action, minimap)).toBe(false)
    expect(overlaps(zoom, action)).toBe(false)
    expect(Math.abs(zoom.y - baselineZoom.y)).toBeLessThanOrEqual(2)
  })

  test("expanded minimap does not inflate a bottom-right action island inset", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await minimapEl(page).click()
    await expect(
      page.getByRole("button", { name: "Hide minimap" })
    ).toBeVisible()
    await expect(
      page.locator(".react-flow__minimap.apollon-minimap")
    ).toBeVisible()

    await mountHostRegion(
      page,
      "bottom-right",
      `<button data-testid="host-bottom-action" style="box-sizing:border-box;width:220px;height:40px;margin:0;padding:0;background:white;border:1px solid #ddd;pointer-events:auto">Save & submit</button>`
    )

    await expect(page.getByTestId("host-bottom-action")).toBeVisible()

    const action = await box(page.getByTestId("host-bottom-action"))
    const hostWrapper = await box(
      page.locator(`[data-apollon-control="apollon:host:bottom-right"]`)
    )

    expect(hostWrapper.height).toBeLessThanOrEqual(action.height + 2)
    await expect
      .poll(() => cssPx(page, "--apollon-inset-bottom"))
      .toBeLessThan(80)
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

  test("hiding the minimap removes the managed widget", async ({ page }) => {
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
    // Web-first: poll the restored position back to its pre-hide spot.
    await expect
      .poll(async () => Math.abs((await zoomBox(page)).x - before.x))
      .toBeLessThanOrEqual(2)
    expect(Math.abs((await zoomBox(page)).y - before.y)).toBeLessThanOrEqual(2)
  })

  test("the zoom cluster stays a labelled single-tab-stop toolbar after relocation", async ({
    page,
  }) => {
    await updateControl(page, ZOOM_ID, { region: "top-center" })
    const toolbar = page.getByRole("toolbar", {
      name: "Zoom, history and selection controls",
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

    // Web-first: the band reservation applying is the settled-state signal.
    await expect.poll(insetBottom).toBeGreaterThan(0)

    const zoom = await zoomBox(page)
    expect(zoom.y + zoom.height).toBeGreaterThan(viewport.height - 60)

    // The palette (a left-rail band) is stretched between the reserved insets, so
    // it never overlaps the footer control.
    expect(overlaps(await paletteBox(page), zoom)).toBe(false)
  })

  test("labels override re-labels the chrome reactively (i18n)", async ({
    page,
  }) => {
    // Ships English.
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible()

    // A host swaps in its own language at runtime — no remount.
    await page.evaluate(() => {
      const ed = (window as unknown as { apollonEditor?: EditorHandle })
        .apollonEditor
      ed?.setLabels({
        zoomIn: "Vergrößern",
        zoomOut: "Verkleinern",
        showMinimap: "Übersicht anzeigen",
      })
    })

    await expect(page.getByRole("button", { name: "Vergrößern" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Verkleinern" })
    ).toBeVisible()
    // Un-overridden keys fall back to English.
    await expect(page.getByRole("button", { name: "Fit view" })).toBeVisible()
    // The minimap toggle re-labels too.
    await expect(
      page.getByRole("button", { name: "Übersicht anzeigen" })
    ).toBeVisible()
    // The old English label is gone.
    await expect(page.getByRole("button", { name: "Zoom in" })).toHaveCount(0)
  })

  test("every corner placement lands the zoom cluster in that corner's half AND fully on-screen", async ({
    page,
  }) => {
    const viewport = page.viewportSize()!
    const midX = viewport.width / 2
    const midY = viewport.height / 2

    for (const region of CORNERS) {
      await updateControl(page, ZOOM_ID, { region })

      // Web-first: settle on the cluster having reached the correct VERTICAL half
      // (the unambiguous axis for all six placements — the center regions share
      // the horizontal band), which also proves the mutation was applied.
      const wantsTop = region.startsWith("top")
      await expect
        .poll(async () => {
          const z = await zoomBox(page)
          return wantsTop ? z.y < midY : z.y + z.height > midY
        })
        .toBe(true)

      const zoom = await zoomBox(page)
      // Concrete horizontal quadrant for the left/right placements (skip center).
      if (region.endsWith("left")) {
        expect(zoom.x).toBeLessThan(midX)
      } else if (region.endsWith("right")) {
        expect(zoom.x + zoom.width).toBeGreaterThan(midX)
      }

      // …and still fully within the viewport (never clipped off-screen).
      expect(zoom.x).toBeGreaterThanOrEqual(-1)
      expect(zoom.y).toBeGreaterThanOrEqual(-1)
      expect(zoom.x + zoom.width).toBeLessThanOrEqual(viewport.width + 1)
      expect(zoom.y + zoom.height).toBeLessThanOrEqual(viewport.height + 1)
    }
  })

  test("an open edit popover re-labels reactively when setLabels is called (i18n)", async ({
    page,
  }) => {
    // Open the class node's edit popover: select it, then click the pencil icon
    // on its node toolbar (icon [1] = edit, [0] = delete — see the toolbar spec).
    const node = page.locator(".react-flow__node").filter({ hasText: "Alpha" })
    await node.click()
    await page.locator(".react-flow__node-toolbar svg").nth(1).click()

    const popover = page.locator(".apollon-popover")
    await expect(popover).toBeVisible()

    // The class popover renders an "Attributes" section title wired to `useLabels`
    // (t.attributes) — a stable, popover-owned string, not chrome.
    await expect(popover.getByText("Attributes", { exact: true })).toBeVisible()

    // A host swaps the label at runtime while the popover is OPEN — it must update
    // live (the popover subscribes to the labels store), no remount.
    await page.evaluate(() => {
      const ed = (window as unknown as { apollonEditor?: EditorHandle })
        .apollonEditor
      ed?.setLabels({ attributes: "Merkmale-DE" })
    })

    await expect(
      popover.getByText("Merkmale-DE", { exact: true })
    ).toBeVisible()
    // The old English section title is gone (exact match — not a substring of the
    // new value).
    await expect(popover.getByText("Attributes", { exact: true })).toHaveCount(
      0
    )
  })
})

/**
 * The device safe area (notch, Dynamic Island, home indicator) is a hardware
 * constraint, not chrome: `fitView` must clear it on every edge, including edges
 * where the only chrome floats and reserves nothing. Headless browsers report
 * `env(safe-area-inset-*)` as 0, so the insets come from the `__apollonSafeArea`
 * seam — the same one the app uses to preview a notch in a desktop browser.
 */
test.describe("fitView and the device safe area", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, SPREAD_MODEL)
    await waitForCanvasReady(page)
    await expect(zoomEl(page)).toBeVisible()
  })

  test("frames every node below the notch and above the home indicator", async ({
    page,
  }) => {
    await simulateSafeArea(page, [...NOTCH])
    await fitView(page)

    const editor = await box(editorEl(page))
    const nodes = page.locator(".react-flow__node")
    for (const node of await nodes.all()) {
      const b = await box(node)
      expect(b.y).toBeGreaterThanOrEqual(editor.y + NOTCH[0])
      expect(b.y + b.height).toBeLessThanOrEqual(
        editor.y + editor.height - NOTCH[2]
      )
    }
  })

  test("clears the safe area on an edge whose only chrome floats", async ({
    page,
  }) => {
    // With the palette gone, the bottom edge carries just the zoom cluster — a
    // corner slot, which reserves nothing. The home indicator still occludes it.
    await removeControl(page, PALETTE_ID)
    await simulateSafeArea(page, [0, 0, 34, 0])
    await fitView(page)

    const editor = await box(editorEl(page))
    const lowest = Math.max(
      ...(await Promise.all(
        (await page.locator(".react-flow__node").all()).map(async (node) => {
          const b = await box(node)
          return b.y + b.height
        })
      ))
    )
    expect(lowest).toBeLessThanOrEqual(editor.y + editor.height - 34)
  })
})
