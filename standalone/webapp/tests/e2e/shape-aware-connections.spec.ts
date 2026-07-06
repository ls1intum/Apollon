import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

const __d = path.dirname(fileURLToPath(import.meta.url))
const readFixture = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(__d, "..", "fixtures", name), "utf-8"))
const useCaseFixture = readFixture("use-case-diagram.json")
const activityFixture = readFixture("activity-diagram.json")
const flowchartFixture = readFixture("flowchart.json")

const BROWSE = "880e8400-e29b-41d4-a716-446655440033" // use-case oval
const INVENTORY = "880e8400-e29b-41d4-a716-446655440035" // use-case oval
const ACTIVITY_CONTAINER = "770e8400-e29b-41d4-a716-446655440021" // "Process Order"
const IO_NODE = "50e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a" // flowchart parallelogram

async function nodeBox(page: Page, id: string) {
  return (await page
    .locator(`.react-flow__node[data-id="${id}"]`)
    .boundingBox())!
}

/** Screen geometry of a node's inscribed ellipse. */
async function ovalGeom(page: Page, id: string) {
  return page.evaluate((nid) => {
    const r = (
      document.querySelector(
        `.react-flow__node[data-id="${nid}"]`
      ) as HTMLElement
    ).getBoundingClientRect()
    return {
      cx: r.x + r.width / 2,
      cy: r.y + r.height / 2,
      rx: r.width / 2,
      ry: r.height / 2,
    }
  }, id)
}

test("connecting to a use-case oval lands the endpoint on the ellipse curve, not the bbox corner", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, useCaseFixture)
  await waitForCanvasReady(page)

  // Draw a connection from the Browse oval down to the Inventory oval, aiming at
  // the Inventory oval's TOP-RIGHT — a point that, on a rectangle, would be the
  // empty bbox corner OUTSIDE the visible oval.
  const source = page.locator(`.react-flow__node[data-id="${BROWSE}"]`)
  await source.hover()
  await page.waitForTimeout(120)
  const handle = source
    .locator('.react-flow__handle[data-handleid="bottom"]')
    .first()
  const hb = await handle.boundingBox()
  const inv = await nodeBox(page, INVENTORY)
  const aim = { x: inv.x + inv.width - 12, y: inv.y + 12 }

  await page.mouse.move(hb!.x + hb!.width / 2, hb!.y + hb!.height / 2)
  await page.mouse.down()
  await page.mouse.move(aim.x, aim.y, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(250)

  const g = await ovalGeom(page, INVENTORY)
  // The endpoint of some edge closest to the Inventory oval's centre.
  const end = await page.evaluate((geom) => {
    const paths = Array.from(
      document.querySelectorAll(".react-flow__edge path.react-flow__edge-path")
    ) as SVGPathElement[]
    let best: { x: number; y: number } | null = null
    let bestD = Infinity
    for (const p of paths) {
      const ctm = p.getScreenCTM()
      if (!ctm || p.getTotalLength() === 0) continue
      for (const len of [0, p.getTotalLength()]) {
        const q = p.getPointAtLength(len)
        const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
        const d = Math.hypot(m.x - geom.cx, m.y - geom.cy)
        if (d < bestD) {
          bestD = d
          best = { x: m.x, y: m.y }
        }
      }
    }
    return best
  }, g)

  expect(end, "a connection to the oval must exist").toBeTruthy()
  // On the ellipse, ((x-cx)/rx)² + ((y-cy)/ry)² == 1. The bbox top-right corner
  // would be ~2. Allow a little slack for the arrow-marker gap.
  const onEllipse =
    ((end!.x - g.cx) / g.rx) ** 2 + ((end!.y - g.cy) / g.ry) ** 2
  expect(onEllipse, "endpoint hugs the oval curve").toBeGreaterThan(0.75)
  expect(onEllipse, "endpoint is NOT in the empty bbox corner").toBeLessThan(
    1.4
  )
  // And it landed where we aimed (upper-right), not snapped to a side midpoint.
  expect(end!.x).toBeGreaterThan(g.cx)
  expect(end!.y).toBeLessThan(g.cy)
})

