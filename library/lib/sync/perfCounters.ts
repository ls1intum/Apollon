// Dev/test-only performance counters, gated behind `import.meta.env.DEV` so the
// whole module dead-code-eliminates in production. Kept as a dependency-free
// leaf module: importing a counter must never pull a heavier module (e.g.
// `yjsSync`) into a consumer's bundle chunk.
export type PerfCounters = {
  broadcastYjsMsgs: number
  broadcastYjsBytes: number
  awarenessMsgs: number
  storeNodeWrites: number
}

export const perfCounters: PerfCounters = import.meta.env.DEV
  ? {
      broadcastYjsMsgs: 0,
      broadcastYjsBytes: 0,
      awarenessMsgs: 0,
      storeNodeWrites: 0,
    }
  : (undefined as unknown as PerfCounters)

export const getPerfCounters = (): PerfCounters | undefined =>
  import.meta.env.DEV ? perfCounters : undefined

export const recordStoreNodeWrite = () => {
  if (import.meta.env.DEV) perfCounters.storeNodeWrites++
}
