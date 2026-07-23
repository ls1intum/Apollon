import { test } from "@playwright/test"
import { openLocalWithPerf, readPerf, dragNodeBy } from "./perfHelpers"

/**
 * Wall-clock drag-lag benchmark across diagram sizes. It asserts NOTHING — wall
 * time is machine-specific, which is what the expansion-count budgets in
 * edge-routing.spec.ts are for. It exists to profile scaling, and prints a table
 * of pointer-down frame time. Pointer-up exact-solve latency is reported in the
 * separate solve columns; folding it into frame p95 would make a background
 * result look like interaction jank. Measured pointer moves are paced one per
 * paint, rather than queued as a synthetic protocol burst.
 *
 * Because it cannot fail, it is excluded from the `perf` projects that CI runs
 * (see playwright.config.ts) — otherwise every PR would spend two minutes
 * producing output nobody reads. It reports background exact-solve latency and
 * foreground animation-frame tails separately. Run it deliberately:
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
  mainFrameP95Ms: number
  mainFrameWorstMs: number
  workerSolves: number
  workerAttempts: number
  workerFallbacks: number
  initialSyncs: number
  smallSyncs: number
  edgeRendersPerInput: number
}

const rows: Row[] = []

for (const n of SIZES) {
  test(`bench ${n} nodes`, async ({ page }, testInfo) => {
    page.on("console", (message) => {
      if (message.text().includes("edge-geometry-worker"))
        console.log(message.text())
    })
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

    const profiler =
      process.env.PROFILE === "1"
        ? await page.context().newCDPSession(page)
        : null
    if (profiler) {
      await profiler.send("Profiler.enable")
      await profiler.send("Profiler.setSamplingInterval", { interval: 100 })
      await profiler.send("Profiler.start")
    }

    const before = await readPerf(page)
    const mainFrames: number[] = []
    for (let i = 0; i < DRAG_COUNT; i++) {
      const dx = i % 2 === 0 ? 30 : -30
      const dy = i % 2 === 0 ? 40 : -40
      mainFrames.push(
        ...(await dragNodeBy(node, page, dx, dy, {
          steps: 12,
          measureFrames: true,
        }))
      )
    }
    const after = await readPerf(page)
    if (profiler) {
      const { profile } = await profiler.send("Profiler.stop")
      const nodeById = new Map(profile.nodes.map((node) => [node.id, node]))
      const selfMicros = new Map<string, number>()
      for (let index = 0; index < (profile.samples?.length ?? 0); index++) {
        const node = nodeById.get(profile.samples![index])
        if (!node) continue
        const frame = node.callFrame
        const key = `${frame.functionName || "(anonymous)"} ${frame.url}:${frame.lineNumber + 1}`
        selfMicros.set(
          key,
          (selfMicros.get(key) ?? 0) + (profile.timeDeltas?.[index] ?? 0)
        )
      }
      console.log(
        "\n===== MAIN-THREAD CPU SELF TIME =====\n" +
          [...selfMicros]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(
              ([frame, micros]) => `${(micros / 1000).toFixed(1)} ms ${frame}`
            )
            .join("\n") +
          "\n==============================\n"
      )
      await testInfo.attach("main-thread.cpuprofile", {
        body: Buffer.from(JSON.stringify(profile)),
        contentType: "application/json",
      })
      await profiler.detach()
    }

    const dFrames = after.solveCount - before.solveCount
    const dSolveMs = after.solveMs - before.solveMs
    const dSearches = after.edgeSearches - before.edgeSearches
    const f = Math.max(1, dFrames)
    const sortedFrames = [...mainFrames].sort((a, b) => a - b)
    const frameP95 =
      sortedFrames[
        Math.min(
          sortedFrames.length - 1,
          Math.floor(sortedFrames.length * 0.95)
        )
      ] ?? 0
    rows.push({
      nodes: n,
      edges: after.diagramEdgeCount,
      initialSolveMs: Number(
        (afterLoad.solveMs / Math.max(1, afterLoad.solveCount)).toFixed(2)
      ),
      frames: dFrames,
      avgSolveMs: Number((dSolveMs / f).toFixed(3)),
      worstSolveMs: Number(after.solveMaxMs.toFixed(2)),
      searchesPerFrame: Number((dSearches / f).toFixed(1)),
      worstSearchExpansions: after.edgeSearchesMaxExpansions,
      abandoned: after.edgeSearchesAbandoned,
      mainFrameP95Ms: Number(frameP95.toFixed(2)),
      mainFrameWorstMs: Number(Math.max(0, ...mainFrames).toFixed(2)),
      workerSolves: after.workerSolveCount,
      workerAttempts: after.workerAttemptCount,
      workerFallbacks: after.workerFallbackCount,
      initialSyncs: after.workerInitialSyncCount,
      smallSyncs: after.workerSmallSyncCount,
      edgeRendersPerInput: Number(
        (
          (after.edgeRenderCount - before.edgeRenderCount) /
          (DRAG_COUNT * 12)
        ).toFixed(2)
      ),
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
    "frameP95",
    "frameMax",
    "workers",
    "attempts",
    "fallback",
    "initial",
    "small",
    "edgeR/in",
  ]
  const w = [6, 6, 12, 11, 9, 10, 9, 10, 10, 9, 9, 9, 9, 9, 10]
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
        r.mainFrameP95Ms,
        r.mainFrameWorstMs,
        r.workerSolves,
        r.workerAttempts,
        r.workerFallbacks,
        r.initialSyncs,
        r.smallSyncs,
        r.edgeRendersPerInput,
      ])
    )
  }

  console.log("==============================\n")
})
