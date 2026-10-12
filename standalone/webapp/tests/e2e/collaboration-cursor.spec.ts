import { test, expect, type Page } from "@playwright/test"

// Tip of the arrow within its 16x20 SVG (path starts at "M2 1") — mirrors
// CURSOR_HOTSPOT in the library's CollaborationLayer.
const TIP = { x: 2, y: 1 }

const openCollaboratingTab = async (page: Page) => {
  await page.goto("/playground")
  // Base UI's Checkbox forwards its id to a hidden proxy input; the clickable
  // control is the role=checkbox button, wired to its label. Toggle it by
  // clicking the label text (the page loads with it unchecked).
  await page.getByText("Collaboration viewport test", { exact: true }).click()
  await page.locator(".react-flow").first().waitFor({ state: "visible" })
  await page.getByRole("button", { name: "Collapse test sidebar" }).click()
  await page
    .getByRole("button", { name: "Collapse theme configuration" })
    .click()
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

const remoteCursorPoint = async (page: Page) => {
  const view = await readView(page)
  const tip = await page
    .locator(".apollon-collaboration-cursor svg")
    .evaluate((el, hotspot) => {
      const bounds = el.getBoundingClientRect()
      return { x: bounds.left + hotspot.x, y: bounds.top + hotspot.y }
    }, TIP)
  return toFlow(tip.x - view.canvasX, tip.y - view.canvasY, view)
}

const expectRemoteCursor = async (
  page: Page,
  expected: { x: number; y: number }
) => {
  await expect(page.locator(".apollon-collaboration-cursor")).toBeVisible()
  await expect
    .poll(async () => {
      const actual = await remoteCursorPoint(page)
      return Math.hypot(actual.x - expected.x, actual.y - expected.y)
    })
    .toBeLessThanOrEqual(1)
}

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
  const zoomIn = receiver.getByRole("button", { name: "Zoom in" })
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

test("scrolling under a resting pointer updates the remote cursor", async ({
  page: sender,
  context,
}) => {
  const receiver = await context.newPage()
  await openCollaboratingTab(sender)
  await openCollaboratingTab(receiver)
  await sender.bringToFront()

  const before = await readView(sender)
  const point = { x: 240, y: 200 }
  await sender.mouse.move(before.canvasX + point.x, before.canvasY + point.y)
  await expectRemoteCursor(receiver, toFlow(point.x, point.y, before))

  await sender.mouse.wheel(100, 75)
  await expect.poll(() => readView(sender)).not.toEqual(before)
  const after = await readView(sender)
  await expectRemoteCursor(receiver, toFlow(point.x, point.y, after))

  await sender.mouse.move(0, 0)
  await expect(receiver.locator(".apollon-collaboration-cursor")).toBeHidden()
})

test("dragging the canvas keeps the remote cursor on the same diagram point", async ({
  page: sender,
  context,
}) => {
  const receiver = await context.newPage()
  await openCollaboratingTab(sender)
  await openCollaboratingTab(receiver)
  await sender.bringToFront()

  const before = await readView(sender)
  const point = { x: 180, y: 120 }
  await sender.mouse.move(before.canvasX + point.x, before.canvasY + point.y)
  const flowPoint = toFlow(point.x, point.y, before)
  await expectRemoteCursor(receiver, flowPoint)

  await sender.mouse.down({ button: "middle" })
  try {
    for (const offset of [30, 60, 90]) {
      await sender.mouse.move(
        before.canvasX + point.x + offset,
        before.canvasY + point.y + offset
      )
      await expect
        .poll(async () => {
          const view = await readView(sender)
          return [view.panX - before.panX, view.panY - before.panY]
        })
        .toEqual([offset, offset])
      // A stale cursor is also at flowPoint until the pending frame is sent.
      await sender.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      )
      await expectRemoteCursor(receiver, flowPoint)
    }
  } finally {
    await sender.mouse.up({ button: "middle" })
  }
})
