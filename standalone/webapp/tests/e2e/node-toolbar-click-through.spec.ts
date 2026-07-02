import { test, expect, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * A selected node shows an edit/delete toolbar floating at its top-right. The
 * toolbar's box is larger than its two icons, so its empty margins (and the gap
 * between the icons) must NOT swallow clicks meant for a node sitting beneath
 * it — otherwise that node becomes unclickable. Only the icons themselves
 * should capture the pointer.
 */

// Two class nodes: "Beta" covers "Alpha"'s top-right corner, exactly where
// Alpha's toolbar appears once Alpha is selected.
const OVERLAP_MODEL = {
  id: "e2e-toolbar-blocking",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "toolbar blocking",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: "alpha-0000-0000-0000-000000000001",
      type: "class",
      width: 200,
      height: 100,
      position: { x: 200, y: 400 },
      measured: { width: 200, height: 100 },
      data: { name: "Alpha", attributes: [], methods: [] },
    },
    {
      id: "beta-0000-0000-0000-0000000000002",
      type: "class",
      width: 300,
      height: 200,
      position: { x: 250, y: 250 },
      measured: { width: 300, height: 200 },
      data: { name: "Beta", attributes: [], methods: [] },
    },
  ],
}

const SINGLE_MODEL = {
  id: "e2e-toolbar-buttons",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "toolbar buttons",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: "solo-0000-0000-0000-0000000000001",
      type: "class",
      width: 200,
      height: 100,
      position: { x: 300, y: 300 },
      measured: { width: 200, height: 100 },
      data: { name: "Solo", attributes: [], methods: [] },
    },
  ],
}

const selectedNames = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll(".react-flow__node.selected")).map(
      (n) => (n.textContent || "").replace(/\s+/g, " ").trim().slice(0, 8)
    )
  )

test("the toolbar's empty area does not block the node beneath it", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, OVERLAP_MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  const alpha = page.locator(".react-flow__node").filter({ hasText: "Alpha" })
  // Select Alpha via its bottom strip, which is clear of Beta.
  const aBox = await alpha.boundingBox()
  await page.mouse.click(aBox!.x + aBox!.width / 2, aBox!.y + aBox!.height - 8)
  await page.waitForTimeout(300)
  expect(await selectedNames(page)).toEqual(["Alpha"])

  // A point inside the toolbar box but on no icon (its left margin), which sits
  // over Beta. Clicking it must reach Beta, not be eaten by the toolbar.
  const target = await page.evaluate(() => {
    const tb = document.querySelector<HTMLElement>(".react-flow__node-toolbar")!
    const r = tb.getBoundingClientRect()
    return { x: Math.round(r.x + 2), y: Math.round(r.y + r.height / 2) }
  })
  await page.mouse.click(target.x, target.y)
  await page.waitForTimeout(300)

  expect(await selectedNames(page)).toEqual(["Beta"])
})

test("the toolbar's edit and delete icons still work", async ({ page }) => {
  await openFixtureInLocalEditor(page, SINGLE_MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  const solo = page.locator(".react-flow__node").filter({ hasText: "Solo" })
  await solo.click()
  await page.waitForTimeout(300)
  expect(await selectedNames(page)).toEqual(["Solo"])

  // The toolbar renders two lucide icons (svg): [0] = delete, [1] = edit.
  const icons = page.locator(".react-flow__node-toolbar svg")

  // Edit (pencil) opens the popover.
  await icons.nth(1).click()
  await page.waitForTimeout(300)
  await expect(page.locator(".apollon-popover")).toHaveCount(1)

  // Dismiss the popover, then delete (trash) removes the node.
  await page.keyboard.press("Escape")
  await page.waitForTimeout(200)
  await solo.click()
  await page.waitForTimeout(200)
  await icons.first().click()
  await page.waitForTimeout(300)
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "Solo" })
  ).toHaveCount(0)
})
