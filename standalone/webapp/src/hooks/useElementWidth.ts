import { useEffect, useState, type RefObject } from "react"

/**
 * Reports the rendered pixel width of `ref.current`, updating live via
 * `ResizeObserver` whenever the element resizes (parent reflow, sidebar
 * open/close, devtools docked, window resized, …). Returns `undefined`
 * until the first observation.
 *
 * Use this for **container-relative** responsive layout: a component
 * whose available width depends on adjacent panels (sidebar, drawer,
 * split pane) cannot answer "should I be compact?" from `useMediaQuery`
 * — viewport size and container size are different reference frames.
 * `ResizeObserver` is the modern primitive (Chrome 64+, Safari 13.1+,
 * Firefox 69+; ubiquitous since 2020), so no polyfill is needed in our
 * supported browsers.
 *
 * Hand-rolled rather than pulling in `react-use-measure` because we have
 * exactly one current consumer and the dependency cost outweighs the
 * dozen lines saved.
 */
export function useElementWidth<T extends Element>(
  ref: RefObject<T | null>
): number | undefined {
  const [width, setWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Initial measurement so consumers don't render with `undefined` for
    // a frame waiting for the first observer callback.
    setWidth(node.getBoundingClientRect().width)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      // `contentBoxSize` (modern) vs `contentRect.width` (older). Prefer
      // the array form because it's the spec-defined surface; fall back
      // to `contentRect` for engines that haven't shipped it yet.
      const next =
        entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width
      // Skip no-op updates so consumers don't re-render on sub-pixel
      // jitter from browser zoom or fractional layout.
      setWidth((prev) =>
        prev !== undefined && Math.abs(prev - next) < 0.5 ? prev : next
      )
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])

  return width
}
