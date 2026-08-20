import { expect, test } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

const MODEL = {
  id: "e2e-fullscreen-portals",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "Fullscreen portals",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: "fullscreen-class-0000-0000-000000000001",
      type: "class",
      width: 200,
      height: 100,
      position: { x: 300, y: 280 },
      measured: { width: 200, height: 100 },
      data: { name: "FullscreenClass", attributes: [], methods: [] },
    },
  ],
}

test("playground exposes its editor workspace as fullscreen", async ({
  page,
}) => {
  await page.goto("/playground")

  const surface = page.getByTestId("playground-fullscreen-surface")
  await page.getByTestId("playground-enter-fullscreen").click()

  await expect
    .poll(() =>
      page.evaluate(
        () => (document.fullscreenElement as HTMLElement | null)?.dataset.testid
      )
    )
    .toBe("playground-fullscreen-surface")
  await expect(surface.locator(".playground-apollon-editor")).toBeVisible()

  await page.evaluate(() => document.exitFullscreen())
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement))
    .toBeNull()
})

test("keeps editor-owned floating surfaces inside subtree fullscreen", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, MODEL)
  await waitForCanvasReady(page)

  await page.evaluate(() => {
    const trigger = document.createElement("button")
    trigger.dataset.testid = "enter-editor-fullscreen"
    trigger.textContent = "Enter editor fullscreen"
    trigger.style.position = "fixed"
    trigger.style.zIndex = "2147483647"
    trigger.addEventListener("click", () => {
      void document
        .querySelector<HTMLElement>(".apollon-editor")
        ?.requestFullscreen()
    })
    document.body.append(trigger)
  })
  await page.getByTestId("enter-editor-fullscreen").click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains("apollon-editor")
      )
    )
    .toBe(true)

  const editor = page.locator(".apollon-editor").first()
  const portalRoot = editor.locator(":scope > [data-apollon-portal-root]")
  await expect(portalRoot).toHaveCount(1)

  const node = editor.locator(".react-flow__node").filter({
    hasText: "FullscreenClass",
  })
  await node.click()
  await page.getByRole("button", { name: "Edit element" }).click()
  const popover = page.locator(".apollon-popover")
  await expect(popover).toBeVisible()
  expect(
    await popover.evaluate((popup) =>
      Boolean(popup.closest("[data-apollon-portal-root]"))
    )
  ).toBe(true)

  await page.keyboard.press("Escape")
  const fitView = editor.getByRole("button", { name: "Fit view" })
  await fitView.hover()
  const tooltip = page.locator('[data-slot="tooltip-content"]')
  await expect(tooltip).toBeVisible()
  expect(
    await tooltip.evaluate((tip) =>
      Boolean(tip.closest("[data-apollon-portal-root]"))
    )
  ).toBe(true)
  await page.mouse.move(1, 1)
  await expect(tooltip).toBeHidden()

  const paletteItem = editor.getByRole("button", {
    name: "Add element: Class",
  })
  const paletteBox = await paletteItem.boundingBox()
  const canvasBox = await editor.locator(".react-flow").boundingBox()
  expect(paletteBox).not.toBeNull()
  expect(canvasBox).not.toBeNull()
  await page.mouse.move(
    paletteBox!.x + paletteBox!.width / 2,
    paletteBox!.y + paletteBox!.height / 2
  )
  await page.mouse.down()
  try {
    await page.mouse.move(
      canvasBox!.x + canvasBox!.width * 0.6,
      canvasBox!.y + canvasBox!.height * 0.5,
      { steps: 10 }
    )
    await expect
      .poll(() =>
        portalRoot.evaluate((root) =>
          [...root.children].some(
            (child) =>
              getComputedStyle(child).position === "fixed" &&
              getComputedStyle(child).zIndex === "9999"
          )
        )
      )
      .toBe(true)
  } finally {
    await page.mouse.up()
  }

  await page.evaluate(() => document.exitFullscreen())
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement))
    .toBeNull()

  await node.click()
  await page.getByRole("button", { name: "Edit element" }).click()
  await expect(popover).toBeVisible()
  expect(
    await popover.evaluate((popup) =>
      Boolean(popup.closest("[data-apollon-portal-root]"))
    )
  ).toBe(false)
})
