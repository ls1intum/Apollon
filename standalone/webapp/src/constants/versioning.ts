/**
 * Maximum saved versions per diagram (single bucket, FIFO with eviction
 * priority — see `evict_with_priority` in the server's Lua library).
 *
 * Source-of-truth lives server-side as `MAX_VERSIONS_PER_DIAGRAM` in
 * `standalone/server/src/config.ts`. The client reflects the same number
 * for "X / 50" counters and toast copy. If the env var diverges between
 * client and server bundles the count display will lie — keep them in
 * sync at deploy time.
 */
const raw = (import.meta as unknown as { env?: Record<string, string> }).env
  ?.VITE_MAX_VERSIONS_PER_DIAGRAM
const parsed = raw ? Number(raw) : NaN
export const MAX_VERSIONS_PER_DIAGRAM =
  Number.isFinite(parsed) && parsed > 0 ? parsed : 50