test("an edge endpoint can be reconnected onto a container node (e.g. an Activity)", async ({
  page,
}) => {
  // Regression: container/parent nodes (activity, package, pool, subsystem …)
  // used to be excluded as freeform reconnect targets, so an endpoint dragged
  // onto them silently reverted.
  await openFixtureInLocalEditor(page, activityFixture)
  await waitForCanvasReady(page)
  const EDGE = "edge-flow-merge-ship"
  const edgePath = page.locator(
    `.react-flow__edge[data-id="${EDGE}"] path.react-flow__edge-path`
  )
  const pb = await edgePath.boundingBox()
  await page.mouse.click(pb!.x + pb!.width / 2, pb!.y + pb!.height / 2)
  await page.waitForTimeout(200)

  const container = await nodeBox(page, ACTIVITY_CONTAINER)
  const targetEnd = () =>
    page.evaluate((id) => {
      const p = document.querySelector(
        `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`
      ) as SVGPathElement | null
      const ctm = p?.getScreenCTM()
      if (!p || !ctm) return null
      const q = p.getPointAtLength(p.getTotalLength())
      const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
      return { x: m.x, y: m.y }
    }, EDGE)

  const before = await targetEnd()
  const handle = await page
    .locator(
      `.react-flow__edge[data-id="${EDGE}"] .edge-endpoint-handle--target`
    )
    .boundingBox()
  const aim = {
    x: container.x + container.width * 0.6,
    y: container.y + container.height - 4,
  }
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(aim.x, aim.y, { steps: 18 })
  await page.mouse.up()
  await page.waitForTimeout(250)

  const after = await targetEnd()
  expect(before && after).toBeTruthy()
  // The endpoint moved and now sits on the container's border.
  expect(
    Math.hypot(after!.x - before!.x, after!.y - before!.y)
  ).toBeGreaterThan(20)
  expect(Math.abs(after!.y - (container.y + container.height))).toBeLessThan(14)
  expect(after!.x).toBeGreaterThan(container.x)
  expect(after!.x).toBeLessThan(container.x + container.width)
})

