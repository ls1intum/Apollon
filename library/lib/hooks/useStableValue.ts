import { useState } from "react"

/**
 * Keeps the previous committed reference while a new value is content-equal, so a
 * value rebuilt every render but rarely changed keeps a stable identity downstream.
 */
export function useStableValue<T>(
  value: T,
  isEqual: (a: T, b: T) => boolean
): T {
  const [stable, setStable] = useState(value)
  if (stable !== value && !isEqual(stable, value)) {
    setStable(value)
    return value
  }
  return stable
}
