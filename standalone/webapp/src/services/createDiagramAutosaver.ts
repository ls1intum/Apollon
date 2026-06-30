import type { UMLModel } from "@tumaet/apollon"
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
 * Change-debounced diagram autosaver. A save fires `debounceMs` after the last
 * model change, but no later than `maxWaitMs` after the first un-saved change,
 * so a long uninterrupted edit streak still persists promptly. Worst-case data
 * loss on an abrupt teardown is therefore one debounce window.
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

  // Resolves to true only if the model was actually persisted. A revision
  // mismatch we won't rebase (single-editor) or can't (retries exhausted)
  // resolves to false so the caller keeps the edit dirty for a later retry,
  // rather than reporting it saved when no PUT reached the server.
  const putOnce = async (model: UMLModel): Promise<boolean> => {
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
        return true
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
          if (!next) return false
          model = next
          continue
        }
        if (err instanceof ApiError && err.code === "REVISION_MISMATCH") {
          // Single-editor mismatch, or rebase retries exhausted: the PUT did
          // not land. Adopt the server's hint so the next attempt carries a
          // fresh If-Match, and report not-persisted so the edit stays dirty.
          const meta = err.meta as { currentHeadRev?: number } | undefined
          if (typeof meta?.currentHeadRev === "number") {
            lastHeadRev = meta.currentHeadRev
          }
          return false
        }
        throw err
      }
    }
  }

  // Arm (or re-arm) the trailing-edge save timer. While a version preview is
  // open the timer re-arms itself instead of saving, so a dirty edit persists
  // once preview exits rather than being stranded with no scheduled save.
  const armDebounce = () => {
    if (stopScheduling) return
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      if (dirty && opts.isPaused()) armDebounce()
      else void runSave()
    }, debounceMs)
  }

  const save = async () => {
    clearTimers()
    if (!dirty || opts.isPaused()) return
    const model = opts.getModel()
    if (!model) return
    dirty = false
    try {
      if (await putOnce(model)) opts.onSaved?.()
      // An unresolved mismatch didn't persist; keep it dirty for the next retry.
      else dirty = true
    } catch (err) {
      // The save failed for a non-mismatch reason; keep the model dirty so the
      // next change (or flush) retries it.
      dirty = true
      log.error("Autosave failed", err)
      opts.onError?.(err)
    }
  }

  const runSave = (): Promise<void> => {
    const prev = inFlight
    // Chain behind any in-flight save and re-check dirtiness when it settles.
    // The chain is intentionally NOT gated on stopScheduling: a flush() at
    // teardown must persist an edit that arrived during the in-flight PUT.
    const run: Promise<void> = (
      prev
        ? prev.then(() => {
            if (dirty && !opts.isPaused()) return save()
          })
        : save()
    ).finally(() => {
      // Reset to the fast path only when THIS save is still the tail. Binding
      // the reset to an earlier link would clear `inFlight` while a chained
      // save is still running, opening a parallel-PUT window.
      if (inFlight === run) inFlight = null
    })
    inFlight = run
    return run
  }

  return {
    schedule() {
      if (stopScheduling) return
      dirty = true
      armDebounce()
      if (maxWaitTimer === null) {
        maxWaitTimer = setTimeout(() => {
          maxWaitTimer = null
          if (dirty && opts.isPaused()) armDebounce()
          else void runSave()
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
