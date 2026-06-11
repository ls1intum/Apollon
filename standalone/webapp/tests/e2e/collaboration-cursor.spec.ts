import { test, expect, type Page } from "@playwright/test"

/**
 * Pixel-precision test for remote collaboration cursors.
 *
 * Two tabs of the playground link up over a BroadcastChannel. Moving the
 * pointer to a known point of the canvas in one tab must render the remote
 * cursor's tip at the *same* canvas point in the other tab. Both tabs share
 * the same size and model, so their viewports match and a flow point maps to
 * the same canvas pixel in each — letting us assert the round trip exactly.
 *
 * Guards the cursor coordinate transform and the arrow-tip hotspot offset.
 */

// Tip of the arrow within its 16x20 SVG (path starts at "M2 1") — mirrors
// CURSOR_HOTSPOT in the library's CollaborationLayer.
const TIP = { x: 2, y: 1 }

const openCollaboratingTab = async (page: Page) => {
  await page.goto("/playground")
  await page.locator("#collaboration-viewport-test").check()
  // Wait for the editor to remount with collaboration enabled.
  await page.locator(".react-flow").first().waitFor({ state: "visible" })
}

const canvasBox = async (page: Page) => {
  const box = await page.locator(".apollon-canvas").first().boundingBox()
  if (!box) throw new Error("canvas not found")
  return box
}

test("remote cursor tip lands on the sender's canvas point", async ({
  page,
  context,
}) => {
  const sender = page
  const receiver = await context.newPage()
  await openCollaboratingTab(sender)
  await openCollaboratingTab(receiver)

  // A point well inside the canvas, in canvas-local coordinates.
  const target = { x: 220, y: 180 }
  // Foreground the sender so its rAF cursor flush isn't throttled.
  await sender.bringToFront()
  const senderCanvas = await canvasBox(sender)
  await sender.mouse.move(
    Math.round(senderCanvas.x + target.x),
    Math.round(senderCanvas.y + target.y),
    { steps: 3 }
  )

  const cursor = receiver.locator(".apollon-collaboration-cursor").first()
  await expect(cursor).toBeVisible()

  const receiverCanvas = await canvasBox(receiver)
  const svg = cursor.locator("svg")
  const tip = await svg.evaluate((el, offset) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + offset.x, y: r.top + offset.y }
  }, TIP)

  const tipOnCanvas = {
    x: tip.x - receiverCanvas.x,
    y: tip.y - receiverCanvas.y,
  }

  expect(Math.abs(tipOnCanvas.x - target.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(tipOnCanvas.y - target.y)).toBeLessThanOrEqual(1)
})
