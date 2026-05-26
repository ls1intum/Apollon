// Structural deep-equal. Used by `diagramStore` to short-circuit nodes/edges
// replays when no semantic change occurred. Tolerant of key-order differences
// and treats `{a: undefined}` and `{}` as equal (matching the JSON wire format
// the editor round-trips through).
export const deepEqual = (a: unknown, b: unknown): boolean => {
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
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  if (Array.isArray(b)) return false
  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const keys = new Set<string>()
  for (const k of Object.keys(aObj)) if (aObj[k] !== undefined) keys.add(k)
  for (const k of Object.keys(bObj)) if (bObj[k] !== undefined) keys.add(k)
  for (const k of keys) {
    if (!deepEqual(aObj[k], bObj[k])) return false
  }
  return true
}
