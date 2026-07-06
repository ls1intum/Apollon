import { test, expect, type Page, type Locator } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * Generalises the node-toolbar click-through fix (#791) to a node's OTHER
 * floating affordances: its connection handles (arcs that stick ~14px past the
 * node edge) and its resize handles (8px squares straddling the corners).
 *
 * Selecting a node lifts it above its neighbours (`elevateNodesOnSelect`). If
 * those protruding affordances captured the pointer just because the node is
 * selected, they'd swallow clicks meant for an overlapping node sitting beneath
 * them — the node becomes unselectable exactly where the affordances overhang it.
 * They must show when selected but only capture while the node is HOVERED (every
 * gesture that uses them starts by hovering the node), so a selected-not-hovered
 * node lets clicks fall through to whatever it overlaps.
 */

// Beta covers Alpha's right third, so Alpha's right-edge connection handles and
// top-right resize handle land on top of Beta once Alpha is selected+elevated.
const OVERLAP_MODEL = {
  id: "e2e-affordance-blocking",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "affordance blocking",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: "alpha-0000-0000-0000-000000000001",
      type: "class",
      width: 200,
      height: 120,
      position: { x: 250, y: 300 },
      measured: { width: 200, height: 120 },
      data: { name: "Alpha", attributes: [], methods: [] },
    },
    {
      id: "beta-0000-0000-0000-0000000000002",
      type: "class",
      width: 200,
      height: 120,
      position: { x: 400, y: 300 }, // overlaps Alpha's right 50px
      measured: { width: 200, height: 120 },
      data: { name: "Beta", attributes: [], methods: [] },
    },
  ],
}

const CONNECT_MODEL = {
  id: "e2e-affordance-connect",
  type: "ClassDiagram",
  version: "4.0.0",
  title: "affordance connect",
  assessments: {},
  edges: [],
  nodes: [
    {
      id: "src0-0000-0000-0000-000000000001",
      type: "class",
      width: 160,
      height: 90,
      position: { x: 220, y: 320 },
      measured: { width: 160, height: 90 },
      data: { name: "Src", attributes: [], methods: [] },
    },
    {
      id: "tgt0-0000-0000-0000-000000000002",
      type: "class",
      width: 160,
      height: 90,
      position: { x: 520, y: 320 },
      measured: { width: 160, height: 90 },
      data: { name: "Tgt", attributes: [], methods: [] },
    },
  ],
}

const selectedNames = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll(".react-flow__node.selected")).map(
      (n) => (n.textContent || "").replace(/\s+/g, " ").trim().slice(0, 5)
    )
  )

const node = (page: Page, name: string): Locator =>
  page.locator(".react-flow__node").filter({ hasText: name })

test("a selected node's connection handles don't block an overlapping node", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, OVERLAP_MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  const alpha = node(page, "Alpha")
  const aBox = (await alpha.boundingBox())!

  // Select Alpha via its left strip (clear of Beta), then move the pointer away
  // so Alpha is selected but NOT hovered — the realistic state when you next go
  // to click a different node.
  await page.mouse.click(aBox.x + 12, aBox.y + aBox.height / 2)
  await page.waitForTimeout(200)
  expect(await selectedNames(page)).toEqual(["Alpha"])
  await page.mouse.move(aBox.x + aBox.width / 2, aBox.y - 140)
  await page.waitForTimeout(120)

  // Click a few px PAST Alpha's right edge, over Beta — the strip where Alpha's
  // right-side connection arcs protrude. It must reach Beta, not Alpha's handle.
  await page.mouse.click(aBox.x + aBox.width + 5, aBox.y + aBox.height / 2)
  await page.waitForTimeout(200)
  expect(await selectedNames(page)).toEqual(["Beta"])
})

test("a selected node's resize handle doesn't block an overlapping node", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, OVERLAP_MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  const alpha = node(page, "Alpha")
  const aBox = (await alpha.boundingBox())!

  await page.mouse.click(aBox.x + 12, aBox.y + aBox.height / 2)
  await page.waitForTimeout(200)
  expect(await selectedNames(page)).toEqual(["Alpha"])
  await page.mouse.move(aBox.x + aBox.width / 2, aBox.y - 140)
  await page.waitForTimeout(120)

  // Alpha's top-right resize handle straddles Alpha's corner and overhangs onto
  // Beta. Aim at the part of that handle that lies PAST Alpha's right edge (so
  // it's over Beta, not Alpha's body): unfixed, the handle swallows the click.
  const rh = (await alpha
    .locator(".react-flow__resize-control.handle.top.right")
    .boundingBox())!
  const overhangX = Math.max(rh.x + rh.width - 1, aBox.x + aBox.width + 1)
  await page.mouse.click(overhangX, rh.y + rh.height - 1)
  await page.waitForTimeout(200)
  expect(await selectedNames(page)).toEqual(["Beta"])
})

test("a hovered node still starts a connection from its handle (not over-corrected)", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, CONNECT_MODEL as Record<string, unknown>)
  await waitForCanvasReady(page)

  const src = node(page, "Src")
  const tgt = node(page, "Tgt")

  // Hover the source so its handles activate, then drag from its right handle
  // onto the target — the standard connect gesture.
  await src.hover()
  await page.waitForTimeout(120)
  const handle = src
    .locator('.react-flow__handle[data-handleid="right"]')
    .first()
  const hb = (await handle.boundingBox())!
  const tb = (await tgt.boundingBox())!
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)

  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
})
