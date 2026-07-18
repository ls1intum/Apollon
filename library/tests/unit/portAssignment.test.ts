import { describe, it, expect } from "vitest"
import { Position, type Rect } from "@xyflow/react"
import {
  orderSideMembers,
  assignPorts,
  endKey,
  PORT_PITCH_PX,
  type SideMember,
  type EndRef,
} from "@/utils/geometry/portAssignment"

const rect = (x: number, y: number, w = 100, h = 60): Rect => ({
  x,
  y,
  width: w,
  height: h,
})
const centerOf = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })
const dir = (from: Rect, to: Rect) => {
  const c = centerOf(from)
  const p = centerOf(to)
  return { dx: p.x - c.x, dy: p.y - c.y }
}

describe("orderSideMembers — the nesting rule", () => {
  it("orders two edges leaving the Right side top→bottom by partner angle", () => {
    const b = rect(0, 0)
    // Two partners both to the right: one higher, one lower.
    const higher = rect(300, -200)
    const lower = rect(300, 200)
    const members: SideMember[] = [
      { edgeId: "toLower", end: "source", ...dir(b, lower) },
      { edgeId: "toHigher", end: "source", ...dir(b, higher) },
    ]
    const ordered = orderSideMembers(Position.Right, members)
    // Right side is ordered top→bottom, so the higher partner comes first.
    expect(ordered.map((m) => m.edgeId)).toEqual(["toHigher", "toLower"])
  })

  it("orders the Top side left→right by partner angle", () => {
    const b = rect(0, 0)
    const left = rect(-300, -200)
    const right = rect(300, -200)
    const members: SideMember[] = [
      { edgeId: "toRight", end: "source", ...dir(b, right) },
      { edgeId: "toLeft", end: "source", ...dir(b, left) },
    ]
    const ordered = orderSideMembers(Position.Top, members)
    expect(ordered.map((m) => m.edgeId)).toEqual(["toLeft", "toRight"])
  })

  it("is a total order — parallel siblings (same direction) break by edge id", () => {
    const b = rect(0, 0)
    const p = rect(300, 0)
    const members: SideMember[] = [
      { edgeId: "e3", end: "source", ...dir(b, p) },
      { edgeId: "e1", end: "source", ...dir(b, p) },
      { edgeId: "e2", end: "source", ...dir(b, p) },
    ]
    const ordered = orderSideMembers(Position.Right, members)
    expect(ordered.map((m) => m.edgeId)).toEqual(["e1", "e2", "e3"])
  })

  it("is transitive/consistent regardless of input order (determinism)", () => {
    const b = rect(0, 0)
    const partners = [
      rect(300, -150),
      rect(300, -30),
      rect(300, 90),
      rect(300, 210),
    ]
    const base: SideMember[] = partners.map((p, i) => ({
      edgeId: `e${i}`,
      end: "source",
      ...dir(b, p),
    }))
    const forward = orderSideMembers(Position.Right, base).map((m) => m.edgeId)
    const reversed = orderSideMembers(Position.Right, [...base].reverse()).map(
      (m) => m.edgeId
    )
    expect(reversed).toEqual(forward)
    expect(forward).toEqual(["e0", "e1", "e2", "e3"]) // top→bottom
  })
})

