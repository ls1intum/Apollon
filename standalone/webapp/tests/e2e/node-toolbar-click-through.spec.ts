import { test, expect, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * A selected node shows an edit/delete toolbar floating at its top-right. The
 * toolbar's surface must not swallow clicks meant for a node sitting beneath
 * it, while each action's full button box remains interactive.
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

  // A point inside the toolbar box but outside its buttons, which sits
  // over Beta. Clicking it must reach Beta, not be eaten by the toolbar.
  const target = await page.evaluate(() => {
    const tb = document.querySelector<HTMLElement>(".react-flow__node-toolbar")!
    const r = tb.getBoundingClientRect()
    return { x: r.x + 1, y: r.y + r.height / 2 }
  })
  await page.mouse.click(target.x, target.y)
  await page.waitForTimeout(300)

  expect(await selectedNames(page)).toEqual(["Beta"])
})

test("the toolbar's full edit and delete buttons are clickable", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, SINGLE_MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  const solo = page.locator(".react-flow__node").filter({ hasText: "Solo" })
  await solo.click()
  await page.waitForTimeout(300)
  expect(await selectedNames(page)).toEqual(["Solo"])

  const edit = page.getByRole("button", { name: "Edit element" })
  const remove = page.getByRole("button", { name: "Delete element" })
  for (const button of [edit, remove]) {
    const box = await button.boundingBox()
    expect(box?.width).toBe(28)
    expect(box?.height).toBe(28)
  }

  // Use the lower-right of each button, well outside the 16px icon mask.
  const editBox = (await edit.boundingBox())!
  await page.mouse.click(editBox.x + editBox.width - 2, editBox.y + 2)
  await page.waitForTimeout(300)
  await expect(page.locator(".apollon-popover")).toHaveCount(1)

  // Dismiss the popover, then deleting from the button corner removes the node.
  await page.keyboard.press("Escape")
  await page.waitForTimeout(200)
  await solo.click()
  await page.waitForTimeout(200)
  const removeBox = (await remove.boundingBox())!
  await page.mouse.click(
    removeBox.x + removeBox.width - 2,
    removeBox.y + removeBox.height - 2
  )
  await page.waitForTimeout(300)
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "Solo" })
  ).toHaveCount(0)
})
