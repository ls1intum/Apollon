import { useCallback, useEffect } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
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
 * Mounted once per editor page. `useSearch({ strict: false })` keeps it
 * route-agnostic: the same hook serves `/local/$id` and `/shared/$diagramId`,
 * both of which type `version` as an optional string. Search is a parsed
 * object (not a string), and `navigate({ to: "." })` rewrites only the search
 * of the current route, preserving the path + params.
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
  const search = useSearch({ strict: false }) as { version?: string }
  const previewFromUrl = search.version ?? null
  const navigate = useNavigate()
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
        void enterPreview(diagramId, previewFromUrl).catch((err) => {
          log.warn(
            "Previewed version unavailable",
            err instanceof Error ? err.message : String(err)
          )
          toast.error(t.previewUnavailable)
          // Strip the dangling param so reload/Back land on the live canvas.
          void navigate({
            to: ".",
            search: (prev) => ({ ...prev, [PREVIEW_VERSION_PARAM]: undefined }),
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
  ])

  const openPreview = useCallback(
    (versionId: string) => {
      // Push once when entering from the live canvas; replace on every
      // subsequent version→version hop so Back doesn't walk through them.
      const replace = previewFromUrl !== null
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, [PREVIEW_VERSION_PARAM]: versionId }),
        replace,
      })
    },
    [navigate, previewFromUrl]
  )

  const closePreview = useCallback(() => {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, [PREVIEW_VERSION_PARAM]: undefined }),
      replace: true,
    })
  }, [navigate])

  return { previewFromUrl, openPreview, closePreview }
}