describe("assignPorts — forks, nesting, merges emerge", () => {
  const centerOfR = (r: Rect) => ({
    x: r.x + r.width / 2,
    y: r.y + r.height / 2,
  })
  const end = (
    edgeId: string,
    endName: "source" | "target",
    node: Rect,
    side: Position,
    partner: Rect
  ): EndRef => ({
    edgeId,
    end: endName,
    nodeId: `${edgeId}:${endName}`, // unique unless we override
    rect: node,
    side,
    partnerCenter: centerOfR(partner),
    // Distinct partner id per partner geometry, so these count as DIFFERENT-partner
    // edges (not parallel siblings) unless a test overrides partnerNodeId.
    partnerNodeId: `p:${partner.x},${partner.y}`,
    partnerRect: partner,
  })

  it("keeps the band CENTRED even when every partner lies to one side", () => {
    // d62: both partners sit far to one side, so an aimed position would drag the whole
    // band toward that corner. Partner direction must decide ORDER only — the band stays
    // centred, which makes corner-jam structurally impossible.
    const a = rect(0, 0, 160, 100) // Top side spans x 0..160, centre 80
    const farRight1 = rect(400, -300)
    const farRight2 = rect(600, -280)
    const ends: EndRef[] = [
      { ...end("e1", "source", a, Position.Top, farRight1), nodeId: "A" },
      { ...end("e2", "source", a, Position.Top, farRight2), nodeId: "A" },
    ]
    const ports = assignPorts(ends)
    const rs = [...ports.values()].map((p) => p.ratio).sort((x, y) => x - y)
    expect(rs).toHaveLength(2)
    // Symmetric about the side centre, not pulled toward the right corner.
    expect(rs[0] + rs[1]).toBeCloseTo(1.0, 5)
    for (const r of rs) {
      expect(r).toBeGreaterThan(0.35)
      expect(r).toBeLessThan(0.65)
    }
  })

  it("two same-side edges get distinct, symmetric, centred ports (nesting)", () => {
    const b = rect(0, 0)
    const higher = rect(300, -200)
    const lower = rect(300, 200)
    // both land on B's Right side
    const ends: EndRef[] = [
      { ...end("toLower", "source", b, Position.Right, lower), nodeId: "B" },
      { ...end("toHigher", "source", b, Position.Right, higher), nodeId: "B" },
    ]
    const ports = assignPorts(ends)
    const hi = ports.get(endKey("toHigher", "source"))!
    const lo = ports.get(endKey("toLower", "source"))!
    expect(hi.side).toBe(Position.Right)
    expect(lo.side).toBe(Position.Right)
    // higher partner → smaller ratio (nearer the top of the Right side)
    expect(hi.ratio).toBeLessThan(lo.ratio)
    // symmetric about centre, and neither at a corner
    expect(hi.ratio + lo.ratio).toBeCloseTo(1.0, 5)
    expect(hi.ratio).toBeGreaterThan(0.25)
    expect(lo.ratio).toBeLessThan(0.75)
  })

  it("aligns parallel siblings on a shared straight band (no steps)", () => {
    // Two edges between the SAME node pair whose facing sides oppose and overlap.
    // The two nodes' centres differ, but each sibling must be a STRAIGHT line, so the
    // source port and target port of one edge must share the same absolute coordinate.
    const top = rect(165, -575) // bottom side spans x [165,325]
    const bottom = rect(110, -375) // top side spans x [110,270]
    // Each edge contributes a source end on top.Bottom and a target end on bottom.Top.
    const mk = (id: string): EndRef[] => [
      {
        edgeId: id,
        end: "source",
        nodeId: "top",
        rect: top,
        side: Position.Bottom,
        partnerCenter: centerOfR(bottom),
        partnerNodeId: "bottom",
        partnerRect: bottom,
      },
      {
        edgeId: id,
        end: "target",
        nodeId: "bottom",
        rect: bottom,
        side: Position.Top,
        partnerCenter: centerOfR(top),
        partnerNodeId: "top",
        partnerRect: top,
      },
    ]
    const ports = assignPorts([...mk("e1"), ...mk("e2")])
    // Absolute x of each end = node.x + ratio*width. For a straight line the source
    // and target x must match per edge.
    const absX = (edgeId: string, end: "source" | "target", node: Rect) => {
      const p = ports.get(endKey(edgeId, end))!
      return node.x + p.ratio * node.width
    }
    for (const id of ["e1", "e2"]) {
      expect(absX(id, "source", top)).toBeCloseTo(absX(id, "target", bottom), 5)
    }
    // and the two siblings occupy DIFFERENT lanes
    expect(absX("e1", "source", top)).not.toBeCloseTo(
      absX("e2", "source", top),
      3
    )
  })

  it("centres a lone arm on its side (a distributed fork, no sibling to nest)", () => {
    const b = rect(0, 0)
    // A fork onto two different sides → each side has ONE member → dead centre.
    const ends: EndRef[] = [
      {
        ...end("toRight", "source", b, Position.Right, rect(300, 0)),
        nodeId: "B",
      },
      {
        ...end("toBottom", "source", b, Position.Bottom, rect(0, 300)),
        nodeId: "B",
      },
    ]
    const ports = assignPorts(ends)
    expect(ports.get(endKey("toRight", "source"))).toEqual({
      side: Position.Right,
      ratio: 0.5,
    })
    expect(ports.get(endKey("toBottom", "source"))).toEqual({
      side: Position.Bottom,
      ratio: 0.5,
    })
  })

  it("pins four-centre crowded ports to the side midpoint (0.5)", () => {
    const b = rect(0, 0)
    const ends: EndRef[] = [
      {
        ...end("e1", "source", b, Position.Right, rect(300, -100)),
        nodeId: "B",
        fourCenter: true,
      },
      {
        ...end("e2", "source", b, Position.Right, rect(300, 100)),
        nodeId: "B",
        fourCenter: true,
      },
    ]
    const ports = assignPorts(ends)
    expect(ports.get(endKey("e1", "source"))!.ratio).toBe(0.5)
    expect(ports.get(endKey("e2", "source"))!.ratio).toBe(0.5)
  })

  it("is order-independent (determinism across peers)", () => {
    const b = rect(0, 0)
    const partners = [rect(300, -180), rect(300, -40), rect(300, 120)]
    const mk = (): EndRef[] =>
      partners.map((p, i) => ({
        ...end(`e${i}`, "source", b, Position.Right, p),
        nodeId: "B",
      }))
    const a = assignPorts(mk())
    const bb = assignPorts([...mk()].reverse())
    for (const k of a.keys()) expect(bb.get(k)).toEqual(a.get(k))
  })
})

