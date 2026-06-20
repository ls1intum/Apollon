import { test, expect, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * End-to-end behaviour of the Activity-diagram swimlane (activity partition):
 * parenting (children follow the swimlane and drop-in reparents), orientation
 * flip not stranding children, and add/remove lane resizing the container.
 *
 * Membership is positional (a child belongs to the lane it sits in), matching
 * the UML notation, so these tests assert the *geometric* guarantees the
 * feature actually makes — not a stored per-lane reference.
 */

const SWIMLANE_ID = "sl"
const ACTION_ID = "act"

const swimlaneModel = (
  orientation: "vertical" | "horizontal",
  action: { parented: boolean; x: number; y: number }
) => ({
  version: "4.0.0",
  id: "e2e-activity-swimlane",
  title: "Swimlane E2E",
  type: "ActivityDiagram",
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
        orientation,
        lanes: [
          { id: "l1", name: "Customer" },
          { id: "l2", name: "System" },
        ],
      },
    },
    {
      id: ACTION_ID,
      type: "activityActionNode",
      ...(action.parented ? { parentId: SWIMLANE_ID } : {}),
      position: { x: action.x, y: action.y },
      width: 150,
      height: 50,
      measured: { width: 150, height: 50 },
      data: { name: "Process order" },
    },
  ],
  edges: [],
  assessments: {},
})

const nodeBox = async (page: Page, id: string) => {
  const box = await page
    .locator(`.react-flow__node[data-id="${id}"]`)
    .boundingBox()
  if (!box) throw new Error(`node ${id} has no bounding box`)
  return box
}

const dragBy = async (
  page: Page,
  from: { x: number; y: number },
  dx: number,
  dy: number
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(300)
}

test.describe("activity swimlane", () => {
  test("a contained action moves together with the swimlane", async ({
    page,
  }) => {
    await openFixtureInLocalEditor(
      page,
      swimlaneModel("vertical", { parented: true, x: 250, y: 140 })
    )
    await waitForCanvasReady(page)

    const before = await nodeBox(page, ACTION_ID)
    const sl = await nodeBox(page, SWIMLANE_ID)
    // Grab the swimlane by its header band (top strip), away from the action.
    await dragBy(page, { x: sl.x + sl.width / 2, y: sl.y + 12 }, 90, 60)

    const after = await nodeBox(page, ACTION_ID)
    expect(Math.round(after.x - before.x)).toBeGreaterThan(60)
    expect(Math.round(after.y - before.y)).toBeGreaterThan(30)
  })

  test("dropping a free action onto the swimlane makes it a child", async ({
    page,
  }) => {
    // Action starts to the right of the swimlane, unparented.
    await openFixtureInLocalEditor(
      page,
      swimlaneModel("vertical", { parented: false, x: 640, y: 160 })
    )
    await waitForCanvasReady(page)

    const sl = await nodeBox(page, SWIMLANE_ID)
    const act = await nodeBox(page, ACTION_ID)
    // Drag the action into the swimlane's second lane (right half, below header).
    await dragBy(
      page,
      { x: act.x + act.width / 2, y: act.y + act.height / 2 },
      sl.x + sl.width * 0.7 - (act.x + act.width / 2),
      sl.y + sl.height * 0.6 - (act.y + act.height / 2)
    )

    // Proof of parenting: moving the swimlane now also moves the action.
    const before = await nodeBox(page, ACTION_ID)
    const sl2 = await nodeBox(page, SWIMLANE_ID)
    await dragBy(page, { x: sl2.x + sl2.width / 2, y: sl2.y + 12 }, -70, 50)
    const after = await nodeBox(page, ACTION_ID)
    expect(Math.round(before.x - after.x)).toBeGreaterThan(40)
    expect(Math.round(after.y - before.y)).toBeGreaterThan(25)
  })

  test("flipping orientation keeps the action inside the frame", async ({
    page,
  }) => {
    // Action near the right edge of a wide vertical swimlane — the case that
    // would be stranded off-frame if children weren't transposed on flip.
    await openFixtureInLocalEditor(
      page,
      swimlaneModel("vertical", { parented: true, x: 360, y: 150 })
    )
    await waitForCanvasReady(page)

    await page.locator(`.react-flow__node[data-id="${SWIMLANE_ID}"]`).dblclick()
    await page.getByRole("combobox", { name: "Orientation" }).click()
    await page.getByRole("option", { name: "Horizontal (rows)" }).click()
    await page.waitForTimeout(400)

    const sl = await nodeBox(page, SWIMLANE_ID)
    const act = await nodeBox(page, ACTION_ID)
    const tol = 4
    expect(act.x).toBeGreaterThanOrEqual(sl.x - tol)
    expect(act.y).toBeGreaterThanOrEqual(sl.y - tol)
    expect(act.x + act.width).toBeLessThanOrEqual(sl.x + sl.width + tol)
    expect(act.y + act.height).toBeLessThanOrEqual(sl.y + sl.height + tol)
  })

  test("adding a lane grows the swimlane and removing one shrinks it", async ({
    page,
  }) => {
    await openFixtureInLocalEditor(
      page,
      swimlaneModel("vertical", { parented: true, x: 250, y: 150 })
    )
    await waitForCanvasReady(page)

    const start = await nodeBox(page, SWIMLANE_ID)
    await page.locator(`.react-flow__node[data-id="${SWIMLANE_ID}"]`).dblclick()

    await page.getByRole("button", { name: /Add lane/ }).click()
    await page.waitForTimeout(300)
    const grown = await nodeBox(page, SWIMLANE_ID)
    expect(grown.width).toBeGreaterThan(start.width + 20)

    await page.getByLabel("Delete lane").first().click()
    await page.waitForTimeout(300)
    const shrunk = await nodeBox(page, SWIMLANE_ID)
    expect(shrunk.width).toBeLessThan(grown.width - 20)
  })
})
