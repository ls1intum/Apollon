import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * The connection GHOST (preview line rendered by ConnectionPreviewLine while a
 * connection or reconnection is dragged):
 *  - a NEW connection stays hidden until the pointer is dragged a short distance
 *    from the source node (so a click / tiny drag doesn't flash a preview),
 *    then shows a prominent dashed line;
 *  - its free end SNAPS onto the freeform border point of the node under the
 *    pointer, previewing exactly where the edge will attach;
 *  - reconnecting an endpoint snaps the moved end onto the hovered node too.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const fx = (n: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__d, "..", "fixtures", n), "utf-8")
  ) as Record<string, unknown>

const A = "95aac2b6-3e6b-4e6d-9201-52a498e6ea20"
const B = "32659cdc-bd03-46f3-918c-ee8dbba9c15b"
const EDGE = "edge-inheritance-dog-animal"
const DEST = "550e8400-e29b-41d4-a716-446655440005"

async function box(page: Page, id: string) {
  return (await page
    .locator(`.react-flow__node[data-id="${id}"]`)
    .boundingBox())!
}

/** The ghost connection-path: whether it is visibly rendered + its end point in
 * screen space. */
async function ghost(page: Page) {
  return page.evaluate(() => {
    const p = document.querySelector(
      "path.react-flow__connection-path"
    ) as SVGPathElement | null
    if (!p)
      return { visible: false, end: null as null | { x: number; y: number } }
    const d = p.getAttribute("d") ?? ""
    const opacity = Number(getComputedStyle(p).opacity)
    const visible = d.length > 0 && opacity > 0.5
    let end: { x: number; y: number } | null = null
    const ctm = p.getScreenCTM()
    if (visible && ctm && p.getTotalLength() > 0) {
      const q = p.getPointAtLength(p.getTotalLength())
      const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
      end = { x: m.x, y: m.y }
    }
    return { visible, end }
  })
}

/** Nearest side of a node box to a screen point. */
function sideOf(
  b: { x: number; y: number; width: number; height: number },
  p: { x: number; y: number }
) {
  const d = {
    left: Math.abs(p.x - b.x),
    right: Math.abs(p.x - (b.x + b.width)),
    top: Math.abs(p.y - b.y),
    bottom: Math.abs(p.y - (b.y + b.height)),
  }
  return Object.entries(d).sort((x, y) => x[1] - y[1])[0][0]
}
/** Distance from a screen point to the nearest edge of a node box (0 = on border). */
function distToBorder(
  b: { x: number; y: number; width: number; height: number },
  p: { x: number; y: number }
) {
  const inside =
    p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height
  const dx = Math.min(Math.abs(p.x - b.x), Math.abs(p.x - (b.x + b.width)))
  const dy = Math.min(Math.abs(p.y - b.y), Math.abs(p.y - (b.y + b.height)))
  return inside
    ? Math.min(dx, dy)
    : Math.hypot(
        Math.max(0, p.x < b.x ? b.x - p.x : p.x - (b.x + b.width)),
        Math.max(0, p.y < b.y ? b.y - p.y : p.y - (b.y + b.height))
      )
}

test("the new-connection ghost is hidden near the source, then appears after dragging away", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fx("two-class-no-edge.json"))
  await waitForCanvasReady(page)
  const a = await box(page, A)
  const start = { x: a.x + a.width, y: a.y + a.height / 2 } // right-side handle

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()

  // Just past the border — still "at" the node: ghost must stay hidden.
  await page.mouse.move(start.x + 12, start.y, { steps: 3 })
  expect(
    (await ghost(page)).visible,
    "ghost must stay hidden for a tiny drag near the source"
  ).toBe(false)

  // Dragged well away over empty canvas: ghost must now be visible.
  await page.mouse.move(start.x + 120, start.y, { steps: 8 })
  await expect
    .poll(async () => (await ghost(page)).visible, {
      message: "ghost must appear once dragged away from the source",
    })
    .toBe(true)

  await page.mouse.up()
})

