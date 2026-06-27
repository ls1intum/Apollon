import { useEffect, useState } from "react"

/**
 * Subscribes to a CSS media query and returns whether it currently matches,
 * updating live as the viewport crosses the breakpoint.
 *
 * Use this **only** for page-level layout decisions that can't be expressed
 * as Tailwind `hidden`/`block` responsive classes — e.g. choosing between
 * mounting an inline sidebar vs. a bottom-sheet drawer, where rendering both
 * (and merely hiding one with CSS) would double-mount effect-bearing bodies.
 * For container-relative sizing use `useElementWidth`; for pure show/hide
 * prefer Tailwind responsive utilities.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  )

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}
