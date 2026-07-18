import { test } from "@playwright/test"
import { openLocalWithPerf, readPerf, dragNodeBy } from "./perfHelpers"

/**
 * Wall-clock drag-lag benchmark across diagram sizes. It asserts NOTHING — wall
 * time is machine-specific, which is what the expansion-count budgets in
 * edge-routing.spec.ts are for. It exists to profile scaling, and prints a table
 * of per-frame solve cost.
 *
 * Because it cannot fail, it is excluded from the `perf` projects that CI runs
 * (see playwright.config.ts) — otherwise every PR would spend two minutes
 * producing output nobody reads. Run it deliberately:
 *
 *   pnpm --filter @tumaet/webapp exec playwright test tests/perf/drag-lag-benchmark.spec.ts --project=perf
 */

/**
 * A uniform lattice of class nodes wired to their right, second-right and below
 * neighbours. Generated rather than stored: these five diagrams were 12k lines of
 * fixture whose every coordinate is `(i % cols) * 260`, and a reader could not tell
 * from them what the benchmark actually varies. Here the shape IS the parameter.
 */
const benchDiagram = (n: number) => {
  const cols = n <= 25 ? 6 : n <= 50 ? 8 : n <= 75 ? 10 : 12
  const pad = (i: number) => String(i).padStart(2, "0")
  const nodes = Array.from({ length: n }, (_, i) => ({
    id: `perf-node-${pad(i)}`,
    width: 160,
    height: 100,
    type: "class",
    position: { x: (i % cols) * 260, y: Math.floor(i / cols) * 190 },
    data: { name: `C${pad(i)}`, methods: [], attributes: [] },
    measured: { width: 160, height: 100 },
  }))
  const edges: Record<string, unknown>[] = []
  for (let i = 0; i < n; i++)
    for (const step of [1, 2, cols]) {
      const j = i + step
      if (j >= n) continue
      // Sideways links stay inside their row; only the `cols` step goes down.
      const down = step === cols
      if (!down && Math.floor(j / cols) !== Math.floor(i / cols)) continue
      edges.push({
        id: `perf-edge-${pad(edges.length)}`,
        source: nodes[i].id,
        target: nodes[j].id,
        type: "ClassBidirectional",
        sourceHandle: down ? "bottom" : "right",
        targetHandle: down ? "top" : "left",
        data: { points: [] },
      })
    }
  return {
    id: `perf-bench-${n}n`,
    version: "4.1.0",
    title: `perf-bench-${n}n`,
    type: "ClassDiagram",
    nodes,
    edges,
    assessments: [],
  }
}
test.describe.configure({ mode: "serial", timeout: 180_000 })

const SIZES = [10, 25, 50, 75, 100]
const DRAG_COUNT = 12

type Row = {
  nodes: number
  edges: number
  initialSolveMs: number
  frames: number
  avgSolveMs: number
  worstSolveMs: number
  searchesPerFrame: number
  worstSearchExpansions: number
  abandoned: number
}

const rows: Row[] = []

for (const n of SIZES) {
  test(`bench ${n} nodes`, async ({ page }) => {
    const fixture = benchDiagram(n)
    await openLocalWithPerf(page, fixture)

    // Let the initial whole-canvas solve settle, then read it: this is the
    // cold routing cost (every edge routed from scratch, no previous to reuse).
    await page.waitForTimeout(400)
    const afterLoad = await readPerf(page)

    // Pick the on-screen node nearest the viewport centre (these wide grids are
    // not fit-to-view, so a node picked by index can fall off-screen and never
    // drag). A central node also has the most edges passing nearby.
    const editor = page.locator(`#react-flow-library-${String(fixture.id)}`)
    const vw = page.viewportSize()!
    const nodeId = await editor.locator(".react-flow__node").evaluateAll(
      (els, vp) => {
        let best: string | null = null
        let bestDist = Infinity
        for (const el of els) {
          const r = el.getBoundingClientRect()
          const cx = r.x + r.width / 2
          const cy = r.y + r.height / 2
          const margin = 80
          if (
            cx < margin ||
            cx > vp.w - margin ||
            cy < margin ||
            cy > vp.h - margin
          )
            continue
          const d = Math.hypot(cx - vp.w / 2, cy - vp.h / 2)
          if (d < bestDist) {
            bestDist = d
            best = el.getAttribute("data-id")
          }
        }
        return best
      },
      { w: vw.width, h: vw.height }
    )
    const node = editor.locator(`.react-flow__node[data-id="${nodeId}"]`)

    const before = await readPerf(page)
    for (let i = 0; i < DRAG_COUNT; i++) {
      const dy = i % 2 === 0 ? 40 : -40
      await dragNodeBy(node, page, 30, dy)
    }
    const after = await readPerf(page)

    const dFrames = after.solveCount - before.solveCount
    const dSolveMs = after.solveMs - before.solveMs
    const dSearches = after.edgeSearches - before.edgeSearches
    const f = Math.max(1, dFrames)
    rows.push({
      nodes: n,
      edges: fixture.edges ? (fixture.edges as unknown[]).length : 0,
      initialSolveMs: Number(
        (afterLoad.solveMs / Math.max(1, afterLoad.solveCount)).toFixed(2)
      ),
      frames: dFrames,
      avgSolveMs: Number((dSolveMs / f).toFixed(3)),
      worstSolveMs: Number(after.solveMaxMs.toFixed(2)),
      searchesPerFrame: Number((dSearches / f).toFixed(1)),
      worstSearchExpansions: after.edgeSearchesMaxExpansions,
      abandoned: after.edgeSearchesAbandoned,
    })
  })
}

test.afterAll(() => {
  const head = [
    "nodes",
    "edges",
    "initSolveMs",
    "avgSolveMs",
    "worstMs",
    "search/fr",
    "worstExp",
  ]
  const w = [6, 6, 12, 11, 9, 10, 9]
  const fmt = (cells: (string | number)[]) =>
    cells.map((c, i) => String(c).padStart(w[i])).join("")

  console.log("\n===== DRAG-LAG BENCHMARK (per-frame, ms) =====")

  console.log(fmt(head))
  for (const r of rows) {
    console.log(
      fmt([
        r.nodes,
        r.edges,
        r.initialSolveMs,
        r.avgSolveMs,
        r.worstSolveMs,
        r.searchesPerFrame,
        r.worstSearchExpansions,
      ])
    )
  }

  console.log("==============================\n")
})