test("reconnecting onto the input/output parallelogram follows the slanted outline", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, flowchartFixture)
  await waitForCanvasReady(page)
  const io = await nodeBox(page, IO_NODE)
  const EDGE = "edge-decision-print" // its target sits on the IO node's left side

  const targetEnd = () =>
    page.evaluate((id) => {
      const p = document.querySelector(
        `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`
      ) as SVGPathElement | null
      const ctm = p?.getScreenCTM()
      if (!p || !ctm) return null
      const q = p.getPointAtLength(p.getTotalLength())
      const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
      return { x: m.x, y: m.y }
    }, EDGE)

  const reconnectTo = async (y: number) => {
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
    await page.mouse.move(
      handle!.x + handle!.width / 2,
      handle!.y + handle!.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(io.x + 4, y, { steps: 14 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    return targetEnd()
  }

  // Left edge slants from inset-at-top to flush-at-bottom, so a drop high up
  // lands further right than one low down — proving a continuous outline, not a
  // fixed point, and never in the empty bbox corner.
  const top = await reconnectTo(io.y + 8)
  const bottom = await reconnectTo(io.y + io.height - 8)
  expect(top && bottom).toBeTruthy()
  const insetTop = top!.x - io.x
  const insetBottom = bottom!.x - io.x
  expect(insetTop).toBeGreaterThan(insetBottom + 5) // sheared: top is inset more
  expect(insetBottom).toBeLessThan(6) // flush with the bbox at the bottom
})

test("a tiny reconnect drag on a straight edge keeps the arrow on the node (no gap)", async ({
  page,
}) => {
  // Regression (the user's report): dragging a straight edge's endpoint a little
  // way along the edge left a ~15px gap between the arrowhead and the node,
  // because the drag preview applied the marker padding the committed edge does
  // not. The tip must stay on the target's border throughout a small drag.
  await openFixtureInLocalEditor(page, readFixture("two-class-fresh-edge.json"))
  await waitForCanvasReady(page)
  const EDGE = "231f7ef5-b43d-4187-8996-f7726ed6e919"
  const TARGET = "32659cdc-bd03-46f3-918c-ee8dbba9c15b"
  const tgt = await nodeBox(page, TARGET) // edge enters its LEFT border (tgt.x)

  const tipX = () =>
    page.evaluate((id) => {
      const p = document.querySelector(
        `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`
      ) as SVGPathElement | null
      const ctm = p?.getScreenCTM()
      if (!p || !ctm) return null
      const q = p.getPointAtLength(p.getTotalLength())
      return new DOMPoint(q.x, q.y).matrixTransform(ctm).x
    }, EDGE)

  const pb = await page
    .locator(`.react-flow__edge[data-id="${EDGE}"] path.react-flow__edge-path`)
    .boundingBox()
  await page.mouse.click(pb!.x + pb!.width / 2, pb!.y + pb!.height / 2)
  await page.waitForTimeout(200)
  const handle = await page
    .locator(
      `.react-flow__edge[data-id="${EDGE}"] .edge-endpoint-handle--target`
    )
    .boundingBox()

  for (const dx of [8, 16]) {
    await page.mouse.move(
      handle!.x + handle!.width / 2,
      handle!.y + handle!.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      handle!.x + handle!.width / 2 - dx,
      handle!.y + handle!.height / 2,
      {
        steps: 5,
      }
    )
    await page.waitForTimeout(100)
    const gap = (await tipX())! - tgt.x
    await page.mouse.up()
    await page.waitForTimeout(100)
    expect(
      Math.abs(gap),
      `tiny drag (${dx}px) must not detach the arrow`
    ).toBeLessThan(6)
  }
})

test("the ghost preview matches where a use-case oval connection lands (no drift)", async ({
  page,
}) => {
  // The oval connects continuously along its curve via the freeform path, so a
  // new connection must land exactly where the dashed ghost previewed it — not a
  // few px off at a fixed handle.
  await openFixtureInLocalEditor(page, useCaseFixture)
  await waitForCanvasReady(page)
  const dst = await nodeBox(page, INVENTORY)
  const before = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".react-flow__edge")).map((e) =>
      e.getAttribute("data-id")
    )
  )
  await page.locator(`.react-flow__node[data-id="${BROWSE}"]`).hover()
  await page.waitForTimeout(150)
  const h = await page
    .locator(
      `.react-flow__node[data-id="${BROWSE}"] .react-flow__handle[data-handleid="bottom"]`
    )
    .first()
    .boundingBox()
  // A clearly OFF-cardinal aim (upper-left of the oval), where handle-snapping
  // and the ray projection diverge most.
  await page.mouse.move(h!.x + h!.width / 2, h!.y + h!.height / 2)
  await page.mouse.down()
  await page.mouse.move(dst.x + 22, dst.y + 20, { steps: 18 })
  await page.waitForTimeout(120)
  const ghost = await page.evaluate(() => {
    const p = document.querySelector(
      "path.react-flow__connection-path"
    ) as SVGPathElement | null
    const ctm = p?.getScreenCTM()
    if (!p || !ctm || p.getTotalLength() === 0) return null
    const q = p.getPointAtLength(p.getTotalLength())
    const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
    return { x: m.x, y: m.y }
  })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const commit = await page.evaluate((b) => {
    const now = Array.from(document.querySelectorAll(".react-flow__edge")).map(
      (e) => e.getAttribute("data-id")
    )
    const id = now.find((x) => !b.includes(x))
    if (!id) return null
    const p = document.querySelector(
      `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`
    ) as SVGPathElement | null
    const ctm = p?.getScreenCTM()
    if (!p || !ctm) return null
    const q = p.getPointAtLength(p.getTotalLength())
    const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
    return { x: m.x, y: m.y }
  }, before)
  expect(
    ghost && commit,
    "a connection must be created with a ghost preview"
  ).toBeTruthy()
  // The committed endpoint (nearer the oval) matches the ghost within a couple px.
  expect(Math.hypot(ghost!.x - commit!.x, ghost!.y - commit!.y)).toBeLessThan(8)
})

