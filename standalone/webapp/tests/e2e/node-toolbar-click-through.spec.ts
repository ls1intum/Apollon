import { test, expect } from "@playwright/test"
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

test("the toolbar's empty area does not block the node beneath it", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, OVERLAP_MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  const alpha = page.locator(".react-flow__node").filter({ hasText: "Alpha" })
  // Select Alpha via its bottom strip, which is clear of Beta.
  const aBox = await alpha.boundingBox()
  await page.mouse.click(aBox!.x + aBox!.width / 2, aBox!.y + aBox!.height - 8)
  await expect(alpha).toHaveClass(/selected/)

  // A point inside the toolbar box but outside its buttons, which sits
  // over Beta. Clicking it must reach Beta, not be eaten by the toolbar.
  const target = await page.evaluate(() => {
    const tb = document.querySelector<HTMLElement>(".react-flow__node-toolbar")!
    const r = tb.getBoundingClientRect()
    return { x: r.x + 1, y: r.y + r.height / 2 }
  })
  await page.mouse.click(target.x, target.y)
  const beta = page.locator(".react-flow__node").filter({ hasText: "Beta" })
  await expect(beta).toHaveClass(/selected/)
})

test("the toolbar exposes full pointer targets and keyboard-operable actions", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, SINGLE_MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  const solo = page.locator(".react-flow__node").filter({ hasText: "Solo" })
  await solo.click()
  await expect(solo).toHaveClass(/selected/)

  const edit = page.getByRole("button", { name: "Edit element" })
  const remove = page.getByRole("button", { name: "Delete element" })
  await expect(
    page.getByRole("group", { name: "Selection actions" })
  ).toBeVisible()
  for (const button of [edit, remove]) {
    const box = await button.boundingBox()
    expect(box?.width).toBe(28)
    expect(box?.height).toBe(28)
  }

  await edit.focus()
  await expect(edit).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.locator(".apollon-popover")).toHaveCount(1)

  // Dismiss the popover, then use the lower-right of the delete button, well
  // outside the 16px icon mask, to verify the full button is the pointer target.
  await page.keyboard.press("Escape")
  await expect(page.locator(".apollon-popover")).toHaveCount(0)
  await solo.click()
  const removeBox = (await remove.boundingBox())!
  await page.mouse.click(
    removeBox.x + removeBox.width - 2,
    removeBox.y + removeBox.height - 2
  )
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "Solo" })
  ).toHaveCount(0)
})
