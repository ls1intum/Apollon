import { useCallback, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"
import { useVersionStore } from "@/stores/useVersionStore"
import { fetchVersionBody, useBoundRepository } from "@/queries/versionQueries"
import { versioningStrings as t } from "@/components/versioning/strings"
import { log } from "@/logger"

/** The query param that carries the actively-previewed version id. */
export const PREVIEW_VERSION_PARAM = "version"

/**
 * Leave preview by clearing `?version=`; the URL→store sync then exits preview.
 * Callers must not clear the store directly — the sync effect re-enters preview
 * while the param still lingers.
 */
export function useClosePreview() {
  const navigate = useNavigate()
  return useCallback(() => {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, [PREVIEW_VERSION_PARAM]: undefined }),
      replace: true,
    })
  }, [navigate])
}

/**
 * Makes `?version=<id>` the single source of truth for which version is being
 * previewed, for BOTH the local and collab editors (one implementation so they
 * can't drift).
 *
 * One-way data flow: callers (drawer rows, the preview banner, restore) WRITE
 * the URL via the returned `openPreview` / `closePreview`; this hook's effect
 * mirrors URL → version store (`enterPreview` / `exitPreview`). That's what
 * makes reload re-enter the preview, a single Back exit it, and a deep link /
 * new tab open it — because the URL, not in-memory state, is the source of truth.
 *
 * - `openPreview` pushes a history entry on the FIRST hop from live and
 *   replaces on every version→version hop, so cycling N versions leaves exactly
 *   one Back between preview and the live canvas (avoids the History-API
 *   "variant selection" anti-pattern).
 * - Unknown / deleted / foreign-device ids fail soft: toast, strip the param,
 *   fall back to the live canvas — never crash.
 *
 * `previewFromUrl` is the page's typed `?version=` read — each editor route
 * owns its own, so passing it in keeps this hook route-agnostic. `ready` MUST
 * be false until the page has bound the active `VersionRepository` (pass
 * `Boolean(editor)`), or a deep-link / reload carrying `?version=` would
 * `enterPreview` against the wrong adapter.
 */
export function useVersionPreviewUrlSync(
  diagramId: string | undefined,
  previewFromUrl: string | undefined,
  ready: boolean = true
) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const repo = useBoundRepository()
  const enterPreview = useVersionStore((s) => s.enterPreview)
  const exitPreview = useVersionStore((s) => s.exitPreview)
  const previewVersionId = useVersionStore((s) => s.preview?.versionId ?? null)

  // URL -> store, UNCONDITIONALLY: the URL is the source of truth on every
  // render, not just same-hop transitions. If there is no `?version=`, any
  // preview is cleared — including a stale one carried over from another diagram
  // by client-side navigation (`store.preview` is global and not reset on route
  // change; that leak surfaced the preview banner on a freshly opened editor
  // that had no version param).
  useEffect(() => {
    if (!diagramId) return
    if (previewFromUrl) {
      // Entering needs the repository bound (gated on `ready`); if it isn't yet,
      // this effect re-runs when `ready` flips.
      if (ready && previewVersionId !== previewFromUrl) {
        // Body comes through the shared query cache (dedups with thumbnails
        // and dirty-check baselines); the store setter itself is synchronous.
        void fetchVersionBody(queryClient, repo, diagramId, previewFromUrl)
          .then((body) => enterPreview(diagramId, previewFromUrl, body))
          .catch((err) => {
            log.warn(
              "Previewed version unavailable",
              err instanceof Error ? err.message : String(err)
            )
            toast.error(t.previewUnavailable)
            // Strip the dangling param so reload/Back land on the live canvas.
            void navigate({
              to: ".",
              search: (prev) => ({
                ...prev,
                [PREVIEW_VERSION_PARAM]: undefined,
              }),
              replace: true,
            })
          })
      }
    } else if (previewVersionId !== null) {
      // No version in the URL but the store is previewing — clear it. Clearing
      // doesn't need the editor/repo, so it runs even before `ready`.
      exitPreview()
    }
  }, [
    previewFromUrl,
    previewVersionId,
    diagramId,
    ready,
    enterPreview,
    exitPreview,
    navigate,
    queryClient,
    repo,
  ])

  const openPreview = useCallback(
    (versionId: string) => {
      // Push once when entering from the live canvas; replace on every
      // subsequent version→version hop so Back doesn't walk through them.
      const replace = previewFromUrl !== undefined
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, [PREVIEW_VERSION_PARAM]: versionId }),
        replace,
      })
    },
    [navigate, previewFromUrl]
  )

  const closePreview = useClosePreview()

  return { openPreview, closePreview }
}
