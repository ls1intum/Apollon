import { useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "react-router"
import { toast } from "react-toastify"
import { useVersionStore } from "@/stores/useVersionStore"
import { versioningStrings as t } from "@/components/versioning/strings"
import { log } from "@/logger"

/** The query param that carries the actively-previewed version id. */
export const PREVIEW_VERSION_PARAM = "version"

/**
 * Makes `?version=<id>` the single source of truth for which version is being
 * previewed, for BOTH the local and collab editors (one implementation so they
 * can't drift).
 *
 * One-way data flow: callers (drawer rows, the preview banner, restore) WRITE
 * the URL via the returned `openPreview` / `closePreview`; this hook's effect
 * mirrors URL → version store (`enterPreview` / `exitPreview`). That's what
 * makes reload re-enter the preview, a single Back exit it, and a deep link /
 * new tab open it — none of which worked when preview lived only in memory.
 *
 * - `openPreview` pushes a history entry on the FIRST hop from live and
 *   replaces on every version→version hop, so cycling N versions leaves exactly
 *   one Back between preview and the live canvas (avoids the History-API
 *   "variant selection" anti-pattern).
 * - Unknown / deleted / foreign-device ids fail soft: toast, strip the param,
 *   fall back to the live canvas — never crash.
 *
 * Must be called once per editor page (it owns the URL→store effect). The
 * returned writers are safe to spread to children.
 *
 * `ready` MUST be false until the page has bound the active `VersionRepository`
 * (pass `Boolean(editor)` — the editor and the repo are bound together).
 * Otherwise a deep-link / reload carrying `?version=` would run `enterPreview`
 * before the repository holder is set and resolve against the wrong adapter.
 */
export function useVersionPreviewUrlSync(
  diagramId: string | undefined,
  ready: boolean = true
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const previewFromUrl = searchParams.get(PREVIEW_VERSION_PARAM)
  const enterPreview = useVersionStore((s) => s.enterPreview)
  const exitPreview = useVersionStore((s) => s.exitPreview)
  const previewVersionId = useVersionStore((s) => s.preview?.versionId ?? null)

  // Tracks the previous URL param so we can distinguish a real URL transition
  // (Back button / external param removal) from a store-only state, and only
  // call exitPreview when the user actually navigated away from a version.
  const prevFromUrl = useRef<string | null>(null)

  // URL -> store. The single place enterPreview/exitPreview are driven.
  useEffect(() => {
    if (!diagramId || !ready) return
    if (previewFromUrl && previewVersionId !== previewFromUrl) {
      void enterPreview(diagramId, previewFromUrl).catch((err) => {
        log.warn(
          "Previewed version unavailable",
          err instanceof Error ? err.message : String(err)
        )
        toast.error(t.previewUnavailable)
        // Strip the dangling param so reload/Back land on the live canvas.
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.delete(PREVIEW_VERSION_PARAM)
            return next
          },
          { replace: true }
        )
      })
    } else if (
      !previewFromUrl &&
      prevFromUrl.current !== null &&
      previewVersionId !== null
    ) {
      exitPreview()
    }
    prevFromUrl.current = previewFromUrl
  }, [
    previewFromUrl,
    previewVersionId,
    diagramId,
    ready,
    enterPreview,
    exitPreview,
    setSearchParams,
  ])

  const openPreview = useCallback(
    (versionId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set(PREVIEW_VERSION_PARAM, versionId)
          return next
        },
        // Push once when entering from the live canvas; replace on every
        // subsequent version→version hop so Back doesn't walk through them.
        { replace: searchParams.has(PREVIEW_VERSION_PARAM) }
      )
    },
    [setSearchParams, searchParams]
  )

  const closePreview = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(PREVIEW_VERSION_PARAM)
        return next
      },
      { replace: true }
    )
  }, [setSearchParams])

  return { previewFromUrl, openPreview, closePreview }
}
