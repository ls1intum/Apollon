import { test, expect, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * Multi-selection mode (issues #407 / #405): the chrome toggle that lets a
 * pointer with no modifier key build a multi-selection — clicks and taps add or
 * remove elements instead of replacing the selection.
 */

// Two separated classes, no package parent and no edges, so a click lands on
// exactly one node and a group drag is unambiguous.
const fixture = {
  id: "e2e-multi-selection-mode",
  version: "4.0.0",
  title: "Multi-selection mode",
  type: "ClassDiagram",
  nodes: [
    {
      id: "node-a",
      width: 160,
      height: 90,
      type: "class",
      position: { x: 0, y: 0 },
      data: { name: "Alpha", methods: [], attributes: [] },
      measured: { width: 160, height: 90 },
    },
    {
      id: "node-b",
      width: 160,
      height: 90,
      type: "class",
      position: { x: 260, y: 0 },
      data: { name: "Beta", methods: [], attributes: [] },
      measured: { width: 160, height: 90 },
    },
  ],
  edges: [],
  assessments: {},
}

function modeToggle(page: Page) {
  return page.getByRole("button", { name: "Select multiple elements" })
}

function selectedNodes(page: Page) {
  return page.locator(".react-flow__node.selected")
}

function node(page: Page, name: string) {
  return page.locator(".react-flow__node", { hasText: name })
}

async function enableMultiSelectionMode(page: Page) {
  const toggle = modeToggle(page)
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-pressed", "true")
}

test.describe("Multi-selection mode", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, fixture)
    await waitForCanvasReady(page)
  })

  test("dragging a selected node moves the whole selection and keeps it", async ({
    page,
  }) => {
    await enableMultiSelectionMode(page)
    await node(page, "Alpha").click()
    await node(page, "Beta").click()

    const alphaBefore = (await node(page, "Alpha").boundingBox())!
    const betaBefore = (await node(page, "Beta").boundingBox())!

    await page.mouse.move(
      alphaBefore.x + alphaBefore.width / 2,
      alphaBefore.y + alphaBefore.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      alphaBefore.x + alphaBefore.width / 2 + 120,
      alphaBefore.y + alphaBefore.height / 2 + 80,
      { steps: 10 }
    )
    await page.mouse.up()

    const alphaAfter = (await node(page, "Alpha").boundingBox())!
    const betaAfter = (await node(page, "Beta").boundingBox())!

    // Both move together, and the pressed node is still selected afterwards —
    // React Flow's pointerdown select would otherwise toggle it back out.
    expect(alphaAfter.x).toBeGreaterThan(alphaBefore.x + 60)
    expect(betaAfter.x).toBeGreaterThan(betaBefore.x + 60)
    await expect(selectedNodes(page)).toHaveCount(2)
    await expect(node(page, "Alpha")).toHaveClass(/selected/)
  })

  test("dragging a box across the pane selects the enclosed elements", async ({
    page,
  }) => {
    await enableMultiSelectionMode(page)

    const alpha = (await node(page, "Alpha").boundingBox())!
    const beta = (await node(page, "Beta").boundingBox())!
    const viewport = page.locator(".react-flow__viewport")
    const transformBefore = await viewport.getAttribute("style")

    // Left-drag from above-left of Alpha to below-right of Beta encloses both.
    await page.mouse.move(alpha.x - 20, alpha.y - 20)
    await page.mouse.down()
    await page.mouse.move(beta.x + beta.width + 20, beta.y + beta.height + 20, {
      steps: 12,
    })
    await page.mouse.up()

    await expect(selectedNodes(page)).toHaveCount(2)
    // The drag box-selected instead of panning the canvas.
    await expect(viewport).toHaveAttribute("style", transformBefore!)
  })

  test("Escape exits the mode and clears the selection", async ({ page }) => {
    await enableMultiSelectionMode(page)
    await node(page, "Alpha").click()
    await expect(selectedNodes(page)).toHaveCount(1)

    await page.keyboard.press("Escape")

    await expect(modeToggle(page)).toHaveAttribute("aria-pressed", "false")
    await expect(selectedNodes(page)).toHaveCount(0)
  })

  test("leaves stock click-to-replace intact once the mode is off", async ({
    page,
  }) => {
    // Guards the flag leak: the mode forces React Flow's multiSelectionActive,
    // and only the effect cleanup puts it back.
    await enableMultiSelectionMode(page)
    await node(page, "Alpha").click()
    await modeToggle(page).click()

    await node(page, "Beta").click()
    await expect(selectedNodes(page)).toHaveCount(1)
    await expect(node(page, "Beta")).toHaveClass(/selected/)
  })
})

test.describe("Multi-selection mode on touch", () => {
  test.use({ hasTouch: true })

  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, fixture)
    await waitForCanvasReady(page)
  })

  async function tapCenter(page: Page, name: string) {
    const box = (await node(page, name).boundingBox())!
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  }

  async function tapToggle(page: Page) {
    const toggle = modeToggle(page)
    const box = (await toggle.boundingBox())!
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
    await expect(toggle).toHaveAttribute("aria-pressed", "true")
  }

  test("taps build, shrink and clear a multi-selection", async ({ page }) => {
    // Arming the mode over an existing selection has to keep it: this is the
    // flow the mode exists for — one element tapped, then "and that one too".
    await tapCenter(page, "Alpha")
    await tapToggle(page)

    await tapCenter(page, "Beta")
    await expect(selectedNodes(page)).toHaveCount(2)

    await tapCenter(page, "Beta")
    await expect(selectedNodes(page)).toHaveCount(1)
    await expect(node(page, "Alpha")).toHaveClass(/selected/)

    const alphaBox = (await node(page, "Alpha").boundingBox())!
    await page.touchscreen.tap(alphaBox.x - 60, alphaBox.y - 60)
    await expect(selectedNodes(page)).toHaveCount(0)
  })

  test("one-finger drag still pans instead of box-selecting", async ({
    page,
    browserName,
  }) => {
    // Guards the asymmetry the mode relies on: the desktop marquee's
    // panOnDrag={[1,2]} must NOT turn a one-finger drag into a selection box,
    // otherwise touch would lose panning and pinch-zoom.
    test.skip(
      browserName !== "chromium",
      "Touch drag is dispatched via CDP, which is Chromium-only."
    )
    await tapToggle(page)

    const viewport = page.locator(".react-flow__viewport")
    const transformBefore = await viewport.getAttribute("style")
    const alphaBox = (await node(page, "Alpha").boundingBox())!
    const startX = alphaBox.x - 80
    const startY = alphaBox.y - 80

    const client = await page.context().newCDPSession(page)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    })
    for (let step = 1; step <= 4; step++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + step * 40, y: startY + step * 25 }],
      })
      await page.waitForTimeout(32)
    }
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    })

    await expect(selectedNodes(page)).toHaveCount(0)
    await expect(viewport).not.toHaveAttribute("style", transformBefore!)
  })
})
