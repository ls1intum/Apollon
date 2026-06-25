import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react"
import { getRouteApi, useRouter } from "@tanstack/react-router"
import { toast } from "react-toastify"
import {
  ApollonEditor,
  importDiagram,
  type UMLModel,
} from "@tumaet/apollon/react"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext, useModalContext } from "@/contexts"
import { useElementWidth } from "@/hooks/useElementWidth"
import { useVersionShortcut } from "@/hooks/useVersionShortcut"
import { useVersionPreviewUrlSync } from "@/hooks/useVersionPreviewUrlSync"
import {
  selectScopedPreview,
  selectVersions,
  useVersionStore,
} from "@/stores/useVersionStore"
import {
  setVersionRepository,
  LocalVersionRepository,
  getVersionRepository,
} from "@/services/versionRepository"
import {
  VersionDrawer,
  VersionPreviewBanner,
  VersionRail,
} from "@/components/versioning"
import { structuralFingerprint } from "@/lib/version/predicates"
import { versioningStrings as t } from "@/components/versioning/strings"
import type { Diagram } from "@/types"
import { log } from "@/logger"
import { normalizeThumbnailSvg } from "@/utils/thumbnailSvg"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { installPerfHooks } from "@/utils/perfHooks"
import { ErrorPage } from "./ErrorPage"

const THUMBNAIL_DEBOUNCE_MS = 2000

// Route-bound API for typed params (avoids importing the route file, which
// would create a cycle: the route file imports this page).
const route = getRouteApi("/local/$id")

/**
 * Standalone-mode local editor page (`/local/:id`). Mounts the versioning UI
 * against `LocalVersionRepository` and keys version history off the
 * `/local/:id` path param (mirrored into `usePersistenceModelStore.currentModelId`
 * via `setCurrentModelId`). No WebSocket, no autosave loop. Restore writes a
 * permanent "Before restoring …" auto-row instead of a 10s snackbar.
 *
 * Also exports a debounced diagram thumbnail (consumed by the home gallery),
 * which is SKIPPED while a version preview is active — the previewed snapshot
 * is read-only and must not overwrite the persisted model or its thumbnail.
 */
