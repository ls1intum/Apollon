import type { UMLModel } from "@tumaet/apollon/react"
import { ApiError, DiagramApiClient } from "@/services/DiagramApiClient"
import { log } from "@/logger"

interface AutosaverOptions {
  diagramId: string
  /** Latest converged model to persist. Re-read on every save attempt. */
  getModel: () => UMLModel | undefined
  /** True while a version preview overlays the canvas — saving is paused. */
  isPaused: () => boolean
  /**
   * Collaboration peers all autosave the same Yjs-converged model, so HEAD
   * revision contention isn't a real conflict. When enabled, a
   * REVISION_MISMATCH rebases onto the server's HEAD and re-PUTs the current
   * (converged) model rather than surfacing a conflict toast.
   */
  collaboration: boolean
  /** Quiet period after the last change before a save fires. */
  debounceMs?: number
  /** Upper bound on how long a continuous stream of changes can defer a save. */
  maxWaitMs?: number
  /** Max rebase re-PUTs on REVISION_MISMATCH before giving up for this attempt. */
  maxRebaseRetries?: number
  onError?: (err: unknown) => void
  /** Called after the model has been persisted (model is no longer dirty). */
  onSaved?: () => void
}

export interface DiagramAutosaver {
  /** Mark the model dirty and (re)arm the debounce timer. */
  schedule(): void
  /** Persist now if dirty, bypassing the debounce. Returns when settled. */
  flush(): Promise<void>
  /** Adopt a HEAD revision learned out-of-band (e.g. a manual version save). */
  setHeadRev(headRev: number | undefined): void
  /** Cancel timers and stop scheduling further saves. */
  dispose(): void
}

/**
 * Change-debounced diagram autosaver. Replaces a fixed-window poll: a save
 * fires `debounceMs` after the last model change, but no later than
 * `maxWaitMs` after the first un-saved change, so a long uninterrupted edit
 * streak still persists promptly. A frozen tab therefore loses at most the
 * trailing debounce window rather than a full poll interval.
 */
export function createDiagramAutosaver(
  opts: AutosaverOptions
): DiagramAutosaver {
  const debounceMs = opts.debounceMs ?? 1500
  const maxWaitMs = opts.maxWaitMs ?? 5000
  const maxRebaseRetries = opts.maxRebaseRetries ?? 3

  let dirty = false
  // Stops arming new debounce/maxWait timers. A save already chained behind an
  // in-flight PUT still runs to completion so a teardown flush() can't drop the
  // trailing edit (dispose() can't be awaited from a React cleanup).
  let stopScheduling = false
  let lastHeadRev: number | undefined
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null
  // Serialises saves so a maxWait fire and a debounce fire can't overlap.
  let inFlight: Promise<void> | null = null

  const clearTimers = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (maxWaitTimer !== null) {
      clearTimeout(maxWaitTimer)
      maxWaitTimer = null
    }
  }

  const putOnce = async (model: UMLModel) => {
    let attempt = 0
    let ifMatch = lastHeadRev
    for (;;) {
      try {
        const res = await DiagramApiClient.sendDiagramUpdate(
          opts.diagramId,
          model,
          { ifMatch }
        )
        lastHeadRev = res.headRev
        return
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.code === "REVISION_MISMATCH" &&
          opts.collaboration &&
          attempt < maxRebaseRetries
        ) {
          // Rebase: re-read HEAD, re-derive from the current converged model,
          // and re-PUT. Yjs guarantees content convergence across peers, so
          // this is a clean fast-forward — no per-mismatch toast (under many
          // concurrent editors a mismatch is the normal case).
          attempt += 1
          const meta = err.meta as { currentHeadRev?: number } | undefined
          if (typeof meta?.currentHeadRev === "number") {
            ifMatch = meta.currentHeadRev
          } else {
            const head = await DiagramApiClient.fetchDiagram(opts.diagramId)
            ifMatch = (head as { headRev?: number }).headRev
          }
          lastHeadRev = ifMatch
          const next = opts.getModel()
          if (!next) return
          model = next
          continue
        }
        if (err instanceof ApiError && err.code === "REVISION_MISMATCH") {
          // Single-editor mismatch (or retries exhausted): adopt the server's
          // hint so the NEXT save carries a fresh If-Match rather than
          // clobbering a concurrent writer with no guard.
          const meta = err.meta as { currentHeadRev?: number } | undefined
          if (typeof meta?.currentHeadRev === "number") {
            lastHeadRev = meta.currentHeadRev
          }
          return
        }
        throw err
      }
    }
  }

  const save = async () => {
    clearTimers()
    if (!dirty || opts.isPaused()) return
    const model = opts.getModel()
    if (!model) return
    dirty = false
    try {
      await putOnce(model)
      opts.onSaved?.()
    } catch (err) {
      // The save failed for a non-rebase reason; keep the model dirty so the
      // next change (or flush) retries it.
      dirty = true
      log.error("Autosave failed", err)
      opts.onError?.(err)
    }
  }

  const runSave = () => {
    if (inFlight) {
      // A save is already running; let it finish, then re-check dirtiness.
      // This chain is intentionally NOT gated on stopScheduling: a flush() at
      // teardown must persist an edit that arrived during the in-flight PUT.
      inFlight = inFlight.then(() => {
        if (dirty && !opts.isPaused()) return save()
      })
      return inFlight
    }
    inFlight = save().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  return {
    schedule() {
      if (stopScheduling) return
      dirty = true
      if (debounceTimer !== null) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void runSave()
      }, debounceMs)
      if (maxWaitTimer === null) {
        maxWaitTimer = setTimeout(() => {
          maxWaitTimer = null
          void runSave()
        }, maxWaitMs)
      }
    },
    async flush() {
      clearTimers()
      await runSave()
    },
    setHeadRev(headRev) {
      lastHeadRev = headRev
      // A manual save settles the dirty edits it captured; don't re-PUT them.
      dirty = false
    },
    dispose() {
      stopScheduling = true
      clearTimers()
    },
  }
}
