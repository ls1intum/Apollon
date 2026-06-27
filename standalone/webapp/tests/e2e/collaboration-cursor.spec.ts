import { test, expect, type Page } from "@playwright/test"

/**
 * Pixel-precision test for remote collaboration cursors.
 *
 * Two playground tabs link up over a BroadcastChannel. The receiver is zoomed
 * to a *different* viewport than the sender, then we point at a canvas spot in
 * the sender and check where the remote cursor's tip lands in the receiver.
 * Inverting each tab's own viewport must resolve both to the same flow point —
 * that frame-of-reference independence (cursor follows the logical point, not
 * the window) is exactly what the fix restores. Guards the coordinate
 * transform and the arrow-tip hotspot offset together.
 */

// Tip of the arrow within its 16x20 SVG (path starts at "M2 1") — mirrors
// CURSOR_HOTSPOT in the library's CollaborationLayer.
const TIP = { x: 2, y: 1 }

const openCollaboratingTab = async (page: Page) => {
  await page.goto("/playground")
  await page.locator("#collaboration-viewport-test").check()
  await page.locator(".react-flow").first().waitFor({ state: "visible" })
}

// The tab's flow→canvas transform and the canvas's screen origin, read live
// from the DOM so each tab is measured through its own viewport.
const readView = (page: Page) =>
  page.evaluate(() => {
    const viewport = document.querySelector(".react-flow__viewport")!
    const m = new DOMMatrixReadOnly(getComputedStyle(viewport).transform)
    const canvas = document
      .querySelector(".apollon-canvas")!
      .getBoundingClientRect()
    return {
      zoom: m.a,
      panX: m.e,
      panY: m.f,
      canvasX: canvas.left,
      canvasY: canvas.top,
    }
  })

const toFlow = (
  canvasX: number,
  canvasY: number,
  v: { zoom: number; panX: number; panY: number }
) => ({ x: (canvasX - v.panX) / v.zoom, y: (canvasY - v.panY) / v.zoom })

test("remote cursor maps to the same flow point across different viewports", async ({
  page,
  context,
}) => {
  const sender = page
  const receiver = await context.newPage()
  await openCollaboratingTab(sender)
  await openCollaboratingTab(receiver)

  // Give the receiver a different zoom/pan than the sender (the first controls
  // button is zoom-in), so this isn't an identical round trip.
  const zoomIn = receiver.locator(".react-flow__controls-zoomin").first()
  await zoomIn.click()
  await zoomIn.click()

  // Foreground the sender so its rAF cursor flush isn't throttled.
  await sender.bringToFront()
  const senderView = await readView(sender)
  const target = { x: 240, y: 200 } // canvas-local point in the sender
  await sender.mouse.move(
    Math.round(senderView.canvasX + target.x),
    Math.round(senderView.canvasY + target.y),
    { steps: 3 }
  )

  const cursor = receiver.locator(".apollon-collaboration-cursor").first()
  await expect(cursor).toBeVisible()

  const receiverView = await readView(receiver)
  const tip = await cursor.locator("svg").evaluate((el, hotspot) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + hotspot.x, y: r.top + hotspot.y }
  }, TIP)

  const flowSender = toFlow(target.x, target.y, senderView)
  const flowReceiver = toFlow(
    tip.x - receiverView.canvasX,
    tip.y - receiverView.canvasY,
    receiverView
  )

  expect(Math.abs(flowReceiver.x - flowSender.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(flowReceiver.y - flowSender.y)).toBeLessThanOrEqual(1)
})