test("connecting to a use-case oval shows a snap circle at the live attach point, at any angle", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, useCaseFixture)
  await waitForCanvasReady(page)
  const dst = await nodeBox(page, INVENTORY)
  const cx = dst.x + dst.width / 2
  const cy = dst.y + dst.height / 2
  await page.locator(`.react-flow__node[data-id="${BROWSE}"]`).hover()
  await page.waitForTimeout(150)
  const h = await page
    .locator(
      `.react-flow__node[data-id="${BROWSE}"] .react-flow__handle[data-handleid="bottom"]`
    )
    .first()
    .boundingBox()
  // Aim at an OFF-cardinal point (~60°) — the case with no visible handle.
  const aim = {
    x: cx + (dst.width / 2) * 0.5 * 0.9,
    y: cy + (dst.height / 2) * 0.87 * 0.9,
  }
  await page.mouse.move(h!.x + h!.width / 2, h!.y + h!.height / 2)
  await page.mouse.down()
  await page.mouse.move(aim.x, aim.y, { steps: 16 })
  await page.waitForTimeout(100)
  const circle = await page.evaluate(() => {
    const c = document.querySelector(
      ".apollon-connection-snap-circle"
    ) as SVGCircleElement | null
    const ctm = c?.getScreenCTM()
    if (!c || !ctm) return null
    const m = new DOMPoint(
      c.cx.baseVal.value,
      c.cy.baseVal.value
    ).matrixTransform(ctm)
    return { x: m.x, y: m.y }
  })
  expect(
    circle,
    "a snap circle must appear off-cardinal on the oval"
  ).toBeTruthy()
  await page.mouse.up()
  await page.waitForTimeout(250)
  // The committed edge's endpoint on the oval matches where the circle showed.
  const end = await page.evaluate((c) => {
    const paths = Array.from(
      document.querySelectorAll(".react-flow__edge path.react-flow__edge-path")
    ) as SVGPathElement[]
    let best: { x: number; y: number } | null = null
    let bd = Infinity
    for (const p of paths) {
      const ctm = p.getScreenCTM()
      if (!ctm || p.getTotalLength() === 0) continue
      for (const len of [0, p.getTotalLength()]) {
        const q = p.getPointAtLength(len)
        const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
        const d = Math.hypot(m.x - c.x, m.y - c.y)
        if (d < bd) {
          bd = d
          best = { x: m.x, y: m.y }
        }
      }
    }
    return best
  }, circle)
  expect(
    Math.hypot(end!.x - circle!.x, end!.y - circle!.y),
    "the edge lands where the snap circle showed"
  ).toBeLessThan(6)
})

test("a use-case oval connection lands at the aimed angle, including diagonals (no drift)", async ({
  page,
}) => {
  // Regression: diagonal aims used to land ~12px off (routed through the nearest
  // bbox side); they must now land where aimed at every angle.
  await openFixtureInLocalEditor(page, useCaseFixture)
  await waitForCanvasReady(page)
  const g = await ovalGeom(page, INVENTORY)
  for (const deg of [45, 135, 225, 315]) {
    await openFixtureInLocalEditor(page, useCaseFixture)
    await waitForCanvasReady(page)
    const before = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".react-flow__edge")).map((e) =>
        e.getAttribute("data-id")
      )
    )
    await page.locator(`.react-flow__node[data-id="${BROWSE}"]`).hover()
    await page.waitForTimeout(120)
    const h = await page
      .locator(
        `.react-flow__node[data-id="${BROWSE}"] .react-flow__handle[data-handleid="bottom"]`
      )
      .first()
      .boundingBox()
    const th = (deg * Math.PI) / 180
    const aim = { x: g.cx + g.rx * Math.cos(th), y: g.cy + g.ry * Math.sin(th) }
    await page.mouse.move(h!.x + h!.width / 2, h!.y + h!.height / 2)
    await page.mouse.down()
    await page.mouse.move(aim.x, aim.y, { steps: 14 })
    await page.mouse.up()
    await page.waitForTimeout(250)
    const end = await page.evaluate(
      ({ b, cx, cy }) => {
        const now = Array.from(
          document.querySelectorAll(".react-flow__edge")
        ).map((e) => e.getAttribute("data-id"))
        const id = now.find((x) => !b.includes(x))
        if (!id) return null
        const p = document.querySelector(
          `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`
        ) as SVGPathElement | null
        const ctm = p?.getScreenCTM()
        if (!p || !ctm) return null
        const pts = [0, p.getTotalLength()].map((l) => {
          const q = p.getPointAtLength(l)
          const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
          return { x: m.x, y: m.y }
        })
        return Math.hypot(pts[0].x - cx, pts[0].y - cy) <
          Math.hypot(pts[1].x - cx, pts[1].y - cy)
          ? pts[0]
          : pts[1]
      },
      { b: before, cx: g.cx, cy: g.cy }
    )
    expect(end, `edge created aiming ${deg}°`).toBeTruthy()
    expect(
      Math.hypot(end!.x - aim.x, end!.y - aim.y),
      `${deg}° must land at the aimed point, not drift to a cardinal`
    ).toBeLessThan(8)
  }
})
