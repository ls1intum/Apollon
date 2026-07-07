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

  const edgeIds = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll(".react-flow__edge[data-id]")).map(
        (e) => (e as HTMLElement).dataset.id as string
      )
    )
  const beforeIds = await edgeIds()

  await page.mouse.move(hb!.x + hb!.width / 2, hb!.y + hb!.height / 2)
  await page.mouse.down()
  await page.mouse.move(aim.x, aim.y, { steps: 16 })
  await page.mouse.up()

  // Isolate the edge just drawn — scanning ALL edges would let a pre-existing
  // edge's endpoint satisfy the assertion even if this connection never formed.
  let newEdgeId: string | undefined
  await expect
    .poll(
      async () => {
        newEdgeId = (await edgeIds()).find((cur) => !beforeIds.includes(cur))
        return newEdgeId
      },
      { message: "a connection to the oval must be created" }
    )
    .toBeTruthy()

  const g = await ovalGeom(page, INVENTORY)
  // The endpoint of the NEW edge closest to the Inventory oval's centre.
  const end = await page.evaluate(
    ({ geom, id }) => {
      const p = document.querySelector(
        `.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`
      ) as SVGPathElement | null
      const ctm = p?.getScreenCTM()
      if (!p || !ctm || p.getTotalLength() === 0) return null
      let best: { x: number; y: number } | null = null
      let bestD = Infinity
      for (const len of [0, p.getTotalLength()]) {
        const q = p.getPointAtLength(len)
        const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
        const d = Math.hypot(m.x - geom.cx, m.y - geom.cy)
        if (d < bestD) {
          bestD = d
          best = { x: m.x, y: m.y }
        }
      }
      return best
    },
    { geom: g, id: newEdgeId as string }
  )

  expect(end, "the new edge's endpoint must exist").toBeTruthy()
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
  // A container/parent node (activity, package, pool, subsystem …) is a valid
  // freeform reconnect target: an endpoint dragged onto one attaches to its
  // border instead of reverting.
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
  expect(before, "endpoint existed before reconnect").toBeTruthy()
  expect(after, "endpoint exists after reconnect").toBeTruthy()
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
  // A diagonal aim lands where aimed at every angle, not pulled toward the
  // nearest bounding-box side.
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

test("reconnecting between close nodes snaps to the nearest, not the top-most", async ({
  page,
}) => {
  // Regression: the drop resolver picked the top-most intersecting node, so with
  // two nodes close together an endpoint dragged over one could grab its
  // neighbour just because the neighbour was on top. It must pick the nearest.
  const base = readFixture("two-class-fresh-edge.json")
  const B = "32659cdc-bd03-46f3-918c-ee8dbba9c15b" // the edge's target node
  const C = "cccc0000-0000-0000-0000-000000000003"
  const cNode = JSON.parse(JSON.stringify(base.nodes[0]))
  cNode.id = C
  cNode.position = { x: 785, y: 370 } // B spans 640–800, C spans 785–945 (C on top)
  cNode.measured = { width: 160, height: 100 }
  cNode.data.name = "C"
  const fixture = { ...base, nodes: [...base.nodes, cNode] }
  const EDGE = base.edges[0].id

  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)
  const b = await nodeBox(page, B)
  const c = await nodeBox(page, C)
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
  // Drag the endpoint INSIDE B, just left of C's left edge — nearest is B.
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(c.x - 6, b.y + b.height / 2, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(200)

  const target = await page.evaluate((eid) => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) return null
    const p = JSON.parse(raw)
    const id = p.state.currentModelId
    return (p.state.models[id]?.model?.edges || []).find(
      (x: { id: string }) => x.id === eid
    )?.target
  }, EDGE)
  expect(
    target,
    "endpoint must snap to the nearer node B, not the top-most C"
  ).toBe(B)
})

