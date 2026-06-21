import { test, expect, type Page } from "@playwright/test"
import { waitForCanvasReady } from "../helpers/canvas"

// Coverage for the editor-chrome polish pass: minimap card, version-history
// dark-mode surface, and the landscape rail (not a bottom sheet).

const MODEL_ID = "chrome-polish-model-id"

async function openEditor(page: Page) {
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
              title: "Chrome Polish",
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
  }, MODEL_ID)
  await page.goto(`/local/${MODEL_ID}`)
  await waitForCanvasReady(page, false)
}

/** Sum of the rgb channels of a computed colour — a cheap light/dark probe. */
async function rgbSum(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return -1
    const bg = getComputedStyle(el).backgroundColor // "rgb(r, g, b)" / "rgba(...)"
    const nums = bg.match(/[\d.]+/g)?.map(Number) ?? []
    return (nums[0] ?? 0) + (nums[1] ?? 0) + (nums[2] ?? 0)
  }, selector)
}

test.describe("Editor chrome polish", () => {
  test("minimap expands into a bounded card and collapses back", async ({
    page,
  }) => {
    await openEditor(page)

    // Collapsed: just the open button, no map.
    await expect(page.locator(".react-flow__minimap")).toHaveCount(0)
    await page.getByRole("button", { name: "Show minimap" }).click()

    // Expanded: a real, bounded minimap card (regression guard — a CSS slip once
    // collapsed it to a 0-size sliver with a floating arrow).
    const map = page.locator(".react-flow__minimap")
    await expect(map).toBeVisible()
    const box = await map.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(120)
    expect(box!.height).toBeGreaterThan(80)

    // The collapse control overlaps the card's bottom-right corner.
    const hide = page.getByRole("button", { name: "Hide minimap" })
    await expect(hide).toBeVisible()
    const hideBox = await hide.boundingBox()
    expect(hideBox).not.toBeNull()
    // Within the map's bounds (corner-anchored), not floating outside it.
    expect(hideBox!.x).toBeGreaterThanOrEqual(box!.x - 2)
    expect(hideBox!.x + hideBox!.width).toBeLessThanOrEqual(
      box!.x + box!.width + 2
    )

    await hide.click()
    await expect(page.locator(".react-flow__minimap")).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Show minimap" })
    ).toBeVisible()
  })

  test("version history surface is dark in dark mode", async ({ page }) => {
    await openEditor(page)
    await page.getByRole("button", { name: /Switch to dark mode/i }).click()
    await page.getByRole("button", { name: /Version history/i }).click()
    await expect(
      page.getByRole("complementary", { name: /Version history/i })
    ).toBeVisible()

    // The panel surface must follow the theme — not render as a white sheet
    // (the MUI Paper default once leaked through in dark mode).
    const sum = await rgbSum(page, ".apollon-history-panel")
    expect(sum).toBeGreaterThanOrEqual(0) // element exists
    expect(sum).toBeLessThan(300) // clearly dark, nowhere near white (765)
  })

  test("version history is a right rail in landscape, not a bottom sheet", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await openEditor(page)
    await page.getByRole("button", { name: /Version history/i }).click()
    const panel = page.getByRole("complementary", { name: /Version history/i })
    await expect(panel).toBeVisible()

    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    // A rail sits in the right half and is far narrower than the viewport — a
    // bottom sheet would span (nearly) the full width on the left.
    expect(box!.x).toBeGreaterThan(844 * 0.45)
    expect(box!.width).toBeLessThan(844 * 0.6)
  })

  test("chrome clears a simulated landscape notch via the real inset (no floor)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await openEditor(page)

    // Baseline: no safe area → chrome hugs the 10px edge (no hardcoded floor).
    const palette = page.getByTestId("apollon-palette")
    const before = await palette.boundingBox()
    expect(before).not.toBeNull()
    expect(before!.x).toBeLessThan(20)

    // Simulate a 59px side notch the way a device would report it (the dev-only
    // helper sets --safe-area-inset-*, the same var env()/System Bars feed). The
    // max(edge, inset) model must then push the palette clear of the notch.
    await page.evaluate(() => {
      const sim = (
        window as unknown as {
          __apollonSafeArea?: (v: number[] | number | null) => void
        }
      ).__apollonSafeArea
      sim?.([0, 59, 0, 59]) // [top, right, bottom, left]
    })
    await page.waitForTimeout(150)

    const after = await palette.boundingBox()
    expect(after).not.toBeNull()
    // Palette now clears the notch by the real inset — not a constant floor.
    expect(after!.x).toBeGreaterThanOrEqual(59)
    expect(after!.x).toBeLessThan(80)
  })
})
