/** Constrain `v` to `[lo, hi]`. */
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v))

/**
 * Whether tuple `a` sorts before `b` lexicographically. Both are ranking keys — a
 * winner is the one with the smallest such tuple — so this is `<`, not `<=`: equal
 * tuples are not "less", and the caller keeps the first-seen winner on a tie.
 *
 * Reads only `a.length` slots, so comparing tuples of different lengths is a bug the
 * caller must avoid; every ranking key in a given comparison is built the same width.
 */
export const lexLess = (
  a: readonly number[],
  b: readonly number[]
): boolean => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return false
}
