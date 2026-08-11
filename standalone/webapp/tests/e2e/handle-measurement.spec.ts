import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

const __d = path.dirname(fileURLToPath(import.meta.url))
const classDiagram = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "class-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

/**
 * React Flow measures a node's handles once and reuses that cache for the life of
 * the node, so a handle without a box when a saved diagram loads is cached at zero
 * size and every connection drag from it starts far outside its node. Nothing in
 * the library forces a re-measure, and hovering does not trigger one, so the state
 * this asserts is the only chance to get the geometry right.
 *
 * Idle handles are meant to be invisible, which is fine — `visibility`, `opacity`
 * and a transparent fill all keep the box. `display: none` does not.
 */
test("handles keep their geometry while a loaded diagram sits idle", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classDiagram)
  await waitForCanvasReady(page)

  // Park the pointer off-canvas: the bug only appears when no node is hovered.
  await page.mouse.move(0, 0)

  const collapsed = await page.evaluate(() =>
    [...document.querySelectorAll(".react-flow__node")].flatMap((node) =>
      [...node.querySelectorAll(".react-flow__handle")]
        .filter((handle) => {
          const rect = handle.getBoundingClientRect()
          return rect.width === 0 && rect.height === 0
        })
        .map((handle) => handle.getAttribute("data-handleid") ?? "?")
    )
  )

  expect(
    collapsed,
    "handles measured at zero size resolve to a point outside their node"
  ).toEqual([])
})
