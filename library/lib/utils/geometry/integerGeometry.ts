/**
 * Determinism leaf for straight-polyline routing.
 *
 * Every function here is a pure integer computation. No `Math.sqrt`, `Math.hypot`
 * or `Math.atan2` appears on any decision path — those are permitted engine-defined
 * rounding, and the auto-router's output must be reproduced byte-identically by Yjs
 * peers and after a reload on a different JS engine (V8/JSC). The only square root is
 * an exact integer floor (`isqrt`); angle classification uses `BigInt` dot/cross
 * comparisons so it stays exact for any coordinate magnitude.
 */
import type { IPoint } from "@/edges/Connection"

/**
 * Exact integer floor square root for a non-negative integer up to 2^53.
 *
 * Computed by the bit-by-bit method rather than `Math.floor(Math.sqrt(n))`: the
 * float path can be off by one near perfect squares once `n` approaches 2^53, and a
 * single off-by-one in a segment length would desynchronise peers. Every
 * intermediate value here stays `<= n` (so `<= 2^53`, exactly representable) or is a
 * power of two, so the arithmetic is exact.
 */
export function isqrt(n: number): number {
  if (!Number.isInteger(n) || n < 0)
    throw new RangeError("isqrt requires a non-negative integer")
  if (n < 2) return n

  // Highest power of four not exceeding n. `bit * 4` is a power of two and thus
  // exactly representable even when it briefly exceeds 2^53.
  let bit = 1
  while (bit * 4 <= n) bit *= 4

  let result = 0
  let remaining = n
  while (bit !== 0) {
    if (remaining >= result + bit) {
      remaining -= result + bit
      // result stays below 2^27 for n <= 2^53, so the halving is exact.
      result = Math.floor(result / 2) + bit
    } else {
      result = Math.floor(result / 2)
    }
    bit = Math.floor(bit / 4)
  }
  return result
}

/** Squared distance between two integer points. Exact for realistic coordinates
 * (each squared delta is well under 2^53). */
export function distSqInt(a: IPoint, b: IPoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/** Integer (floored) Euclidean length of the segment a→b. */
export function segLenInt(a: IPoint, b: IPoint): number {
  return isqrt(distSqInt(a, b))
}

/**
 * Classify the turn between an incoming travel vector `(ux,uy)` and an outgoing
 * travel vector `(vx,vy)` into a coarse integer bucket, using ONLY integer dot and
 * cross products — never `atan2`.
 *
 * Buckets (θ is the turn angle between the two travel directions; 0 = dead straight):
 *   0 — near-straight, θ ≤ 45°  (interior corner angle ≥ 135°)
 *   1 — moderate,      45° < θ ≤ 90°
 *   2 — acute/hairpin, θ > 90°
 *
 * The thresholds come from comparing cos²θ against sin²θ without a square root:
 * with `dot = |u||v|cosθ` and `cross = |u||v|sinθ`, `dot² ≥ cross²` iff θ ≤ 45°, and
 * `sign(dot)` alone splits θ ≤ 90° from θ > 90°. `BigInt` keeps `dot²`/`cross²`
 * exact for any coordinate magnitude (plain numbers would overflow 2^53 when
 * squaring large products).
 */
export function turnBucket(
  ux: number,
  uy: number,
  vx: number,
  vy: number
): number {
  // A degenerate (zero-length) incoming or outgoing vector implies no genuine
  // corner; treat it as straight so it never adds a spurious penalty.
  if ((ux === 0 && uy === 0) || (vx === 0 && vy === 0)) return 0

  const bux = BigInt(ux)
  const buy = BigInt(uy)
  const bvx = BigInt(vx)
  const bvy = BigInt(vy)
  const dot = bux * bvx + buy * bvy
  const cross = bux * bvy - buy * bvx
  if (dot > 0n && dot * dot >= cross * cross) return 0
  if (dot >= 0n) return 1
  return 2
}