test("a connection arc is grabbable when approached directly, not only via the body", async ({
  page,
}) => {
  // Regression: arcs protrude past the node box but only armed on node :hover,
  // so approaching one from OUTSIDE (without first crossing the body) left it
  // inert — "sometimes I can't grab the handle". Each side's arc must start a
  // connection when the pointer goes straight to it.
  const A = "95aac2b6-3e6b-4e6d-9201-52a498e6ea20"
  const B = "32659cdc-bd03-46f3-918c-ee8dbba9c15b"
  const edgeCount = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("persistenceModelStore")
      if (!raw) return 0
      const p = JSON.parse(raw)
      const id = p.state.currentModelId
      return (p.state.models[id]?.model?.edges || []).length
    })
  const sideArc = (
    a: { x: number; y: number; width: number; height: number },
    side: string
  ) =>
    ({
      top: { x: a.x + a.width / 2, y: a.y - 6 },
      bottom: { x: a.x + a.width / 2, y: a.y + a.height + 6 },
      left: { x: a.x - 6, y: a.y + a.height / 2 },
      right: { x: a.x + a.width + 6, y: a.y + a.height / 2 },
    })[side]!

  for (const side of ["top", "bottom", "left", "right"]) {
    await openFixtureInLocalEditor(page, readFixture("two-class-no-edge.json"))
    await waitForCanvasReady(page)
    const a = await nodeBox(page, A)
    const b = await nodeBox(page, B)
    const arc = sideArc(a, side)
    const before = await edgeCount()
    // Go STRAIGHT to the protruding arc — no prior hover over the node body.
    await page.mouse.move(arc.x, arc.y)
    await page.waitForTimeout(120)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 })
    await page.mouse.up()
    await expect
      .poll(edgeCount, {
        message: `${side} arc must be grabbable from outside`,
      })
      .toBe(before + 1)
  }
})

test("a selected node's protruding arc does not swallow clicks meant for an overlapping neighbour", async ({
  page,
}) => {
  // A selected node is elevated; its armed arcs must not eat clicks on a node
  // beneath them. Approaching the neighbour from its own side (not through the
  // selected node's body) must select the neighbour.
  const A = "95aac2b6-3e6b-4e6d-9201-52a498e6ea20"
  const B = "32659cdc-bd03-46f3-918c-ee8dbba9c15b"
  const fixture = readFixture("two-class-no-edge.json")
  fixture.nodes[0].position = { x: 400, y: 300 }
  fixture.nodes[1].position = { x: 520, y: 300 }
  fixture.nodes[0].measured = { width: 160, height: 100 }
  fixture.nodes[1].measured = { width: 160, height: 100 }
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)
  const a = await nodeBox(page, A)
  const b = await nodeBox(page, B)
  await page.mouse.click(a.x + 30, a.y + a.height / 2) // select A
  await page.waitForTimeout(120)
  await page.mouse.move(b.x + b.width + 80, b.y + b.height / 2) // clear A hover
  await page.waitForTimeout(120)
  // Click where A's RIGHT arc overlaps B's body, approaching from B's side.
  const px = a.x + a.width + 7
  const py = a.y + a.height / 2
  await page.mouse.move(px + 60, py)
  await page.mouse.move(px, py, { steps: 8 })
  await page.waitForTimeout(120)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(150)
  const selected = await page.evaluate(() =>
    document
      .querySelector(".react-flow__node.selected")
      ?.getAttribute("data-id")
  )
  expect(selected, "click must fall through to the neighbour B").toBe(B)
})

test("a BPMN annotation is not a connection target", async ({ page }) => {
  // bpmnAnnotation is mode "none" and its handles are not connectable ENDS, so
  // neither the freeform drop path nor React Flow's native valid-handle path can
  // attach an edge to it — while an association SOURCED at it still renders.
  const SOURCE = "cc3d4e5f-a6b7-4c8d-9e0f-1a2b3c4d5e6f" // a task
  const ANNOTATION = "c39d0e1f-a2b3-4c4d-5e6f-7a8b9c0d1e2f"
  await openFixtureInLocalEditor(page, readFixture("bpmn.json"))
  await waitForCanvasReady(page)
  const edgeCount = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("persistenceModelStore")
      if (!raw) return 0
      const p = JSON.parse(raw)
      const id = p.state.currentModelId
      return (p.state.models[id]?.model?.edges || []).length
    })

  // An existing association anchored to the annotation's handle still renders
  // (the handles are kept, only their connectable-end is off).
  await expect(
    page.locator(`.react-flow__edge[data-id="edge-annotation-validate"]`)
  ).toBeAttached()

  const before = await edgeCount()
  const src = await nodeBox(page, SOURCE)
  const ann = await nodeBox(page, ANNOTATION)
  // Grab the source task's bottom arc and drag onto the annotation's centre.
  await page.mouse.move(src.x + src.width / 2, src.y + src.height + 6)
  await page.waitForTimeout(120)
  await page.mouse.down()
  await page.mouse.move(ann.x + ann.width / 2, ann.y + ann.height / 2, {
    steps: 16,
  })
  await page.waitForTimeout(60)
  await page.mouse.up()
  await page.waitForTimeout(200)
  expect(await edgeCount(), "no edge attaches to a BPMN annotation").toBe(
    before
  )
})
