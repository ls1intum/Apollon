import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import {
  readEdgePathVertices,
  readNodeRects,
  type Pt,
  type Rect,
} from "../helpers/edgeGeometry"

/**
 * METRIC quality gate for auto edge routing — the ratchet the router must not
 * regress. Unlike geometry-exact unit assertions, this measures the aesthetics we
 * actually care about on the REAL problem diagrams (routing-case-*), so the router
 * can be rewritten freely as long as the numbers hold or improve:
 *   - corners: total direction changes across all edges (fewer = better)
 *   - crossings: edge pairs intersecting in open space, NOT at a shared node
 *   - straightBroken: straight-ELIGIBLE edges (partner on the directly-opposing,
 *     overlapping side) that are NOT actually drawn straight (should be 0)
 *   - offMax: worst anchor distance from its side centre (corner-jam)
 *
 * Thresholds are the current best-known values; tighten them as the router improves.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const fx = (f: string) =>
  JSON.parse(fs.readFileSync(path.join(__d, "..", "fixtures", f), "utf-8"))

type Model = {
  id: string
  nodes: { id: string }[]
  edges: { id: string; source: string; target: string; type?: string }[]
}

const crossingPoint = (a: Pt, b: Pt, c: Pt, d: Pt): Pt | null => {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const s = { x: d.x - c.x, y: d.y - c.y }
  const denom = r.x * s.y - r.y * s.x
  if (denom === 0) return null
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom
  return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98
    ? { x: a.x + t * r.x, y: a.y + t * r.y }
    : null
}

const collinearOverlap = (a: Pt, b: Pt, c: Pt, d: Pt) => {
  const horizontalA = Math.abs(a.y - b.y) < 1
  const horizontalB = Math.abs(c.y - d.y) < 1
  const verticalA = Math.abs(a.x - b.x) < 1
  const verticalB = Math.abs(c.x - d.x) < 1
  if (horizontalA && horizontalB && Math.abs(a.y - c.y) < 1) {
    const lo = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
    const hi = Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x))
    return hi > lo
      ? { length: hi - lo, at: { x: (lo + hi) / 2, y: a.y } }
      : null
  }
  if (verticalA && verticalB && Math.abs(a.x - c.x) < 1) {
    const lo = Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
    const hi = Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))
    return hi > lo
      ? { length: hi - lo, at: { x: a.x, y: (lo + hi) / 2 } }
      : null
  }
  return null
}

const rangesOverlap = (aLo: number, aHi: number, bLo: number, bHi: number) =>
  Math.min(aHi, bHi) - Math.max(aLo, bLo) > 12 // needs real overlap, not a touch

/** Is the edge straight-eligible: source & target rects overlap on one axis and
 * are separated on the other (so a single straight line can join them)? */
const straightEligible = (s: Rect, t: Rect): boolean => {
  const xOverlap = rangesOverlap(s.x, s.x + s.width, t.x, t.x + t.width)
  const yOverlap = rangesOverlap(s.y, s.y + s.height, t.y, t.y + t.height)
  const xApart = s.x + s.width <= t.x + 1 || t.x + t.width <= s.x + 1
  const yApart = s.y + s.height <= t.y + 1 || t.y + t.height <= s.y + 1
  return (xOverlap && yApart) || (yOverlap && xApart)
}

const offCentre = (p: Pt, r: Rect): number | null => {
  const m = 6
  const onSideV =
    Math.abs(p.x - r.x) <= m || Math.abs(p.x - (r.x + r.width)) <= m
  const onSideH =
    Math.abs(p.y - r.y) <= m || Math.abs(p.y - (r.y + r.height)) <= m
  if (onSideV) return Math.abs(p.y - (r.y + r.height / 2)) / (r.height / 2)
  if (onSideH) return Math.abs(p.x - (r.x + r.width / 2)) / (r.width / 2)
  return null
}

type Metrics = {
  corners: number
  crossings: number
  overlapPx: number
  straightBroken: number
  offMax: number
  portCentroidError: number
  portGapImbalance: number
  sharedPortGapImbalance: number
}

