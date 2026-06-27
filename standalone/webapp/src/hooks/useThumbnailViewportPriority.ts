import { useCallback, useEffect, useMemo, useRef } from "react"

/**
 * A shared registry of the diagram ids whose cards are currently in (or near)
 * the viewport, plus an ordering hint so "near the top of the screen" wins over
 * "near the bottom". The thumbnail warmup worker reads this at the moment it
 * picks its NEXT item, so generation follows the user's eyes instead of the
 * list order of the infinite-scroll window.
 *
 * Why a mutable ref-backed registry rather than React state: the set changes on
 * every scroll-driven intersection and is consumed only inside the async worker
 * loop (never in render). Routing it through state would re-render the whole
 * gallery on each scroll for no visual benefit. The single ref is created once
 * and shared by the gallery (which hands `priority` to the warmup hook) and by
 * every card (which calls `observe` to register itself).
 */
export type ThumbnailViewportPriority = {
  /**
   * Begin observing `node` for `id`. While the node intersects the viewport
   * (within the pre-warm margin) the id is marked visible and tagged with its
   * vertical position so the worker can prefer the topmost on-screen card.
   * Returns a cleanup that stops observing and clears the id. Safe to call with
   * a `null` node (no-op cleanup) so cards can pass it straight to a ref effect.
   */
  observe: (id: string, node: Element | null) => () => void
  /**
   * Pick the most-urgent id from `candidateIds` (the still-pending queue): the
   * topmost currently-visible card, or `null` when none of the candidates are
   * on screen (the worker then falls back to its background queue order).
   */
  pickNext: (candidateIds: Iterable<string>) => string | null
}

// Pre-warm band: start generating a card's thumbnail when it is within ~one
// viewport-row of scrolling into view, so it is ready (or nearly) by the time it
// lands. Matches the spirit of the gallery's own 280px load-more rootMargin.
const VIEWPORT_PREWARM_MARGIN = "320px 0px"

type VisibleEntry = {
  /** Distance of the card's top from the viewport top; lower = more urgent. */
  top: number
}

export const useThumbnailViewportPriority = (): ThumbnailViewportPriority => {
  // id -> live position for every currently-intersecting card. Mutated from the
  // observer callback and read by the worker; never drives render.
  const visibleRef = useRef(new Map<string, VisibleEntry>())
  // One IntersectionObserver shared across all cards (cheap, batched callbacks)
  // rather than one observer per card. Lazily created on the first observe().
  const observerRef = useRef<IntersectionObserver | null>(null)
  // node -> id so the single observer callback can map an entry back to its id.
  const nodeToIdRef = useRef(new Map<Element, string>())

  const ensureObserver = useCallback(() => {
    if (observerRef.current || typeof IntersectionObserver === "undefined") {
      return observerRef.current
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = visibleRef.current
        for (const entry of entries) {
          const id = nodeToIdRef.current.get(entry.target)
          if (!id) continue
          if (entry.isIntersecting) {
            visible.set(id, { top: entry.boundingClientRect.top })
          } else {
            visible.delete(id)
          }
        }
      },
      { rootMargin: VIEWPORT_PREWARM_MARGIN, threshold: 0 }
    )
    observerRef.current = observer
    return observer
  }, [])

  const observe = useCallback(
    (id: string, node: Element | null) => {
      if (!node) return () => {}
      const observer = ensureObserver()
      if (!observer) return () => {}

      nodeToIdRef.current.set(node, id)
      observer.observe(node)

      return () => {
        observer.unobserve(node)
        nodeToIdRef.current.delete(node)
        visibleRef.current.delete(id)
      }
    },
    [ensureObserver]
  )

  const pickNext = useCallback((candidateIds: Iterable<string>) => {
    const visible = visibleRef.current
    if (visible.size === 0) return null

    let bestId: string | null = null
    let bestTop = Number.POSITIVE_INFINITY
    for (const id of candidateIds) {
      const entry = visible.get(id)
      if (!entry) continue
      // Prefer the topmost on-screen pending card. Ties keep the first seen,
      // which is the queue's own (local-before-shared, list) order.
      if (entry.top < bestTop) {
        bestTop = entry.top
        bestId = id
      }
    }
    return bestId
  }, [])

  useEffect(() => {
    // Capture the stable ref containers (created once per hook instance, only
    // mutated thereafter) so the cleanup tears down the exact maps this effect
    // observed — required by react-hooks and correct here regardless.
    const observerRef_ = observerRef
    const nodeToId = nodeToIdRef.current
    const visible = visibleRef.current
    return () => {
      observerRef_.current?.disconnect()
      observerRef_.current = null
      nodeToId.clear()
      visible.clear()
    }
  }, [])

  return useMemo(() => ({ observe, pickNext }), [observe, pickNext])
}
