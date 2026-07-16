import { useRef } from "react"

/**
 * Keeps the PREVIOUS reference while the new value is content-equal to it, so a
 * value rebuilt every render but rarely changed keeps a stable identity downstream.
 *
 * Replaces the `useMemo(() => value, [contentDigest])` idiom, which under the React
 * Compiler deopts the ENTIRE enclosing hook: the compiler infers the real dependency
 * (`value`), sees it disagree with the declared digest, cannot prove the memo is
 * preserved, and bails (plus a `preserve-manual-memoization` lint error). This hook
 * has no deps array to reject, so callers stay optimizable; any bail is confined to
 * this leaf, which has nothing to memoize.
 *
 * The mechanism is a read-then-conditionally-write of a ref DURING render, so
 * `react-hooks/refs` is disabled deliberately.
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