test("the ghost snaps its end onto the target node's border while hovering it", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fx("two-class-no-edge.json"))
  await waitForCanvasReady(page)
  const a = await box(page, A)
  const b = await box(page, B)
  const start = { x: a.x + a.width, y: a.y + a.height / 2 }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  // Aim deep into B's body from the left — the snap should put the end on B's
  // LEFT border (facing the source), not float at the cursor inside the body.
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 })
  await expect
    .poll(async () => (await ghost(page)).visible, {
      message: "ghost must be visible over the target",
    })
    .toBe(true)
  const g = await ghost(page)
  await page.mouse.up()

  expect(g.end, "ghost end must resolve over the target").toBeTruthy()
  expect(
    distToBorder(b, g.end!),
    "ghost end must snap onto B's border, not float at the cursor"
  ).toBeLessThanOrEqual(6)
})

test("the new-connection ghost previews exactly where the edge attaches (preview must not lie)", async ({
  page,
}) => {
  // The ghost snap and the connection commit resolve the drop target through the
  // same helper, so the previewed endpoint must equal the committed one.
  await openFixtureInLocalEditor(page, fx("two-class-no-edge.json"))
  await waitForCanvasReady(page)
  const a = await box(page, A)
  const b = await box(page, B)
  const start = { x: a.x + a.width, y: a.y + a.height / 2 }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(b.x + 10, b.y + b.height / 3, { steps: 12 }) // inside B
  await expect
    .poll(async () => (await ghost(page)).visible, {
      message: "ghost must be visible over the target",
    })
    .toBe(true)
  const g = await ghost(page)
  expect(g.end, "ghost end must resolve over the target").toBeTruthy()

  await page.mouse.up()
  await page.waitForTimeout(150)
  // Exactly one edge now exists; its target endpoint is where the drop attached.
  const committedEnd = await page.evaluate(() => {
    const p = document.querySelector(
      ".react-flow__edge path.react-flow__edge-path"
    ) as SVGPathElement | null
    const ctm = p?.getScreenCTM()
    if (!p || !ctm) return null
    const q = p.getPointAtLength(p.getTotalLength())
    const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
    return { x: m.x, y: m.y }
  })
  expect(committedEnd, "the drop must create an edge").toBeTruthy()
  expect(
    Math.hypot(g.end!.x - committedEnd!.x, g.end!.y - committedEnd!.y),
    "the ghost end must match where the edge actually attaches"
  ).toBeLessThanOrEqual(6)
})

