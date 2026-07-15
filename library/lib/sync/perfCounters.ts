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
}

export const perfCounters: PerfCounters =
  import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
    ? {
        storeNodeWrites: 0,
        routerSearches: 0,
        routerExpansions: 0,
        routerMaxExpansions: 0,
        routerAbandoned: 0,
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