async function measure(page: Page, model: Model): Promise<Metrics> {
  const rects = await readNodeRects(page)
  const rectById = new Map(rects.map((r) => [r.id, r]))
  const paths = new Map<string, Pt[]>()
  for (const e of model.edges)
    paths.set(e.id, await readEdgePathVertices(page, e.id))
  let corners = 0
  let straightBroken = 0
  let offMax = 0
  const portGroups = new Map<string, number[]>()
  const recordPort = (nodeId: string, point: Pt, rect: Rect) => {
    const m = 6
    let side: string | null = null
    let ratio = 0.5
    if (Math.abs(point.x - rect.x) <= m) {
      side = "left"
      ratio = (point.y - rect.y) / rect.height
    } else if (Math.abs(point.x - (rect.x + rect.width)) <= m) {
      side = "right"
      ratio = (point.y - rect.y) / rect.height
    } else if (Math.abs(point.y - rect.y) <= m) {
      side = "top"
      ratio = (point.x - rect.x) / rect.width
    } else if (Math.abs(point.y - (rect.y + rect.height)) <= m) {
      side = "bottom"
      ratio = (point.x - rect.x) / rect.width
    }
    if (!side) return
    const key = `${nodeId}|${side}`
    const group = portGroups.get(key)
    if (group) group.push(ratio)
    else portGroups.set(key, [ratio])
  }
  for (const e of model.edges) {
    const pts = paths.get(e.id) ?? []
    const c = Math.max(0, pts.length - 2)
    corners += c
    const s = rectById.get(e.source)
    const t = rectById.get(e.target)
    if (s && t && straightEligible(s, t) && c > 0) straightBroken++
    if (s && pts[0]) {
      const o = offCentre(pts[0], s)
      if (o !== null) offMax = Math.max(offMax, o)
      recordPort(e.source, pts[0], s)
    }
    if (t && pts[pts.length - 1]) {
      const o = offCentre(pts[pts.length - 1], t)
      if (o !== null) offMax = Math.max(offMax, o)
      recordPort(e.target, pts[pts.length - 1], t)
    }
  }

  let portCentroidError = 0
  let portGapImbalance = 0
  let sharedPortGapImbalance = 0
  for (const ratios of portGroups.values()) {
    ratios.sort((a, b) => a - b)
    if (ratios.length >= 2) {
      const mean = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
      portCentroidError = Math.max(portCentroidError, 2 * Math.abs(mean - 0.5))
    }
    const actualGaps = [
      ratios[0],
      ...ratios.slice(1).map((ratio, index) => ratio - ratios[index]),
      1 - ratios[ratios.length - 1],
    ]
    const idealGap = 1 / (ratios.length + 1)
    const imbalance = actualGaps.reduce(
      (sum, gap) => sum + Math.abs(gap - idealGap),
      0
    )
    portGapImbalance = Math.max(portGapImbalance, imbalance)
    if (ratios.length >= 2)
      sharedPortGapImbalance = Math.max(sharedPortGapImbalance, imbalance)
  }
  let crossings = 0
  let overlapPx = 0
  for (let i = 0; i < model.edges.length; i++)
    for (let j = i + 1; j < model.edges.length; j++) {
      const eA = model.edges[i]
      const eB = model.edges[j]
      const shared = [eA.source, eA.target].filter(
        (n) => n === eB.source || n === eB.target
      )
      const sharedRects = shared
        .map((n) => rectById.get(n))
        .filter(Boolean) as Rect[]
      const A = paths.get(eA.id) ?? []
      const B = paths.get(eB.id) ?? []
      let hit = false
      for (let a = 0; a < A.length - 1 && !hit; a++)
        for (let b = 0; b < B.length - 1 && !hit; b++) {
          const crossing = crossingPoint(A[a], A[a + 1], B[b], B[b + 1])
          const overlap = collinearOverlap(A[a], A[a + 1], B[b], B[b + 1])
          // ignore an intersection near a node both edges attach to
          const at = crossing ?? overlap?.at
          if (!at) continue
          const nearShared = sharedRects.some(
            (r) =>
              at.x >= r.x - 48 &&
              at.x <= r.x + r.width + 48 &&
              at.y >= r.y - 48 &&
              at.y <= r.y + r.height + 48
          )
          if (!nearShared && crossing) hit = true
          if (!nearShared && overlap && overlap.length > 4)
            overlapPx += overlap.length
        }
      if (hit) crossings++
    }

  return {
    corners,
    crossings,
    overlapPx: Math.round(overlapPx),
    straightBroken,
    offMax,
    portCentroidError,
    portGapImbalance,
    sharedPortGapImbalance,
  }
}

