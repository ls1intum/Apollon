import type { ThumbnailViewportPriority } from "@/hooks/useThumbnailViewportPriority"

/**
 * Remove and return the next diagram to render from `queue`, mutating it in
 * place. When `viewportPriority` reports an on-screen pending card, that card is
 * pulled regardless of its queue position so the thumbnail the user is looking
 * at generates first; otherwise the front of the queue is taken so off-screen
 * cards still warm in their original (local-before-shared, list) order.
 *
 * Pure and queue-only (no DOM, no IntersectionObserver, no model graph) so the
 * priority/selection logic is unit-testable in isolation.
 */
export const dequeueNextDiagram = <T extends { id: string }>(
  queue: T[],
  viewportPriority?: Pick<ThumbnailViewportPriority, "pickNext">
): T | undefined => {
  if (queue.length === 0) return undefined

  const prioritizedId = viewportPriority?.pickNext(
    queue.map((diagram) => diagram.id)
  )
  if (prioritizedId) {
    const index = queue.findIndex((diagram) => diagram.id === prioritizedId)
    if (index >= 0) {
      return queue.splice(index, 1)[0]
    }
  }

  return queue.shift()
}
