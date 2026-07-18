import { describe, it, expect } from "vitest"
import { Position, type Rect } from "@xyflow/react"
import {
  facingSide,
  orderSideMembers,
  packAlongSide,
  sideAxisLength,
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

describe("facingSide", () => {
  it("picks the side whose axis the partner is most displaced along", () => {
    const a = rect(0, 0)
    expect(facingSide(a, centerOf(rect(300, 0)))).toBe(Position.Right)
    expect(facingSide(a, centerOf(rect(-300, 0)))).toBe(Position.Left)
    expect(facingSide(a, centerOf(rect(0, 300)))).toBe(Position.Bottom)
    expect(facingSide(a, centerOf(rect(0, -300)))).toBe(Position.Top)
  })

  it("weighs displacement by the node's half-extent (wide node)", () => {
    // A very wide, short node: a partner slightly up and to the side still exits
    // the top, because the vertical half-extent is tiny.
    const wide = rect(0, 0, 400, 20)
    // partner at dx=+120, dy=-40 from centre. |dx|·h=120·10=1200; |dy|·w=40·200=8000 → vertical.
    expect(facingSide(wide, { x: 200 + 120, y: 10 - 40 })).toBe(Position.Top)
  })
})

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

describe("packAlongSide — aimed-but-centred, ordered, never at corners", () => {
  const centre = (axis: number) => axis / 2

  it("keeps evenly-aimed ports near centre, NOT jammed to the corners", () => {
    // Two ports both aimed at the side centre: they land a min gap apart, near the
    // middle — the user's complaint (anchors flung to the edge) must not recur.
    const axis = 200
    const ratios = packAlongSide(
      [centre(axis), centre(axis)],
      axis,
      PORT_PITCH_PX
    )
    for (const r of ratios) {
      expect(r).toBeGreaterThan(0.3)
      expect(r).toBeLessThan(0.7)
    }
  })

  it("preserves the given order and a minimum gap", () => {
    const axis = 200
    const ratios = packAlongSide([40, 60, 80], axis, PORT_PITCH_PX)
    expect(ratios[0]).toBeLessThan(ratios[1])
    expect(ratios[1]).toBeLessThan(ratios[2])
    const gapPx = Math.min(PORT_PITCH_PX, axis - 2 * Math.min(10, axis * 0.3))
    // consecutive ports are at least ~the fitted gap apart (allow float slack)
    expect((ratios[1] - ratios[0]) * axis).toBeGreaterThanOrEqual(
      Math.min(PORT_PITCH_PX, gapPx) - 1e-6
    )
  })

  it("never places a port in the corner margin, even when crowded", () => {
    const axis = 60
    const aims = [0, 12, 24, 36, 48, 60] // spanning corner to corner
    const ratios = packAlongSide(aims, axis, PORT_PITCH_PX)
    const marginRatio = Math.min(2 * 5, axis * 0.3) / axis
    for (const r of ratios) {
      expect(r).toBeGreaterThanOrEqual(marginRatio - 1e-9)
      expect(r).toBeLessThanOrEqual(1 - marginRatio + 1e-9)
    }
  })

  it("aims a displaced set toward its targets while holding the min gap", () => {
    // Two ports both aimed high (small offsets) still separate by the gap and sit in
    // the aimed half, not centred.
    const axis = 200
    const ratios = packAlongSide([30, 45], axis, PORT_PITCH_PX)
    expect(ratios[0]).toBeLessThan(0.5)
    expect(ratios[1]).toBeLessThan(0.5)
    expect(ratios[1]).toBeGreaterThan(ratios[0])
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

describe("orderSideMembers — transitivity + determinism (P0 hard constraint)", () => {
  // Brute-force: the precomputed scalar key must give a total, transitive order
  // for ANY partner directions (incl. partners behind a cost-chosen perpendicular
  // side), independent of input order — the property the old pairwise comparator
  // violated. Deterministic pseudo-random inputs (no Math.random).
  const sides = [Position.Top, Position.Bottom, Position.Left, Position.Right]
  it("is a strict total order for arbitrary directions on every side", () => {
    let seed = 12345
    const next = () => {
      // LCG — deterministic, engine-independent.
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed
    }
    for (const side of sides) {
      for (let trial = 0; trial < 50; trial++) {
        const members: SideMember[] = []
        const n = 2 + (next() % 6)
        for (let i = 0; i < n; i++) {
          members.push({
            edgeId: `e${i}`,
            end: "source",
            dx: (next() % 800) - 400,
            dy: (next() % 800) - 400,
          })
        }
        const a = orderSideMembers(side, members).map((m) => m.edgeId)
        const b = orderSideMembers(side, [...members].reverse()).map(
          (m) => m.edgeId
        )
        // order-independent (determinism)
        expect(b).toEqual(a)
        // a genuine permutation with no dropped/duplicated members (totality)
        expect(new Set(a).size).toBe(members.length)
      }
    }
  })
})

describe("sideAxisLength", () => {
  it("returns height for vertical sides, width for horizontal", () => {
    const r = rect(0, 0, 120, 80)
    expect(sideAxisLength(Position.Left, r)).toBe(80)
    expect(sideAxisLength(Position.Right, r)).toBe(80)
    expect(sideAxisLength(Position.Top, r)).toBe(120)
    expect(sideAxisLength(Position.Bottom, r)).toBe(120)
  })
})
