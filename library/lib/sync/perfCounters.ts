// Dev/test-only performance counters, gated on `import.meta.env.DEV` OR the e2e
// build (`VITE_E2E`) — both statically false in a real production build and in
// the standalone library dist (no VITE_E2E), so the module dead-code-eliminates
// there (enforced by scripts/check-no-perf-hooks.mjs). The webapp consumes the
// library from source, so its `VITE_E2E=true` build keeps these live for the
// perf suite (`window.__apollonPerf`). Inline (not a shared const) so it both
// DCEs and re-evaluates under `vi.stubEnv`.
export type PerfCounters = {
  storeNodeWrites: number
  /** Edge routing runs on the render path, so what matters is how rarely a search
   * is needed, not how fast one is. Counting the WORK lets a test hold onto that
   * on any machine; a stopwatch only measures the machine. */
  routerSearches: number
  routerExpansions: number
  /** The worst single search. A mean over a hundred edges hides the one edge that
   * costs a hundred times the rest — which is precisely the edge that drops the
   * frame, and precisely the one a budget needs to catch. */
  routerMaxExpansions: number
  /** Searches that hit their work budget and fell back to a plain step route. */
  routerAbandoned: number
  /** Route pairs evaluated by whole-set/component refinement scoring. This guards
   * the orchestration cost that router-search counters cannot see. */
  routeScorePairs: number
  /** Wall-clock spent in `computeAllEdgeGeometry` (the whole-canvas solve that
   * runs in the layout effect on each drag frame). Total across all solves and
   * the single worst solve — the worst is the frame that drops. Machine-specific,
   * so it informs local benchmarking, not a cross-machine CI budget (that is what
   * the expansion counters above are for). */
  solveMs: number
  solveMaxMs: number
  solveCount: number
}

export const perfCounters: PerfCounters =
  import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
    ? {
        storeNodeWrites: 0,
        routerSearches: 0,
        routerExpansions: 0,
        routerMaxExpansions: 0,
        routerAbandoned: 0,
        routeScorePairs: 0,
        solveMs: 0,
        solveMaxMs: 0,
        solveCount: 0,
      }
    : (undefined as unknown as PerfCounters)

export const getPerfCounters = (): PerfCounters | undefined =>
  import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
    ? perfCounters
    : undefined

export const recordStoreNodeWrite = () => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.storeNodeWrites++
}

/** One whole-canvas solve, in milliseconds. Positive guard so it DCEs in prod. */
export const recordSolve = (ms: number): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    perfCounters.solveMs += ms
    perfCounters.solveCount++
    if (ms > perfCounters.solveMaxMs) perfCounters.solveMaxMs = ms
  }
}

/** One completed search. Recorded ONCE, at whichever way the search exits, so an
 * abandoned run cannot go uncounted while its expansions do — the counter would
 * then be quietest exactly where it should be loudest. */
export const recordRouterSearch = (
  expansions: number,
  abandoned: boolean
): void => {
  // A positive guard, like `recordStoreNodeWrite` above — not an early return on
  // the negation. The bundler folds `if (false) { ... }` away entirely; it does not
  // strip the statements after an `if (true) return`, so the counter object stays
  // referenced and reaches the production chunk. check-no-perf-hooks.mjs caught it.
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    perfCounters.routerSearches++
    perfCounters.routerExpansions += expansions
    if (expansions > perfCounters.routerMaxExpansions) {
      perfCounters.routerMaxExpansions = expansions
    }
    if (abandoned) perfCounters.routerAbandoned++
  }
}

/** One pair compared by the route-set objective. Kept separate from A* work so
 * tests can prove a small conflict does not trigger repeated O(E²) rescans. */
export const recordRouteScorePair = (): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.routeScorePairs++
}
