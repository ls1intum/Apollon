// Dev/test-only performance counters, gated behind `import.meta.env.DEV` so the
// whole module dead-code-eliminates in production.
export type PerfCounters = {
  storeNodeWrites: number
}

export const perfCounters: PerfCounters = import.meta.env.DEV
  ? {
      storeNodeWrites: 0,
    }
  : (undefined as unknown as PerfCounters)

export const getPerfCounters = (): PerfCounters | undefined =>
  import.meta.env.DEV ? perfCounters : undefined

export const recordStoreNodeWrite = () => {
  if (import.meta.env.DEV) perfCounters.storeNodeWrites++
}
