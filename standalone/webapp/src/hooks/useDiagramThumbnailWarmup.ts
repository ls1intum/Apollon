import { useCallback, useEffect, useRef, useState } from "react"
import type { UMLModel } from "@tumaet/apollon"
import { log } from "@/logger"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { renderThumbnailSvgFromModel } from "@/utils/thumbnailSvg"
import { waitForIdle } from "@/utils/idle"
import type { ThumbnailViewportPriority } from "@/hooks/useThumbnailViewportPriority"
import { dequeueNextDiagram } from "@/hooks/dequeueNextDiagram"

const THUMBNAIL_WARMUP_DELAY_MS = 400

type ThumbnailWarmupDiagram = {
  id: string
  lastModifiedAt: string
  model: UMLModel
}

export const useDiagramThumbnailWarmup = <T extends ThumbnailWarmupDiagram>({
  visibleDiagrams,
  isPending,
  isDiagramEmpty,
  viewportPriority,
}: {
  visibleDiagrams: T[]
  isPending: boolean
  isDiagramEmpty: (diagram: T) => boolean
  /**
   * Optional viewport-priority registry. When provided, the worker generates the
   * thumbnail for the topmost on-screen card next instead of draining the
   * infinite-scroll window in list order, so the card the user is looking at
   * loads first. Off-screen cards still warm in the background (queue order).
   */
  viewportPriority?: ThumbnailViewportPriority
}): Record<string, true> => {
  const [canWarmThumbnails, setCanWarmThumbnails] = useState(false)
  const [loadingThumbnailIds, setLoadingThumbnailIds] = useState<
    Record<string, true>
  >(() => {
    const persistenceState = usePersistenceModelStore.getState()
    const initial: Record<string, true> = {}
    for (const diagram of visibleDiagrams) {
      if (isDiagramEmpty(diagram)) continue
      const hasCurrentThumbnail =
        Boolean(persistenceState.thumbnails[diagram.id]) &&
        persistenceState.thumbnailLastModifiedAt[diagram.id] ===
          diagram.lastModifiedAt
      if (!hasCurrentThumbnail) {
        initial[diagram.id] = true
      }
    }
    return initial
  })

  const queuedThumbnailIdsRef = useRef(new Set<string>())
  const failedThumbnailByLastModifiedRef = useRef(new Map<string, string>())
  const thumbnailQueueRef = useRef<ThumbnailWarmupDiagram[]>([])
  const thumbnailWorkerActiveRef = useRef(false)
  const isUnmountedRef = useRef(false)
  const isDiagramEmptyRef = useRef(isDiagramEmpty)
  const viewportPriorityRef = useRef(viewportPriority)
  // Latest-value refs read only inside the async queue worker, never in render.
  /* eslint-disable react-hooks/refs */
  isDiagramEmptyRef.current = isDiagramEmpty
  viewportPriorityRef.current = viewportPriority
  /* eslint-enable react-hooks/refs */

  const processThumbnailQueue = useCallback(() => {
    if (thumbnailWorkerActiveRef.current || isUnmountedRef.current) {
      return
    }

    const markLoading = (id: string, loading: boolean) => {
      setLoadingThumbnailIds((current) => {
        if (loading) {
          if (current[id]) return current
          return { ...current, [id]: true }
        }

        if (!current[id]) return current
        const next = { ...current }
        delete next[id]
        return next
      })
    }

    const worker = async () => {
      thumbnailWorkerActiveRef.current = true

      while (thumbnailQueueRef.current.length > 0 && !isUnmountedRef.current) {
        const nextDiagram = dequeueNextDiagram(
          thumbnailQueueRef.current,
          viewportPriorityRef.current
        )
        if (!nextDiagram) {
          continue
        }

        const id = nextDiagram.id
        queuedThumbnailIdsRef.current.delete(id)

        const persistenceState = usePersistenceModelStore.getState()
        const hasCurrentThumbnail =
          Boolean(persistenceState.thumbnails[id]) &&
          persistenceState.thumbnailLastModifiedAt[id] ===
            nextDiagram.lastModifiedAt
        if (hasCurrentThumbnail) {
          markLoading(id, false)
          continue
        }

        markLoading(id, true)
        await waitForIdle()

        if (isUnmountedRef.current) {
          markLoading(id, false)
          break
        }

        try {
          const thumbnailSvg = await renderThumbnailSvgFromModel(
            nextDiagram.model
          )
          if (isUnmountedRef.current) {
            markLoading(id, false)
            break
          }
          const latestModelLastModifiedAt =
            usePersistenceModelStore.getState().models[id]?.lastModifiedAt
          // Shared diagrams are not always present in the local `models` map.
          // Only treat this as stale when we do have a local model timestamp.
          if (
            latestModelLastModifiedAt &&
            latestModelLastModifiedAt !== nextDiagram.lastModifiedAt
          ) {
            markLoading(id, false)
            continue
          }
          usePersistenceModelStore
            .getState()
            .setThumbnail(id, thumbnailSvg, nextDiagram.lastModifiedAt)
          failedThumbnailByLastModifiedRef.current.delete(id)
        } catch (error) {
          failedThumbnailByLastModifiedRef.current.set(
            id,
            nextDiagram.lastModifiedAt
          )
          log.error("Failed to generate home thumbnail preview", error as Error)
        } finally {
          markLoading(id, false)
        }
      }

      thumbnailWorkerActiveRef.current = false
      if (thumbnailQueueRef.current.length > 0 && !isUnmountedRef.current) {
        // Recursive drain — the worker re-invokes itself (self-reference in a
        // useCallback, evaluated at call time, not during render).
        // eslint-disable-next-line react-hooks/immutability
        processThumbnailQueue()
      }
    }

    void worker()
  }, [])

  useEffect(() => {
    let enableTimer: number | null = null

    const scheduleEnable = () => {
      enableTimer = window.setTimeout(() => {
        if (!isUnmountedRef.current) {
          setCanWarmThumbnails(true)
        }
      }, THUMBNAIL_WARMUP_DELAY_MS)
    }

    if (document.readyState === "complete") {
      scheduleEnable()
      return () => {
        if (enableTimer !== null) {
          window.clearTimeout(enableTimer)
        }
      }
    }

    const handleLoad = () => {
      scheduleEnable()
    }

    window.addEventListener("load", handleLoad, { once: true })
    return () => {
      window.removeEventListener("load", handleLoad)
      if (enableTimer !== null) {
        window.clearTimeout(enableTimer)
      }
    }
  }, [])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
      thumbnailQueueRef.current = []
      queuedThumbnailIdsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!canWarmThumbnails || isPending) {
      return
    }

    // Process local diagrams before shared ones so the more-common case renders
    // first and shared network-fetched models don't block the local warmup queue.
    const prioritized = [...visibleDiagrams].sort((a, b) => {
      const aIsLocal = (a as { source?: string }).source !== "shared" ? 0 : 1
      const bIsLocal = (b as { source?: string }).source !== "shared" ? 0 : 1
      return aIsLocal - bIsLocal
    })

    for (const diagram of prioritized) {
      if (isDiagramEmptyRef.current(diagram)) {
        continue
      }

      const persistenceState = usePersistenceModelStore.getState()
      const hasCurrentThumbnail =
        Boolean(persistenceState.thumbnails[diagram.id]) &&
        persistenceState.thumbnailLastModifiedAt[diagram.id] ===
          diagram.lastModifiedAt
      if (hasCurrentThumbnail) {
        continue
      }

      if (
        queuedThumbnailIdsRef.current.has(diagram.id) ||
        failedThumbnailByLastModifiedRef.current.get(diagram.id) ===
          diagram.lastModifiedAt
      ) {
        continue
      }

      queuedThumbnailIdsRef.current.add(diagram.id)
      thumbnailQueueRef.current.push(diagram)
      setLoadingThumbnailIds((current) =>
        current[diagram.id] ? current : { ...current, [diagram.id]: true }
      )
    }

    processThumbnailQueue()
  }, [canWarmThumbnails, isPending, processThumbnailQueue, visibleDiagrams])

  return loadingThumbnailIds
}