test("reconnecting the target onto a specific side lands on that side", async ({
  page,
}) => {
  for (const aim of ["top", "left", "right"] as const) {
    await openFixtureInLocalEditor(page, fx("class-diagram.json"))
    await waitForCanvasReady(page)
    await page.locator(`.react-flow__edge[data-id="${EDGE}"]`).waitFor()
    const pb = await page
      .locator(
        `.react-flow__edge[data-id="${EDGE}"] path.react-flow__edge-path`
      )
      .boundingBox()
    await page.mouse.click(pb!.x + pb!.width / 2, pb!.y + pb!.height / 2)
    await page.waitForTimeout(150)
    const handle = await page
      .locator(
        `.react-flow__edge[data-id="${EDGE}"] .edge-endpoint-handle--target`
      )
      .boundingBox()
    const d = await box(page, DEST)
    const aimPt =
      aim === "top"
        ? { x: d.x + d.width / 2, y: d.y }
        : aim === "left"
          ? { x: d.x, y: d.y + d.height / 2 }
          : { x: d.x + d.width, y: d.y + d.height / 2 }
    await page.mouse.move(
      handle!.x + handle!.width / 2,
      handle!.y + handle!.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(aimPt.x, aimPt.y, { steps: 16 })
    await page.mouse.up()
    await page.waitForTimeout(150)
    const end = await page.evaluate((eid) => {
      const p = document.querySelector(
        `.react-flow__edge[data-id="${eid}"] path.react-flow__edge-path`
      ) as SVGPathElement | null
      const ctm = p?.getScreenCTM()
      if (!p || !ctm) return null
      const q = p.getPointAtLength(p.getTotalLength())
      const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
      return { x: m.x, y: m.y }
    }, EDGE)
    expect(end, "edge endpoint must be measurable").toBeTruthy()
    expect(sideOf(d, end!), `reconnect aimed ${aim}`).toBe(aim)
  }
})

/** The rendered live edge path: both endpoints (screen), total length, and the
 * straight-line distance between them (total > straight ⇒ orthogonal, not a
 * diagonal). `typeClass`/`pathCount` prove it's still the real typed edge with
 * its decoration, not a bare line. */
async function livePath(page: Page, edgeId: string) {
  return page.evaluate((eid) => {
    const g = document.querySelector(`.react-flow__edge[data-id="${eid}"]`)
    const p = g?.querySelector(
      "path.react-flow__edge-path"
    ) as SVGPathElement | null
    const ctm = p?.getScreenCTM()
    if (!p || !ctm || p.getTotalLength() === 0) return null
    const at = (len: number) => {
      const q = p.getPointAtLength(len)
      const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
      return { x: m.x, y: m.y }
    }
    const total = p.getTotalLength()
    const s = at(0)
    const t = at(total)
    return {
      source: s,
      target: t,
      total,
      straight: Math.hypot(t.x - s.x, t.y - s.y),
      typeClass: g?.getAttribute("class") ?? "",
      pathCount: g?.querySelectorAll("path").length ?? 0,
    }
  }, edgeId)
}

for (const end of ["target", "source"] as const) {
  test(`dragging the ${end} endpoint into empty space: a step-routed ghost follows the cursor and reverts on release`, async ({
    page,
  }) => {
    await openFixtureInLocalEditor(page, fx("class-diagram.json"))
    await waitForCanvasReady(page)
    await page.locator(`.react-flow__edge[data-id="${EDGE}"]`).waitFor()

    const pb = await page
      .locator(
        `.react-flow__edge[data-id="${EDGE}"] path.react-flow__edge-path`
      )
      .boundingBox()
    await page.mouse.click(pb!.x + pb!.width / 2, pb!.y + pb!.height / 2)
    await page.waitForTimeout(150)
    const before = (await livePath(page, EDGE))!
    // The edge is the real typed ClassInheritance edge with its triangle drawn.
    expect(before.typeClass).toContain("ClassInheritance")
    expect(before.pathCount).toBeGreaterThanOrEqual(2)
    const movedBefore = end === "target" ? before.target : before.source

    const handle = await page
      .locator(
        `.react-flow__edge[data-id="${EDGE}"] .edge-endpoint-handle--${end}`
      )
      .boundingBox()
    await page.mouse.move(
      handle!.x + handle!.width / 2,
      handle!.y + handle!.height / 2
    )
    await page.mouse.down()

    // A clearly DIAGONAL empty-canvas point, clear of every node so the endpoint
    // is free (not snapped to a target) and a release there reverts.
    const p = { x: handle!.x + 240, y: handle!.y + 80 }
    await page.mouse.move(p.x, p.y, { steps: 10 })
    await page.waitForTimeout(60)
    const live = (await livePath(page, EDGE))!
    const moved = end === "target" ? live.target : live.source

    // Follows the cursor (within a marker/grid offset) AND has genuinely tracked
    // far from its committed position — a regression that leaves it pinned fails.
    expect(
      Math.hypot(moved.x - p.x, moved.y - p.y),
      `${end} endpoint must follow the cursor in empty space`
    ).toBeLessThanOrEqual(35)
    expect(
      Math.hypot(moved.x - movedBefore.x, moved.y - movedBefore.y),
      `${end} endpoint must move with the drag, not stay pinned to its node`
    ).toBeGreaterThan(100)
    // Step-routed, not a straight diagonal: an orthogonal L-route is longer.
    expect(
      live.total,
      "ghost must be step-routed (longer than a straight line)"
    ).toBeGreaterThan(live.straight * 1.12)

    // Release over empty canvas: the edge must REVERT (no reconnect).
    await page.mouse.up()
    await page.waitForTimeout(150)
    const after = (await livePath(page, EDGE))!
    const movedAfter = end === "target" ? after.target : after.source
    expect(
      Math.hypot(movedAfter.x - movedBefore.x, movedAfter.y - movedBefore.y),
      "releasing over empty canvas must revert the endpoint (no false reconnect)"
    ).toBeLessThanOrEqual(4)
  })
}