export const ApollonLocal: FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasColumnRef = useRef<HTMLDivElement | null>(null)
  const canvasColumnWidth = useElementWidth(canvasColumnRef)
  const thumbnailExportTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const thumbnailExportSequenceRef = useRef(0)
  const isThumbnailExportCanceledRef = useRef(false)
  const { setEditor, editor } = useEditorContext()
  const { openModal } = useModalContext()
  const { id: diagramId } = route.useParams()
  const { version: previewFromUrl } = route.useSearch()
  // `router.state.location` updates synchronously on navigation, so the editor
  // cleanup reads the real destination even while unmounting — a `useLocation`
  // ref still holds the old /local path at that point.
  const router = useRouter()

  const diagram = usePersistenceModelStore((store) =>
    diagramId ? store.models[diagramId] : null
  )
  const setCurrentModelId = usePersistenceModelStore(
    (store) => store.setCurrentModelId
  )
  const updateModel = usePersistenceModelStore((store) => store.updateModel)
  const setThumbnail = usePersistenceModelStore((store) => store.setThumbnail)

  useDocumentTitle(diagram?.model.title)

  // Cross-window delete guard. If THIS diagram is deleted in another window,
  // rehydrate the persistence store so ours matches the deletion. Without it,
  // this window keeps autosaving its in-memory copy and resurrects the diagram
  // (and the version trail the other window purged). Once rehydrated, `diagram`
  // becomes null and the not-found view below takes over, stopping autosave.
  //
  // Scope is deliberately narrow — we act ONLY on deletion of the active id, not
  // on edits. Live model sync between windows is a separate, CRDT-shaped concern
  // (tracked in #756); rehydrating on every edit would clobber unsaved work.
  // The `storage` event only fires in OTHER windows, so this can't loop.
  useEffect(() => {
    if (!diagramId) return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "persistenceModelStore" || !e.newValue) return
      try {
        const models =
          (
            JSON.parse(e.newValue) as {
              state?: { models?: Record<string, unknown> }
            }
          )?.state?.models ?? {}
        if (!(diagramId in models)) {
          void usePersistenceModelStore.persist.rehydrate()
        }
      } catch {
        // Malformed payload — ignore; the next valid event reconciles.
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [diagramId])

  const preview = useVersionStore((s) => selectScopedPreview(s, diagramId))
  const fetchVersions = useVersionStore((s) => s.fetchVersions)
  const { openPreview, closePreview } = useVersionPreviewUrlSync(
    diagramId,
    previewFromUrl,
    Boolean(editor)
  )
  // selectVersions returns a frozen empty-array singleton when the key
  // is absent — never construct a fresh `[]` here, or `useSyncExternalStore`
  // will warn "getSnapshot should be cached" and the regression test fails.
  const versions = useVersionStore((s) => selectVersions(s, diagramId ?? ""))

  useVersionShortcut(diagramId ?? undefined)

  const prePreviewFingerprintRef = useRef<string | null>(null)
  const [canRestoreFromPreview, setCanRestoreFromPreview] = useState(false)

  // -------- Editor lifecycle --------------------------------------------
  useEffect(() => {
    if (!containerRef.current || !diagram) return
    // Bind the local repository before this effect's `fetchVersions` runs.
    // The drawer no longer self-fetches, so this is the only fetch path and
    // ordering is guaranteed within the effect — no render-time mutation.
    setVersionRepository(LocalVersionRepository)
    isThumbnailExportCanceledRef.current = false
    setCurrentModelId(diagram.id)

    const instance = new ApollonEditor(containerRef.current, {
      model: diagram.model,
    })

    const subId = instance.subscribeToModelChange((model) => {
      // Don't write the previewed snapshot back into the persistence store,
      // and don't capture it as the diagram thumbnail — preview is read-only
      // by contract.
      if (selectScopedPreview(useVersionStore.getState(), diagramId)) return
      updateModel(model)
      // The dashboard thumbnail is purely cosmetic, but rendering it mounts a
      // second, transient React Flow canvas (`exportAsSVG`'s off-screen 4000²
      // div). Under test automation that duplicate canvas races with editor
      // interactions — locators resolve to its off-screen clone. Skip the
      // thumbnail there; persistence (above) is unaffected.
      if (typeof navigator !== "undefined" && navigator.webdriver) return
      if (thumbnailExportTimeoutRef.current) {
        clearTimeout(thumbnailExportTimeoutRef.current)
      }

      const sequence = ++thumbnailExportSequenceRef.current
      thumbnailExportTimeoutRef.current = setTimeout(async () => {
        try {
          const exportedSvg = await instance.exportAsSVG({ svgMode: "compat" })
          if (
            sequence !== thumbnailExportSequenceRef.current ||
            isThumbnailExportCanceledRef.current
          ) {
            return
          }

          const normalizedSvg = normalizeThumbnailSvg(
            exportedSvg.svg,
            exportedSvg.clip.width,
            exportedSvg.clip.height
          )

          setThumbnail(model.id, normalizedSvg)
        } catch (error) {
          log.error("Failed to generate diagram thumbnail", error as Error)
        }
      }, THUMBNAIL_DEBOUNCE_MS)
    })

    setEditor(instance)
    void fetchVersions(diagram.id)

    // E2E seam (dev builds only — `import.meta.env.DEV` is statically false in
    // production, so this is dead-code-eliminated from the shipped bundle).
    // Exposes the imperative editor so Playwright can drive API surfaces that
    // have no UI affordance, e.g. `setElementHighlights`.
    if (import.meta.env.DEV) {
      ;(window as Window & { apollonEditor?: ApollonEditor }).apollonEditor =
        instance
    }
    const removePerfHooks = installPerfHooks(instance)

    return () => {
      isThumbnailExportCanceledRef.current = true
      thumbnailExportSequenceRef.current += 1
      removePerfHooks()
      if (import.meta.env.DEV) {
        delete (window as Window & { apollonEditor?: ApollonEditor })
          .apollonEditor
      }
      if (thumbnailExportTimeoutRef.current) {
        clearTimeout(thumbnailExportTimeoutRef.current)
        thumbnailExportTimeoutRef.current = null
      }

      log.debug("Cleaning up Apollon instance")
      instance.unsubscribe(subId)
      instance.destroy()
      // Keep the editor + currentModelId only when hopping to another /local/*
      // diagram (the next instance adopts them); clear on any other destination
      // so a destroyed editor can't linger in EditorContext.
      const isTransitioningToAnotherLocalDiagram = /^\/local\//.test(
        router.state.location.pathname
      )
      if (
        !isTransitioningToAnotherLocalDiagram &&
        usePersistenceModelStore.getState().currentModelId === diagram.id
      ) {
        setCurrentModelId(null)
        setEditor(undefined)
      }
    }
  }, [
    diagram?.id,
    router,
    setCurrentModelId,
    setEditor,
    setThumbnail,
    updateModel,
    fetchVersions,
  ])

  // -------- Preview overlay ---------------------------------------------
  // Imperative editor API in an effect, not a render-time mutation.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    if (!editor) return
    if (preview) {
      if (prePreviewFingerprintRef.current === null) {
        prePreviewFingerprintRef.current = structuralFingerprint(editor.model)
      }
      setCanRestoreFromPreview(
        prePreviewFingerprintRef.current !== structuralFingerprint(preview.body)
      )
      editor.setPreviewMode(true)
      try {
        // Imperative editor API (accessor setter), applied in an effect.
        // eslint-disable-next-line react-hooks/immutability
        editor.model = importDiagram(preview.body) as UMLModel
        editor.setReadonly(true)
        editor.fitView()
      } catch (err) {
        editor.setPreviewMode(false)
        prePreviewFingerprintRef.current = null
        log.error("Failed to apply previewed snapshot", err as Error)
        const isSchemaError =
          err instanceof Error && /schema|version|import/i.test(err.message)
        toast.error(
          isSchemaError ? t.failureSchemaUnsupported : t.previewFailed
        )
      }
    } else {
      editor.setReadonly(false)
      prePreviewFingerprintRef.current = null
      editor.setPreviewMode(false)
      editor.fitView()
    }
  }, [preview, editor])

  // -------- Restore (with confirm-when-dirty) ---------------------------

  /**
   * Resolves the `Diagram` body for a target version — uses the in-memory
   * preview body when it matches, otherwise reads from the local repository.
   */
  const resolveBody = useCallback(
    async (versionId: string): Promise<Diagram> => {
      if (preview?.versionId === versionId) return preview.body as Diagram
      if (!diagramId) {
        throw new Error("No current diagram id")
      }
      return getVersionRepository().getBody(diagramId, versionId)
    },
    [preview, diagramId]
  )

  /**
   * Apply restore: write the auto-snapshot row, then overlay the editor.
   * `restoreVersion` (the store action) calls `fetchVersions` internally,
   * so the page does NOT refetch again. The editor's
   * `subscribeToModelChange` propagates the new model to the persistence
   * store, so we don't `updateModel` explicitly either.
   */
  const performRestore = useCallback(
    async (versionId: string) => {
      if (!editor || !diagramId) return
      const summary = versions.find((v) => v.id === versionId)
      try {
        const body = await resolveBody(versionId)
        // While previewing, `editor.model` is the read-only overlay. Leave
        // preview so it resyncs to the live canvas — that's the body we want
        // as the "Before restoring …" undo snapshot, not the previewed version.
        if (preview) editor.setPreviewMode(false)
        const liveBody = editor.model
        await useVersionStore
          .getState()
          .restoreVersion(diagramId, versionId, liveBody)
        // Imperative editor API (accessor setter), applied in a callback.
        // eslint-disable-next-line react-hooks/immutability
        editor.model = importDiagram(body) as UMLModel
        editor.fitView()
        if (preview) closePreview()
        if (summary) {
          const label =
            summary.description.trim() ||
            summary.name.trim() ||
            (summary.seq !== undefined ? `v${summary.seq}` : "this version")
          toast.success(t.restoredSnack(label), { autoClose: 4000 })
        }
      } catch (err) {
        log.error("Restore failed", err as Error)
        toast.error(t.restoreFailed)
      }
    },
    [editor, diagramId, versions, preview, resolveBody, closePreview]
  )

  /**
   * Drawer / preview-banner entry point. Opens the confirm dialog only
   * when the canvas would be overwritten with different content;
   * restores immediately when the user is restoring the very state they
   * already have on canvas.
   */
  const handleConfirmedRestore = useCallback(
    // performRestore mutates editor.model imperatively; flagged by the compiler.
    // eslint-disable-next-line react-hooks/immutability
    async (versionId: string) => {
      if (!editor || !diagramId) return
      try {
        // Compare against the user's pre-preview canvas (if previewing)
        // so a V1→V2→V3 hop measures dirtiness vs. the canvas the user
        // had before opening preview, not the currently overlaid version.
        const baseline =
          prePreviewFingerprintRef.current ??
          structuralFingerprint(editor.model)
        const targetBody = await resolveBody(versionId)
        const dirty = baseline !== structuralFingerprint(targetBody)
        if (!dirty) {
          await performRestore(versionId)
          return
        }
        openModal("CONFIRM_RESTORE", {
          diagramId,
          versionId,
          onConfirm: async () => {
            await performRestore(versionId)
          },
        })
      } catch (err) {
        log.error("Restore preflight failed", err as Error)
        toast.error(t.restoreFailed)
      }
    },
    [editor, diagramId, resolveBody, performRestore, openModal]
  )

  const handleVersionSaved = useCallback(() => {
    // No-op locally — the persistence store has already saved any model
    // change via the `subscribeToModelChange` subscription.
  }, [])

  const handleExitPreview = useCallback(() => {
    closePreview()
  }, [closePreview])

  const banner = useMemo(() => {
    if (!preview || !diagramId) return null
    return (
      <div
        // Sit one gap BELOW the floating header islands (safe-area + edge 10 +
        // island-h 46 + gap 8) so the banner never overlaps the brand/title/
        // actions chrome — it reads as a sibling island on the row beneath.
        className="pointer-events-none absolute right-0 left-0 z-[5] flex justify-center px-4 [&>*]:pointer-events-auto"
        style={{ top: "calc(var(--safe-area-inset-top, 0px) + 64px)" }}
      >
        <VersionPreviewBanner
          containerWidth={canvasColumnWidth}
          diagramId={diagramId}
          canRestore={canRestoreFromPreview}
          onExit={handleExitPreview}
          onRestore={handleConfirmedRestore}
        />
      </div>
    )
  }, [
    preview,
    diagramId,
    canvasColumnWidth,
    canRestoreFromPreview,
    handleExitPreview,
    handleConfirmedRestore,
  ])

  // All hooks above run unconditionally. Creation happens from the home
  // gallery; a missing diagram is a not-found state, not an auto-create.
  if (!diagramId || !diagram) {
    return (
      <ErrorPage
        message="Diagram not found."
        buttonLabel="All diagrams"
        withChrome={false}
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div ref={canvasColumnRef} className="relative h-full min-w-0 flex-1">
          <div ref={containerRef} className="h-full w-full" />
          {banner}
        </div>
        <VersionRail
          diagramId={diagramId}
          onConfirmedRestore={handleConfirmedRestore}
          onVersionSaved={handleVersionSaved}
          onPreview={openPreview}
        />
      </div>
      <VersionDrawer
        diagramId={diagramId}
        onConfirmedRestore={handleConfirmedRestore}
        onVersionSaved={handleVersionSaved}
        onPreview={openPreview}
      />
      {/* No <UndoRestoreToast /> in local mode — auto-snapshot rows
          in the drawer are the durable replacement. */}
    </div>
  )
}
