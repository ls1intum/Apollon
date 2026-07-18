import { test, expect, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * NodeResizer renders its controls before the node's content in the DOM, so an
 * edge resize line with no z-index paints behind a filled node and can't be
 * grabbed — you'd be left with only the corners. A swimlane is the most filled
 * node in the editor, so it's where this showed. The line now sits above the
 * content (below the corners and connection arcs), which only a real browser can
 * confirm: it's about stacking and hit-testing, not which elements exist.
 */

const SWIMLANE_ID = "swimlane-0000-0000-0000-000000000001"

const MODEL = {
  version: "4.0.0",
  id: "e2e-resize-edge-reachable",
  title: "resize edge reachable",
  type: "ActivityDiagram",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: SWIMLANE_ID,
      type: "activitySwimlane",
      position: { x: 120, y: 100 },
      width: 440,
      height: 280,
      measured: { width: 440, height: 280 },
      data: {
        name: "",
        orientation: "vertical",
        lanes: [
          { id: "l1", name: "Customer" },
          { id: "l2", name: "System" },
        ],
      },
    },
  ],
}

/**
 * Is the top edge's resize line the top-most element anywhere along the border?
 * The corners cap the ends and the connection arcs sit at their slots, so this
 * samples the gaps between them — if the line is buried under the swimlane body,
 * every sample returns the content instead and this is false.
 */
const topEdgeHitsResizeLine = (page: Page, id: string) =>
  page.evaluate((nodeId) => {
    const host = document.querySelector(
      `.react-flow__node[data-id="${nodeId}"]`
    )
    if (!host) throw new Error(`no node ${nodeId}`)
    const r = host.getBoundingClientRect()
    for (let fraction = 0.12; fraction <= 0.88; fraction += 0.04) {
      const el = document.elementFromPoint(r.left + r.width * fraction, r.top)
      if (el?.closest(".react-flow__resize-control.line.top")) return true
    }
    return false
  }, id)

test("a swimlane's top edge is grabbable, not just its corners", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  const swimlane = page.locator(`.react-flow__node[data-id="${SWIMLANE_ID}"]`)
  const box = (await swimlane.boundingBox())!
  // Resize controls arm (and become hit-testable) only while the node is hovered.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(150)

  expect(await topEdgeHitsResizeLine(page, SWIMLANE_ID)).toBe(true)
})
