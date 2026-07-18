import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Geometry-integrity coverage for line jumps, asserted against the ACTUAL
 * rendered SVG of every edge — independent of any internal model.
 *
 * Two invariants must hold in every diagram and at every moment of a drag:
 *   1. Every bridge arc sits on a real crossing of two edges (no arc floating
 *      in empty space — the deployment-diagram regression).
 *   2. Every real orthogonal crossing has exactly one bridge (nothing missed).
 *
 * The check parses each edge's `d`, reconstructs its polyline + bridge apexes,
 * computes the true crossings, and compares — so it works for any edge type
 * (step, straight-path, container-child) without hard-coded coordinates.
 */

const __dirname2 = path.dirname(fileURLToPath(import.meta.url))
const load = (name: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname2, "..", "fixtures", name), "utf-8")
  ) as Record<string, unknown>

type P = { x: number; y: number }
type Seg = { a: P; b: P; horizontal: boolean; vertical: boolean }

function parsePath(d: string): { verts: P[]; bridges: P[] } {
  const toks = d.match(/[MLQ]|-?[\d.]+/g) ?? []
  const verts: P[] = []
  const bridges: P[] = []
  let i = 0
  let cmd = ""
  let prev: P | null = null
  const num = () => Number(toks[i++])
  while (i < toks.length) {
    const t = toks[i]
    if (t === "M" || t === "L" || t === "Q") {
      cmd = t
      i++
    }
    if (cmd === "M" || cmd === "L") {
      const p = { x: num(), y: num() }
      verts.push(p)
      prev = p
    } else if (cmd === "Q") {
      const c = { x: num(), y: num() }
      const end = { x: num(), y: num() }
      if (prev) {
        const horizontal = Math.abs(prev.y - end.y) < 1
        bridges.push(horizontal ? { x: c.x, y: prev.y } : { x: prev.x, y: c.y })
      }
      verts.push(end)
      prev = end
    } else i++
  }
  return { verts, bridges }
}

function toSegments(verts: P[]): Seg[] {
  const segs: Seg[] = []
  for (let i = 0; i < verts.length - 1; i++) {
    const a = verts[i]
    const b = verts[i + 1]
    segs.push({
      a,
      b,
      horizontal: Math.abs(a.y - b.y) < 1.5,
      vertical: Math.abs(a.x - b.x) < 1.5,
    })
  }
  return segs
}

function interiorCrossing(h: Seg, v: Seg, margin = 6): P | null {
  if (!h.horizontal || !v.vertical) return null
  const x = (v.a.x + v.b.x) / 2
  const y = (h.a.y + h.b.y) / 2
  if (
    x < Math.min(h.a.x, h.b.x) + margin ||
    x > Math.max(h.a.x, h.b.x) - margin
  )
    return null
  if (
    y < Math.min(v.a.y, v.b.y) + margin ||
    y > Math.max(v.a.y, v.b.y) - margin
  )
    return null
  return { x, y }
}

const near = (a: P, b: P, tol = 5) => Math.hypot(a.x - b.x, a.y - b.y) < tol

async function checkIntegrity(page: Page) {
  const loc = page.locator(".react-flow__edge")
  const n = await loc.count()
  const edges: { id: string; verts: P[]; bridges: P[] }[] = []
  for (let i = 0; i < n; i++) {
    const e = loc.nth(i)
    const id = (await e.getAttribute("data-id")) ?? `#${i}`
    const d = await e
      .locator(".react-flow__edge-path")
      .first()
      .getAttribute("d")
    if (d) edges.push({ id, ...parsePath(d) })
  }

  const crossings: P[] = []
  for (let a = 0; a < edges.length; a++)
    for (let b = 0; b < edges.length; b++) {
      if (a === b) continue
      for (const h of toSegments(edges[a].verts))
        for (const v of toSegments(edges[b].verts)) {
          const c = interiorCrossing(h, v)
          if (c && !crossings.some((r) => near(r, c, 3))) crossings.push(c)
        }
    }

  const bridges = edges.flatMap((e) =>
    e.bridges.map((p) => ({ ...p, id: e.id }))
  )
  const floating = bridges.filter((p) => !crossings.some((c) => near(c, p)))
  const unmarked = crossings.filter((c) => !bridges.some((p) => near(c, p)))
  return { crossings, bridges, floating, unmarked }
}

async function loadFixture(page: Page, name: string) {
  await openFixtureInLocalEditor(page, load(name))
  await waitForCanvasReady(page)
}

test.describe("Line-jump geometry integrity", () => {
  // Each fixture must satisfy both invariants. deployment / use-case use
  // straight-path / diagonal edges — they must produce NO floating bridges
  // (the exact regression where re-derived geometry hallucinated crossings).
  // `mustCross` fixtures are designed to contain crossings — if one stops producing
  // any, the two `[]` assertions below pass vacuously, so we require the crossings to
  // exist. The others exercise the no-false-bridge path and legitimately have none.
  for (const { fixture, mustCross } of [
    { fixture: "line-jump-cross.json", mustCross: true },
    { fixture: "line-jump-complex.json", mustCross: true },
    { fixture: "deployment-diagram.json", mustCross: false },
    { fixture: "use-case-diagram.json", mustCross: false },
    { fixture: "class-diagram.json", mustCross: false },
  ]) {
    test(`${fixture}: every bridge sits on a real crossing`, async ({
      page,
    }) => {
      await loadFixture(page, fixture)
      const r = await checkIntegrity(page)
      if (mustCross)
        expect(
          r.crossings.length,
          "fixture no longer produces crossings — the checks below would pass vacuously"
        ).toBeGreaterThan(0)
      expect(r.floating, "bridges floating off any crossing").toEqual([])
      expect(r.unmarked, "real crossings with no bridge").toEqual([])
    })
  }

  test("bridges stay on the crossings while a node is dragged around", async ({
    page,
  }) => {
    await loadFixture(page, "line-jump-complex.json")
    const node = page.locator('.react-flow__node[data-id="B"]')
    const box = await node.boundingBox()
    if (!box) throw new Error("node B not found")
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    for (const [dx, dy] of [
      [60, 0],
      [60, -80],
      [-40, 40],
    ]) {
      await page.mouse.move(cx + dx, cy + dy, { steps: 8 })
      await page.waitForTimeout(160)
      const r = await checkIntegrity(page)
      expect(r.floating, `floating bridge mid-drag @(${dx},${dy})`).toEqual([])
      expect(r.unmarked, `unmarked crossing mid-drag @(${dx},${dy})`).toEqual(
        []
      )
    }
    await page.mouse.up()
    await page.waitForTimeout(200)
    const settled = await checkIntegrity(page)
    expect(settled.floating).toEqual([])
    expect(settled.unmarked).toEqual([])
  })
})
