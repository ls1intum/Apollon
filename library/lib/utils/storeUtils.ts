// Structural deep-equal. By default it treats `{a: undefined}` and `{}` as
// equal (matching the JSON wire format the editor round-trips through) —
// `diagramStore` relies on this to short-circuit nodes/edges replays when no
// semantic change occurred. With `distinguishUndefined`, a key holding
// `undefined` is DISTINCT from an absent key; `reconcileYMap` needs that so
// dragging a node out of a parent (`parentId: undefined`) is persisted into Yjs
// rather than swallowed.
export const deepEqual = (
  a: unknown,
  b: unknown,
  distinguishUndefined = false
): boolean => {
  if (Object.is(a, b)) return true
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], distinguishUndefined)) return false
    }
    return true
  }
  if (Array.isArray(b)) return false
  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const keys = new Set<string>()
  for (const k of Object.keys(aObj)) {
    if (distinguishUndefined || aObj[k] !== undefined) keys.add(k)
  }
  for (const k of Object.keys(bObj)) {
    if (distinguishUndefined || bObj[k] !== undefined) keys.add(k)
  }
  for (const k of keys) {
    if (!deepEqual(aObj[k], bObj[k], distinguishUndefined)) return false
  }
  return true
}
