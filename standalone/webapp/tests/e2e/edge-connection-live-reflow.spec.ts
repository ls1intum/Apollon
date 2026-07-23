import { test, expect, type Page } from "@playwright/test"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Drawing a NEW connection onto a node that already has edges must reflow those
 * neighbours LIVE — the solver routes the in-progress connection as a transient
 * edge, so the existing edges fan/re-anchor to make room WHILE you drag, and the
 * committed edge lands exactly where the preview showed (no jump on release).
 */

const mk = (id: string, name: string, x: number, y: number) => ({
  id,
  type: "class",
  position: { x, y },
  width: 160,
  height: 100,
  measured: { width: 160, height: 100 },
  data: { name, attributes: [], methods: [] },
  selected: false,
})

// C is the hub (top); A (already connected) and B sit below it, CLOSE ENOUGH that
// both edges want the same spot on C's bottom side. That contention is the whole
// point: a neighbour only has to move over when the newcomer lands in its fan slot.
// (Spread them further apart and each edge simply aims at its own partner, so nothing
// needs to move — correct, but then it would not exercise this.)
const fixture = {
  id: "live-reflow",
  version: "4.1.0",
  title: "",
  type: "ClassDiagram",
  nodes: [
    mk("C", "C", 400, 100),
    mk("A", "A", 350, 400),
    mk("B", "B", 430, 400),
  ],
  edges: [
    {
      id: "AC",
      type: "ClassUnidirectional",
      source: "A",
      target: "C",
      data: { points: [] },
    },
  ],
  assessments: {},
}

const pathOf = (page: Page, id: string) =>
  page.getAttribute(
    `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`,
    "d"
  )

test("a new connection reflows the neighbours live and the commit does not jump", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 1000 })
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const before = await pathOf(page, "AC")
  expect(before).toBeTruthy()

  const bBox = (await page
    .locator(".react-flow__node")
    .filter({ hasText: "B" })
    .first()
    .boundingBox())!
  const cBox = (await page
    .locator(".react-flow__node")
    .filter({ hasText: "C" })
    .first()
    .boundingBox())!

  // Drag a connection from B's top handle up into C's body.
  await page.mouse.move(bBox.x + bBox.width / 2, bBox.y)
  await page.mouse.down()
  await page.mouse.move(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2, {
    steps: 15,
  })

  // The existing A→C edge must have moved to make room for the in-progress B→C.
  await expect
    .poll(() => pathOf(page, "AC"), {
      message: "the neighbour must reflow while the connection is dragged",
    })
    .not.toEqual(before)
  const during = await pathOf(page, "AC")

  await page.mouse.up()
  await expect(page.locator(".react-flow__edge")).toHaveCount(2)

  // And it must stay exactly where the preview put it — no jump on commit.
  const handoffPaths = await page.evaluate(async () => {
    const values: Array<string | null> = []
    for (let frame = 0; frame < 60; frame++) {
      values.push(
        document
          .querySelector(
            '.react-flow__edge[data-id="AC"] path.react-flow__edge-path'
          )
          ?.getAttribute("d") ?? null
      )
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
    }
    return values
  })
  expect(
    new Set(handoffPaths),
    "the neighbour must not jump when the edge is committed"
  ).toEqual(new Set([during]))
})
