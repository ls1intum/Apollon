import { useRef } from "react"

/**
 * Keeps the PREVIOUS reference while the new value is content-equal to it, so a
 * value that is rebuilt every render but whose content rarely changes keeps a
 * stable identity for the memos, effects, and React Compiler output downstream.
 *
 * This replaces the `useMemo(() => value, [contentDigest])` idiom — a manual
 * memo whose dependency array deliberately lists a digest instead of the value
 * the closure returns. That idiom is safe for correctness but, under the React
 * Compiler, a self-inflicted deoptimization: the compiler infers the real
 * dependency (`value`), sees it does not match the declared one, cannot prove
 * the memo is preserved, and so BAILS OUT OF OPTIMIZING THE ENTIRE ENCLOSING
 * HOOK — silently, plus a `preserve-manual-memoization` lint error. A
 * ref-compare hook carries no dependency array for the compiler to reject, so
 * the caller stays fully optimizable; comparing structurally is also cheaper
 * than allocating and diffing a digest string on every render.
 *
 * Read-then-conditionally-write of a ref DURING render is the whole mechanism —
 * the sanctioned "cache the previous value by content" pattern — so `react-hooks/refs`
 * is disabled here deliberately. The trade the old memo made (whole-hook deopt) does
 * NOT recur: any compiler bail is confined to this leaf hook, which has nothing to
 * memoize, while its callers (`useEdgeRoutingContext`, `useStepPathEdge`) stay
 * optimizable precisely because the lying-deps memo is gone. `isEqual` runs only
 * when the reference actually changed, so an already-stable input costs one check.
 */
/* eslint-disable react-hooks/refs -- ref caching during render is this hook's purpose; see doc above */
export function useStableValue<T>(
  value: T,
  isEqual: (a: T, b: T) => boolean
): T {
  const ref = useRef(value)
  const previous = ref.current
  if (previous !== value && !isEqual(previous, value)) {
    ref.current = value
    return value
  }
  return previous
}