// Per-diagram thresholds — the current best. Lower/raise as the router improves.
const CASES: {
  file: string
  maxCorners: number
  maxCrossings: number
  maxOverlapPx?: number
  maxStraightBroken: number
  maxOffMax: number
  maxPortCentroidError?: number
  maxPortGapImbalance?: number
  maxSharedPortGapImbalance?: number
}[] = [
  // Thresholds = the current committed baseline (the ratchet the router must hold or
  // beat). straightBroken and crossings are the load-bearing invariants; corners/offMax
  // are the softer aesthetic budget.
  // The corner sampler merges the two ends of a short rounded SVG turn, so these
  // budgets represent visual bends rather than path tessellation details.
  {
    file: "routing-case-47.json",
    maxCorners: 2,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.2,
  },
  {
    file: "routing-case-48.json",
    maxCorners: 2,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.2,
  },
  {
    file: "routing-case-49.json",
    maxCorners: 2,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.45,
  },
  {
    file: "routing-case-50.json",
    maxCorners: 2,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.6,
  },
  {
    file: "routing-case-51.json",
    maxCorners: 0,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.55,
    maxPortCentroidError: 0.35,
  },
  {
    file: "routing-case-53.json",
    maxCorners: 1,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.5,
  },
  {
    file: "routing-case-54.json",
    maxCorners: 2,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.2,
  },
  {
    file: "routing-case-55.json",
    maxCorners: 1,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.85,
    maxPortCentroidError: 0.26,
  },
  // 56: an auto edge (B->C) next to a FULLY-PINNED edge (B->A). B->C must stay
  // straight despite its neighbour being hand-anchored — the partially-pinned case.
  {
    file: "routing-case-56.json",
    maxCorners: 2,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.55,
  },
  // 57: ClassB has one edge on top and one on bottom, each the LONE arm on its side.
  // Both must sit at the side CENTRE (offMax low), not aimed off toward their far-left
  // partners — a lone arm's position does not change its corner count.
  {
    file: "routing-case-57.json",
    maxCorners: 2,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.35,
  },
  // 58/59/60: reported live. 58 — a same-partner BUNDLE must stay centred on the side
  // (aim orders nothing when every edge goes to one partner). 60 — a TIGHT overlap must
  // not count as "straight": the step costs more than switching a side for a clean L.
  {
    file: "routing-case-58.json",
    maxCorners: 3,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.75,
    // On a 100px side the closest 5px-grid thirds are 35/30/35px.
    maxSharedPortGapImbalance: 0.07,
  },
  {
    file: "routing-case-59.json",
    maxCorners: 3,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.8,
  },
  {
    file: "routing-case-60.json",
    maxCorners: 3,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.2,
  },
  // 61: a bidirectional A<->B pair. The bundle must NEST (two parallel Ls); an
  // arbitrary mirror made them cross and the router drew a loop around the crossing.
  // 62: every partner lies to one side of ClassA — the band must stay CENTRED.
  {
    file: "routing-case-61.json",
    maxCorners: 3,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.9,
    // One member must stay in a 20px straight overlap band. Even thirds are not
    // feasible without breaking that zero-bend route; the other member nests beside it.
    maxPortCentroidError: 0.45,
    maxSharedPortGapImbalance: 0.55,
  },
  {
    file: "routing-case-62.json",
    maxCorners: 3,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.3,
  },
  // 63: ports spread EVENLY across a shared side (equal stretches between and around),
  // so two connectors split the side into three balanced segments.
  {
    file: "routing-case-63.json",
    maxCorners: 3,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.8,
    maxSharedPortGapImbalance: 0.05,
  },
  // 64/67: inheritance fans — several sub-classes on one super-class. They get no
  // special treatment; a user who wants the arrowheads merged pins them. These guard
  // that the fan still routes cleanly (few corners, nothing crossing).
  {
    file: "routing-case-64.json",
    maxCorners: 4,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.5,
    maxPortCentroidError: 0.14,
  },
  {
    file: "routing-case-67.json",
    maxCorners: 2,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.85,
    maxPortCentroidError: 0.41,
  },

  {
    file: "routing-case-69.json",
    maxCorners: 3,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.8,
    maxPortCentroidError: 0.3,
  },
  {
    file: "routing-case-71.json",
    maxCorners: 5,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.35,
  },
  {
    file: "routing-case-72.json",
    maxCorners: 3,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.55,
  },
  // 74/75: a cross-edge must route AROUND a straight "wall" edge in the middle — side
  // assignment now dodges the blocking node and prices the crossing, so 0 crossings.
  {
    file: "routing-case-74.json",
    maxCorners: 4,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.55,
  },
  {
    file: "routing-case-75.json",
    maxCorners: 4,
    maxCrossings: 0,
    maxStraightBroken: 0,
    // The two right-side arrivals must nest below the outer route to keep both the
    // central wall and each other crossing-free. Penalising that necessary local
    // shift as if it were a freely balanceable fan rewards an eight-corner zigzag.
    maxOffMax: 0.8,
    maxPortCentroidError: 0.54,
  },
  {
    file: "routing-case-91.json",
    maxCorners: 4,
    maxCrossings: 0,
    maxStraightBroken: 1,
    maxOffMax: 0.05,
    maxPortGapImbalance: 0.05,
  },
]
for (const c of CASES) {
  test(`routing quality: ${c.file}`, async ({ page }) => {
    const model = fx(c.file) as Model
    await openFixtureInLocalEditor(page, model)
    await waitForCanvasReady(page)
    await page.waitForTimeout(400)
    const m = await measure(page, model)
    console.log(
      `QUALITY ${c.file} corners=${m.corners} crossings=${m.crossings} overlapPx=${m.overlapPx} straightBroken=${m.straightBroken} offMax=${m.offMax.toFixed(2)} centroid=${m.portCentroidError.toFixed(2)} gaps=${m.portGapImbalance.toFixed(2)} sharedGaps=${m.sharedPortGapImbalance.toFixed(2)}`
    )
    expect(m.crossings, "open-space crossings").toBeLessThanOrEqual(
      c.maxCrossings
    )
    expect(m.overlapPx, "open-space collinear overlap").toBeLessThanOrEqual(
      c.maxOverlapPx ?? 0
    )
    expect(
      m.straightBroken,
      "straight-eligible edges not drawn straight"
    ).toBeLessThanOrEqual(c.maxStraightBroken)
    expect(m.corners, "total corners").toBeLessThanOrEqual(c.maxCorners)
    expect(m.offMax, "worst corner-jam").toBeLessThanOrEqual(c.maxOffMax)
    expect(
      m.portCentroidError,
      "shared-side port centroid imbalance"
    ).toBeLessThanOrEqual(c.maxPortCentroidError ?? 0.1)
    expect(m.portGapImbalance, "n+1 side-gap imbalance").toBeLessThanOrEqual(
      c.maxPortGapImbalance ?? 1
    )
    expect(
      m.sharedPortGapImbalance,
      "shared-side n+1 gap imbalance"
    ).toBeLessThanOrEqual(c.maxSharedPortGapImbalance ?? 1)
  })
}
