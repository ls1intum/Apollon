// Dev/test-only performance counters, gated on `import.meta.env.DEV` OR the e2e
// build (`VITE_E2E`) — both statically false in a real production build and in
// the standalone library dist (no VITE_E2E), so the module dead-code-eliminates
// there (enforced by scripts/check-no-perf-hooks.mjs). The webapp consumes the
// library from source, so its `VITE_E2E=true` build keeps these live for the
// perf suite (`window.__apollonPerf`). Inline (not a shared const) so it both
// DCEs and re-evaluates under `vi.stubEnv`.
export type PerfCounters = {
  storeNodeWrites: number
}

export const perfCounters: PerfCounters =
  import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
    ? {
        storeNodeWrites: 0,
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
