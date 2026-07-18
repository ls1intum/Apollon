import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import {
  readNodeRects,
  sampleEdgePath,
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
  edges: { id: string; source: string; target: string }[]
}

const seg = (a: Pt, b: Pt, c: Pt, d: Pt): boolean => {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const s = { x: d.x - c.x, y: d.y - c.y }
  const denom = r.x * s.y - r.y * s.x
  if (denom === 0) return false
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom
  return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98
}

const cornersOf = (pts: Pt[]): Pt[] => {
  if (pts.length < 3) return pts
  const out: Pt[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const c = pts[i + 1]
    if (Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) > 6)
      out.push(b)
  }
  out.push(pts[pts.length - 1])
  return out
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
  straightBroken: number
  offMax: number
}

async function measure(page: any, model: Model): Promise<Metrics> {
  const rects = await readNodeRects(page)
  const rectById = new Map(rects.map((r) => [r.id, r]))
  const paths = new Map<string, Pt[]>()
  for (const e of model.edges)
    paths.set(e.id, cornersOf(await sampleEdgePath(page, e.id, 4)))

  let corners = 0
  let straightBroken = 0
  let offMax = 0
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
    }
    if (t && pts[pts.length - 1]) {
      const o = offCentre(pts[pts.length - 1], t)
      if (o !== null) offMax = Math.max(offMax, o)
    }
  }

  let crossings = 0
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
        for (let b = 0; b < B.length - 1 && !hit; b++)
          if (seg(A[a], A[a + 1], B[b], B[b + 1])) {
            // ignore an intersection near a node both edges attach to
            const mid = {
              x: (A[a].x + A[a + 1].x) / 2,
              y: (A[a].y + A[a + 1].y) / 2,
            }
            const nearShared = sharedRects.some(
              (r) =>
                mid.x >= r.x - 48 &&
                mid.x <= r.x + r.width + 48 &&
                mid.y >= r.y - 48 &&
                mid.y <= r.y + r.height + 48
            )
            if (!nearShared) hit = true
          }
      if (hit) crossings++
    }

  return { corners, crossings, straightBroken, offMax }
}

// Per-diagram thresholds — the current best. Lower/raise as the router improves.
const CASES: {
  file: string
  maxCorners: number
  maxCrossings: number
  maxStraightBroken: number
  maxOffMax: number
}[] = [
  // Thresholds = the current committed baseline (the ratchet the router must hold or
  // beat). straightBroken and crossings are the load-bearing invariants; corners/offMax
  // are the softer aesthetic budget.
  // 47/48: the metric flags one convergence at shared node C as a "crossing"; it is the
  // current baseline (visually clean), so the gate holds it rather than chasing 0.
  {
    file: "routing-case-47.json",
    maxCorners: 3,
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
    maxOffMax: 0.5,
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
    maxCorners: 3,
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
  },
  // 56: an auto edge (B->C) next to a FULLY-PINNED edge (B->A). B->C must stay
  // straight despite its neighbour being hand-anchored — the partially-pinned case.
  {
    file: "routing-case-56.json",
    maxCorners: 3,
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
    maxCorners: 5,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.75,
  },
  {
    file: "routing-case-59.json",
    maxCorners: 4,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.8,
  },
  {
    file: "routing-case-60.json",
    maxCorners: 4,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.2,
  },
  // 61: a bidirectional A<->B pair. The bundle must NEST (two parallel Ls); an
  // arbitrary mirror made them cross and the router drew a loop around the crossing.
  // 62: every partner lies to one side of ClassA — the band must stay CENTRED.
  {
    file: "routing-case-61.json",
    maxCorners: 4,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.9,
  },
  {
    file: "routing-case-62.json",
    maxCorners: 4,
    maxCrossings: 0,
    maxStraightBroken: 0,
    maxOffMax: 0.2,
  },
]

for (const c of CASES) {
  test(`routing quality: ${c.file}`, async ({ page }) => {
    const model = fx(c.file) as Model
    await openFixtureInLocalEditor(page, model)
    await waitForCanvasReady(page)
    await page.waitForTimeout(400)
    const m = await measure(page, model)
    // eslint-disable-next-line no-console
    console.log(
      `QUALITY ${c.file} corners=${m.corners} crossings=${m.crossings} straightBroken=${m.straightBroken} offMax=${m.offMax.toFixed(2)}`
    )
    expect(m.crossings, "open-space crossings").toBeLessThanOrEqual(
      c.maxCrossings
    )
    expect(
      m.straightBroken,
      "straight-eligible edges not drawn straight"
    ).toBeLessThanOrEqual(c.maxStraightBroken)
    expect(m.corners, "total corners").toBeLessThanOrEqual(c.maxCorners)
    expect(m.offMax, "worst corner-jam").toBeLessThanOrEqual(c.maxOffMax)
  })
}