describe("orderSideMembers is a deterministic total order", () => {
  const sides = [Position.Top, Position.Bottom, Position.Left, Position.Right]
  it("gives the same order whatever the input order, for any directions", () => {
    // A pairwise comparator that isn't a true total order sorts differently on
    // different engines and differently under a shuffle — the exact hazard that
    // broke cross-peer agreement before. So the scalar key must survive a shuffle.
    let seed = 12345
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff // LCG, no Math.random
      return seed
    }
    for (const side of sides) {
      for (let trial = 0; trial < 50; trial++) {
        const n = 2 + (next() % 6)
        const members: SideMember[] = Array.from({ length: n }, (_, i) => ({
          edgeId: `e${i}`,
          end: "source",
          dx: (next() % 800) - 400,
          dy: (next() % 800) - 400,
        }))
        const order = orderSideMembers(side, members).map((m) => m.edgeId)
        // Every one of the n! permutations of the input must sort to `order`.
        for (let p = 0; p < 20; p++) {
          const shuffled = [...members]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = next() % (i + 1)
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
          }
          expect(orderSideMembers(side, shuffled).map((m) => m.edgeId)).toEqual(
            order
          )
        }
      }
    }
  })
})

describe("assignPorts is robust to degenerate geometry", () => {
  const rectOf = (x: number, y: number, w: number, h: number): Rect => ({
    x,
    y,
    width: w,
    height: h,
  })
  it("returns finite ratios for a zero-height node (unmeasured), never NaN", () => {
    // A node still awaiting measurement has a zero-length side. Two edges landing on
    // it take the multi-edge band, whose position divides by that length — it must not
    // divide by zero and emit NaN ratios that become NaN endpoints and trap the router.
    const z = rectOf(300, 150, 160, 0)
    const ends: EndRef[] = [
      {
        edgeId: "e1",
        end: "target",
        nodeId: "z",
        rect: z,
        side: Position.Left,
        partnerCenter: { x: 80, y: 50 },
        partnerNodeId: "a",
        partnerRect: rectOf(0, 0, 160, 100),
      },
      {
        edgeId: "e2",
        end: "target",
        nodeId: "z",
        rect: z,
        side: Position.Left,
        partnerCenter: { x: 80, y: 350 },
        partnerNodeId: "b",
        partnerRect: rectOf(0, 300, 160, 100),
      },
    ]
    for (const p of assignPorts(ends).values())
      expect(Number.isFinite(p.ratio)).toBe(true)
  })
})
