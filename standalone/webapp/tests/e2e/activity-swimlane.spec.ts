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
const TOL = 4 // px tolerance absorbing sub-pixel/anti-alias rounding only

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
}

// Drag the swimlane by its header band and assert the action tracks it 1:1 in
// screen space — the observable proof that the action is parented to it.
const expectActionTracksSwimlane = async (page: Page) => {
  const s0 = await nodeBox(page, SWIMLANE_ID)
  const c0 = await nodeBox(page, ACTION_ID)
  await dragBy(page, { x: s0.x + s0.width / 2, y: s0.y + 12 }, -70, 55)
  // Wait for the *child* to commit its new position (it's what we assert on),
  // not just the swimlane — avoids reading the child mid-commit.
  await expect
    .poll(async () => (await nodeBox(page, ACTION_ID)).x - c0.x)
    .toBeLessThan(-30)
  const s1 = await nodeBox(page, SWIMLANE_ID)
  const c1 = await nodeBox(page, ACTION_ID)
  expect(Math.abs(c1.x - c0.x - (s1.x - s0.x))).toBeLessThanOrEqual(TOL)
  expect(Math.abs(c1.y - c0.y - (s1.y - s0.y))).toBeLessThanOrEqual(TOL)
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
    await expectActionTracksSwimlane(page)
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
    // Wait until the action has actually landed inside the swimlane frame.
    await expect
      .poll(async () => {
        const s = await nodeBox(page, SWIMLANE_ID)
        const a = await nodeBox(page, ACTION_ID)
        const cx = a.x + a.width / 2
        return cx >= s.x && cx <= s.x + s.width
      })
      .toBe(true)

    // Proof of parenting: the action now tracks the swimlane when it moves.
    await expectActionTracksSwimlane(page)
  })

  test("flipping orientation keeps the action inside the frame", async ({
    page,
  }) => {
    // Action near the right edge of a wide vertical swimlane (in lane 2, fully
    // inside: 270 + 150 = 420 < 440) — the case that strands a child off-frame
    // if the flip transpose ignores the child's own width.
    await openFixtureInLocalEditor(
      page,
      swimlaneModel("vertical", { parented: true, x: 270, y: 150 })
    )
    await waitForCanvasReady(page)
    const before = await nodeBox(page, SWIMLANE_ID)

    await page
      .locator(`.react-flow__node[data-id="${SWIMLANE_ID}"]`)
      .dblclick({ position: { x: 30, y: 12 } })
    await page.getByRole("combobox", { name: "Orientation" }).click()
    await page.getByRole("option", { name: "Horizontal (rows)" }).click()
    // Flip is committed once the swimlane has become narrower (440 -> 280).
    await expect
      .poll(async () => (await nodeBox(page, SWIMLANE_ID)).width)
      .toBeLessThan(before.width - 20)

    const sl = await nodeBox(page, SWIMLANE_ID)
    const act = await nodeBox(page, ACTION_ID)
    expect(act.x).toBeGreaterThanOrEqual(sl.x - TOL)
    expect(act.y).toBeGreaterThanOrEqual(sl.y - TOL)
    expect(act.x + act.width).toBeLessThanOrEqual(sl.x + sl.width + TOL)
    expect(act.y + act.height).toBeLessThanOrEqual(sl.y + sl.height + TOL)
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
    await page
      .locator(`.react-flow__node[data-id="${SWIMLANE_ID}"]`)
      .dblclick({ position: { x: 30, y: 12 } })

    await page.getByRole("button", { name: /Add lane/ }).click()
    await expect
      .poll(async () => (await nodeBox(page, SWIMLANE_ID)).width)
      .toBeGreaterThan(start.width)
    const grown = await nodeBox(page, SWIMLANE_ID)

    await page.getByLabel("Delete lane").first().click()
    await expect
      .poll(async () => (await nodeBox(page, SWIMLANE_ID)).width)
      .toBeLessThan(grown.width)
  })

  test("the swimlane exposes no connection handles", async ({ page }) => {
    await openFixtureInLocalEditor(
      page,
      swimlaneModel("vertical", { parented: true, x: 250, y: 140 })
    )
    await waitForCanvasReady(page)
    await expect(
      page.locator(
        `.react-flow__node[data-id="${SWIMLANE_ID}"] .react-flow__handle`
      )
    ).toHaveCount(0)
  })

  test("dragging a lane separator resizes the lanes, conserving total width", async ({
    page,
  }) => {
    await openFixtureInLocalEditor(
      page,
      swimlaneModel("vertical", { parented: true, x: 250, y: 150 })
    )
    await waitForCanvasReady(page)

    const sl = await nodeBox(page, SWIMLANE_ID)
    const handle = page
      .locator(
        `.react-flow__node[data-id="${SWIMLANE_ID}"] [aria-label="Resize lane"]`
      )
      .first()
    const h0 = (await handle.boundingBox())!
    const cx = h0.x + h0.width / 2
    const cy = h0.y + h0.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 70, cy, { steps: 10 })
    await page.mouse.up()

    // The separator moved right (lane 1 grew)...
    await expect
      .poll(async () => (await handle.boundingBox())!.x)
      .toBeGreaterThan(h0.x + 25)
    // ...while the swimlane's outer width is unchanged (balanced resize).
    const after = await nodeBox(page, SWIMLANE_ID)
    expect(Math.abs(after.width - sl.width)).toBeLessThanOrEqual(TOL)
  })

  test("lanes can be reordered in the popover", async ({ page }) => {
    // Action sits in lane 2 ("System") — right half of the swimlane.
    await openFixtureInLocalEditor(
      page,
      swimlaneModel("vertical", { parented: true, x: 250, y: 150 })
    )
    await waitForCanvasReady(page)

    const sl = await nodeBox(page, SWIMLANE_ID)
    const actBefore = await nodeBox(page, ACTION_ID)
    expect(actBefore.x + actBefore.width / 2).toBeGreaterThan(
      sl.x + sl.width / 2
    )

    await page
      .locator(`.react-flow__node[data-id="${SWIMLANE_ID}"]`)
      .dblclick({ position: { x: 30, y: 12 } })
    const handles = page.getByLabel("Reorder lane")
    await expect(handles).toHaveCount(2)

    // Reorder via dnd-kit's KeyboardSensor instead of a synthetic pointer drag.
    // A mouse drag's success hinges on collision detection sampling the pointer
    // mid-move, which is racy under loaded CI; the keyboard sensor is a
    // deterministic state machine: pick the second lane's handle up (Space),
    // move it up one slot (ArrowUp), and drop it (Space).
    const handle = handles.nth(1)
    // `press` targets the handle element directly (focus + key), so activation
    // can't be lost to the popover's own focus management the way a bare
    // `page.keyboard` press after `.focus()` can. dnd-kit then keeps focus on
    // the lifted item, so the move/drop keys go to the right place.
    await handle.press("Space")
    // The lifted item gets aria-pressed once the keyboard drag is active; wait
    // for that so the move key can't arrive before the pick-up is registered.
    await expect(handle).toHaveAttribute("aria-pressed", "true")

    // dnd-kit announces every keyboard step in its aria-live region. Capture the
    // pick-up announcement, fire the move, then wait for the announcement to
    // CHANGE before dropping — otherwise under loaded CI the drop (Space) can land
    // before ArrowUp commits, leaving the lane in its original slot (a flake).
    const dndLiveRegion = page.locator('[id^="DndLiveRegion"]').first()
    const pickupAnnouncement = (await dndLiveRegion.textContent()) ?? ""
    await page.keyboard.press("ArrowUp")
    await expect
      .poll(async () => (await dndLiveRegion.textContent()) ?? "")
      .not.toBe(pickupAnnouncement)
    await page.keyboard.press("Space")

    // Lane labels swapped.
    await expect
      .poll(async () =>
        page
          .getByPlaceholder("Lane name")
          .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
      )
      .toEqual(["System", "Customer"])

    // ...and the action followed its lane to the left half.
    await expect
      .poll(async () => {
        const a = await nodeBox(page, ACTION_ID)
        const s = await nodeBox(page, SWIMLANE_ID)
        return a.x + a.width / 2 < s.x + s.width / 2
      })
      .toBe(true)
  })
})
