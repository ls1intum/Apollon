import { test, expect, type Page } from "@playwright/test"
import { waitForCanvasReady } from "../helpers/canvas"

/**
 * Scroll lock exists for an editor embedded in a scrolling host page: the wheel
 * belongs to the page, and zooming needs the modifier. Both halves have to be
 * true, and the failure this pins is the one where NEITHER was.
 *
 * `panOnScroll` / `zoomOnScroll` only stop React Flow from ACTING on the wheel.
 * React Flow still calls `preventDefault()` on it — that is `preventScrolling`,
 * a separate prop defaulting to true — so a locked canvas used to swallow the
 * wheel entirely: it would not zoom, and the page would not scroll either. An
 * editor in the middle of a long form became a dead zone you could not scroll
 * past, which is the worst possible reading of "lock".
 *
 * Whether the page then actually moves is the host's business (its own layout
 * decides that), so the contract asserted here is the one Apollon owns: the
 * wheel's default action survives.
 */
const SCROLL_LOCK = "#playground-scroll-lock-label"
const ZOOM = '[data-apollon-control="apollon:zoom"]'

/** The canvas transform — a plain wheel PANS when unlocked, so zoom % alone
 *  would not notice the canvas reacting. */
async function viewportTransform(page: Page) {
  return page
    .locator(".react-flow__viewport")
    .evaluate((element) => getComputedStyle(element).transform)
}

/** The native input is visually replaced by a styled control; click the label. */
async function toggleScrollLock(page: Page, expected: "true" | "false") {
  await page.locator(SCROLL_LOCK).click()
  await expect(page.locator("#playground-scroll-lock")).toHaveJSProperty(
    "checked",
    expected === "true"
  )
}

async function wheelOverCanvas(page: Page, modifier?: "Control") {
  const box = await page.locator(".react-flow__pane").boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  if (modifier) await page.keyboard.down(modifier)
  await page.mouse.wheel(0, 300)
  if (modifier) await page.keyboard.up(modifier)
}

/** Whether a wheel over the canvas leaves its default action for the page. */
async function wheelIsPrevented(page: Page) {
  return page.evaluate(() => {
    const pane = document.querySelector(".react-flow__pane")!
    const event = new WheelEvent("wheel", {
      deltaY: 120,
      bubbles: true,
      cancelable: true,
    })
    pane.dispatchEvent(event)
    return event.defaultPrevented
  })
}

test.describe("scroll lock hands the wheel back to the page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/playground")
    await waitForCanvasReady(page, false)
  })

  test("locked, the wheel keeps its default action and the hint says how to zoom", async ({
    page,
  }) => {
    await toggleScrollLock(page, "true")

    const transformBefore = await viewportTransform(page)

    await wheelOverCanvas(page)
    await expect(page.locator(".scroll-overlay--visible")).toBeVisible()
    expect(await wheelIsPrevented(page)).toBe(false)
    // The canvas must not have quietly panned or zoomed underneath the scroll.
    expect(await viewportTransform(page)).toBe(transformBefore)
  })

  test("locked, the zoom modifier still zooms", async ({ page }) => {
    await toggleScrollLock(page, "true")

    const zoom = page.locator(ZOOM)
    const before = await zoom.textContent()
    await wheelOverCanvas(page, "Control")

    await expect.poll(() => zoom.textContent()).not.toBe(before)
  })

  test("unlocked, the canvas keeps the wheel", async ({ page }) => {
    const before = await viewportTransform(page)

    await wheelOverCanvas(page)

    await expect.poll(() => viewportTransform(page)).not.toBe(before)
    // Panning the canvas and scrolling the host at once is the other failure mode.
    expect(await wheelIsPrevented(page)).toBe(true)
  })
})
