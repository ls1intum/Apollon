import React, { useCallback, useEffect, useRef, useState } from "react"
import { useEditorContext, useModalContext } from "@/contexts"
import {
  setVersionRepository,
  RemoteVersionRepository,
} from "@/services/versionRepository"
import {
  ApollonEditor,
  ApollonMode,
  collabColorFromName,
  importDiagram,
  randomCollabName,
  type ApollonOptions,
  type UMLModel,
} from "@tumaet/apollon"
import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { toast } from "react-toastify"
import { DiagramView } from "@/types"
import { WebSocketManager } from "@/services/WebSocketManager"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import {
  createDiagramAutosaver,
  type DiagramAutosaver,
} from "@/services/createDiagramAutosaver"
import { selectScopedPreview, useVersionStore } from "@/stores/useVersionStore"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import {
  UndoRestoreToast,
  VersionDrawer,
  VersionPreviewBanner,
  VersionRail,
} from "@/components/versioning"
import { versioningStrings as t } from "@/components/versioning/strings"
import { structuralFingerprint } from "@/lib/version/predicates"
import { useVersionPreviewUrlSync } from "@/hooks/useVersionPreviewUrlSync"
import { useElementWidth } from "@/hooks/useElementWidth"
import { useFlushOnUnload } from "@/hooks/useFlushOnUnload"
import { useVersionShortcut } from "@/hooks/useVersionShortcut"
import { log } from "@/logger"
import { addSharedDiagramEntry } from "@/utils/sharedDiagramStorage"

// Route-bound API for typed params + search (avoids importing the route file,
// which would create a cycle: the route file imports this page).
const route = getRouteApi("/shared/$diagramId")

export const ApollonShared: React.FC = () => {
  const { diagramId } = route.useParams()
  const { view: viewType, version: previewFromUrl } = route.useSearch()
  const navigate = useNavigate()
  const { setEditor, editor } = useEditorContext()
  const { openModal } = useModalContext()
  const [isLoading, setIsLoading] = useState(true)
  const [diagramTitle, setDiagramTitle] = useState<string | null>(null)
  useDocumentTitle(diagramTitle)

  // Keep the tab title in sync with the (possibly collaborator-edited) shared
  // diagram name, the same way the local editor tracks it reactively.
  useEffect(() => {
    if (!editor) return
    // Seed the title from the editor once it mounts; subsequent updates come
    // through the subscription below.
    setDiagramTitle(editor.getDiagramMetadata().diagramTitle || null)
    const subscriptionId = editor.subscribeToDiagramNameChange((title) =>
      setDiagramTitle(title || null)
    )
    return () => editor.unsubscribe(subscriptionId)
  }, [editor])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasColumnRef = useRef<HTMLDivElement | null>(null)
  const canvasColumnWidth = useElementWidth(canvasColumnRef)
  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const autosaverRef = useRef<DiagramAutosaver | null>(null)
  const diagramIsUpdated = useRef(false)
  const editorRef = useRef<ApollonEditor | null>(null)
  const restoredDuringPreviewRef = useRef(false)
  /**
   * Fingerprint of the canvas at the FIRST preview entry of the current
   * preview session. Held until the user exits preview, so clicking
   * V1 → V2 → V3 always compares each against the user's pre-preview
   * canvas — not against whichever overlay is currently shown.
   */
  const prePreviewFingerprintRef = useRef<string | null>(null)
  const hasPromptedRef = useRef(false)
  const lifecycleKeyRef = useRef<string | null>(null)
  // True when the current preview's body differs from the canvas the user
  // had before entering preview. Computed once on preview entry and held
  // through the preview so the banner can show/hide "Restore" without
  // re-fingerprinting on every render. False = restoring would be a no-op
  // (e.g. the latest saved version with no unsaved local changes).
  const [canRestoreFromPreview, setCanRestoreFromPreview] = useState(false)
  const [collaborationUser, setCollaborationUser] = useState<{
    name: string
    color: string
  } | null>(null)

  const preview = useVersionStore((s) => selectScopedPreview(s, diagramId))
  const restoreVersion = useVersionStore((s) => s.restoreVersion)
  const { openPreview, closePreview } = useVersionPreviewUrlSync(
    diagramId,
    previewFromUrl,
    Boolean(editor)
  )
  const applyControlEvent = useVersionStore((s) => s.applyControlEvent)
  const fetchVersions = useVersionStore((s) => s.fetchVersions)

  useVersionShortcut(diagramId)

  useFlushOnUnload({
    diagramId,
    getModel: () => editorRef.current?.model,
    isDirty: () => diagramIsUpdated.current,
  })

  useEffect(() => {
    // Bind the remote repository before this effect fetches versions. Set in
    // the effect, not render, so render stays pure; ordering before the fetch
    // below is guaranteed.
    setVersionRepository(RemoteVersionRepository)
    const nextLifecycleKey = `${diagramId ?? ""}:${viewType ?? ""}`

    // The component instance survives diagramId / viewType / user
    // changes (same `/:diagramId` route), so state and refs must be
    // reset explicitly per route lifecycle, not on every rerender.
    if (lifecycleKeyRef.current !== nextLifecycleKey) {
      lifecycleKeyRef.current = nextLifecycleKey
      setIsLoading(true)
      diagramIsUpdated.current = false
      restoredDuringPreviewRef.current = false
      hasPromptedRef.current = false
    }

    const abort = new AbortController()
    let instance: ApollonEditor | null = null
    let modelChangeSubscriptionId: number | null = null

    const initialize = async () => {
      const container = containerRef.current
      if (!container || !diagramId) return

      try {
        // validateSearch has already coerced an unknown ?view to undefined.
        if (!viewType) {
          toast.error("Invalid view type")
          navigate({ to: "/" })
          return
        }
        log.debug("Initializing Apollon editor with view type:", viewType)

        const isCollaborationView = viewType === DiagramView.COLLABORATE
        if (isCollaborationView && !collaborationUser) {
          const storedName = sessionStorage.getItem("apollon-collab-name")
          if (storedName) {
            setCollaborationUser({
              name: storedName,
              color: collabColorFromName(storedName),
            })
          } else if (!hasPromptedRef.current) {
            hasPromptedRef.current = true
            openModal("COLLABORATE_NAME", {
              initialName: randomCollabName(),
              onConfirm: (name: string) => {
                sessionStorage.setItem("apollon-collab-name", name)
                setCollaborationUser({
                  name,
                  color: collabColorFromName(name),
                })
              },
              onClose: () => {
                navigate({ to: "/", replace: true })
              },
            })
          }
          return
        }

        const diagram = await DiagramApiClient.fetchDiagram(diagramId, {
          signal: abort.signal,
        })
        if (abort.signal.aborted) return
        addSharedDiagramEntry(diagramId, { lastSharedView: viewType })
        log.debug("Fetched diagram", {
          diagramId,
          nodeCount: diagram.nodes?.length ?? 0,
          edgeCount: diagram.edges?.length ?? 0,
        })

        const editorOptions: ApollonOptions = {
          model: diagram,
          collaborationEnabled: true,
          collaboration:
            isCollaborationView && collaborationUser
              ? {
                  enabled: true,
                  user: collaborationUser,
                  showPresence: true,
                  showCursors: true,
                  showSelectionHighlights: true,
                  showFollow: true,
                }
              : undefined,
        }

        if (viewType === DiagramView.GIVE_FEEDBACK) {
          editorOptions.mode = ApollonMode.Assessment
          editorOptions.readonly = false
        } else if (viewType === DiagramView.SEE_FEEDBACK) {
          editorOptions.mode = ApollonMode.Assessment
          editorOptions.readonly = true
        } else {
          editorOptions.mode = ApollonMode.Modelling
          editorOptions.readonly = false
        }

        instance = new ApollonEditor(container, editorOptions)
        editorRef.current = instance
        setEditor(instance)
        setIsLoading(false)

        if (
          [
            DiagramView.COLLABORATE,
            DiagramView.GIVE_FEEDBACK,
            DiagramView.SEE_FEEDBACK,
          ].includes(viewType)
        ) {
          wsManagerRef.current = new WebSocketManager(diagramId, instance, () =>
            toast.error("WebSocket error")
          )
          wsManagerRef.current.startConnection()
          wsManagerRef.current.onControl((event) => {
            applyControlEvent(diagramId, event)
            if (event.type === "VERSION_RESTORED") {
              const state = useVersionStore.getState()
              const isLocalRestore =
                state.pendingRestoreFromId === event.restoredFromVersionId ||
                state.undoRestore?.restoredFromVersionId ===
                  event.restoredFromVersionId
              if (!isLocalRestore) {
                const actor = event.actor || "A collaborator"
                DiagramApiClient.fetchDiagram(diagramId, {
                  signal: abort.signal,
                })
                  .then((next) => {
                    if (instance) instance.model = next
                  })
                  .catch((err) => {
                    if (
                      err instanceof DOMException &&
                      err.name === "AbortError"
                    )
                      return
                    toast.error(
                      `${actor} restored a version but we couldn't refresh.`,
                      { toastId: "version-restored-refetch-failed" }
                    )
                  })
                toast.info(t.collaboratorRestoredTitle(actor), {
                  toastId: "version-restored-by-collaborator",
                  autoClose: 4000,
                })
              }
            }
          })
        }

        const editorInstance = instance
        const autosaver = createDiagramAutosaver({
          diagramId,
          getModel: () => editorInstance.model,
          isPaused: () =>
            selectScopedPreview(useVersionStore.getState(), diagramId) !== null,
          collaboration: isCollaborationView,
          onSaved: () => {
            diagramIsUpdated.current = false
          },
          onError: () => toast.error("Failed to sync changes"),
        })
        autosaverRef.current = autosaver

        modelChangeSubscriptionId = instance.subscribeToModelChange(() => {
          if (selectScopedPreview(useVersionStore.getState(), diagramId)) return
          diagramIsUpdated.current = true
          autosaver.schedule()
        })

        void fetchVersions(diagramId)
        // Preview from `?version=` is handled by the dedicated URL ↔
        // preview-state sync effect below; this effect just initialises
        // the editor and connection.
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        log.error("Failed to initialize diagram", err)
        toast.error("Failed to initialize diagram")
        navigate({ to: "/" })
      }
    }

    void initialize()

    return () => {
      abort.abort()
      setEditor(undefined)
      wsManagerRef.current?.cleanup()
      // If a version preview is still open at teardown, the editor's local
      // model is the previewed snapshot and the autosaver is paused — flushing
      // as-is would either skip a pending pre-preview edit (paused) or persist
      // the stale snapshot. Exit preview first: setPreviewMode(false) resyncs
      // the editor from the live Yjs doc (the real diagram), and exitPreview()
      // clears the pause, so the flush below captures and persists it.
      if (
        instance &&
        selectScopedPreview(useVersionStore.getState(), diagramId) !== null
      ) {
        instance.setPreviewMode(false)
        useVersionStore.getState().exitPreview()
      }
      // Persist any pending debounced edits before tearing down (e.g. SPA
      // navigation): flush() reads the model synchronously, so it captures the
      // latest state while the editor is still alive, then dispose() stops it.
      void autosaverRef.current?.flush()
      autosaverRef.current?.dispose()
      autosaverRef.current = null
      if (instance) {
        if (modelChangeSubscriptionId !== null) {
          instance.unsubscribe(modelChangeSubscriptionId)
        }
      }
      instance?.destroy()
      editorRef.current = null
    }
  }, [
    applyControlEvent,
    collaborationUser,
    diagramId,
    fetchVersions,
    navigate,
    openModal,
    setEditor,
    viewType,
  ])

  // URL↔preview sync (deep-link open, history nav, drawer click) is handled by
  // useVersionPreviewUrlSync above — the same hook the local editor uses.

  const baseReadonly = viewType === DiagramView.SEE_FEEDBACK

  // Imperative preview-mode driver: caches a pre-preview fingerprint in a ref
  // and overlays the preview model via the editor's imperative API. These are
  // effect-phase side effects, not render-time mutations.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    if (!editor) return
    const abort = new AbortController()
    if (preview) {
      // First preview entry of this session — capture the user's
      // pre-preview canvas fingerprint so V1→V2→V3 hops keep comparing
      // each candidate against the same baseline.
      if (prePreviewFingerprintRef.current === null) {
        prePreviewFingerprintRef.current = structuralFingerprint(editor.model)
      }
      setCanRestoreFromPreview(
        prePreviewFingerprintRef.current !== structuralFingerprint(preview.body)
      )
      // Library-level preview mode: store mutators stop writing to the
      // Yjs doc (the collaborative source of truth). The next
      // `editor.model =` assignment overlays the preview body purely in
      // the local Zustand cache. Peer edits keep flowing into Yjs in the
      // background; on exit, Zustand re-syncs from Yjs and the canvas
      // catches up to whatever collaborators committed during preview.
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
        log.error("Failed to apply previewed snapshot", err)
        const isSchemaError =
          err instanceof Error && /schema|version|import/i.test(err.message)
        toast.error(
          isSchemaError ? t.failureSchemaUnsupported : t.previewFailed
        )
      }
    } else {
      editor.setReadonly(baseReadonly)
      prePreviewFingerprintRef.current = null
      if (!diagramId) return

      if (restoredDuringPreviewRef.current) {
        // After a restore, the server's HEAD is now the new canonical
        // state. Flip preview off (Zustand resyncs from Yjs to a stale
        // intermediate), then fetch HEAD and apply — that final
        // `editor.model = head` runs with previewActive=false so writes
        // hit Yjs and broadcast to peers.
        restoredDuringPreviewRef.current = false
        editor.setPreviewMode(false)
        DiagramApiClient.fetchDiagram(diagramId, { signal: abort.signal })
          .then((head) => {
            editor.model = importDiagram(head) as UMLModel
            editor.fitView()
          })
          .catch((err) => {
            if (err instanceof DOMException && err.name === "AbortError") return
            log.error("Failed to reload diagram after restore", err)
            toast.error(t.failureSchemaUnsupported)
          })
      } else {
        // Plain preview exit: turn off preview mode. The library
        // resyncs Zustand from Yjs which has been receiving peer edits
        // throughout, so the canvas catches up automatically — no
        // model snapshot, no resync round-trip, no Yjs mutation.
        editor.setPreviewMode(false)
        editor.fitView()
      }
    }
    return () => abort.abort()
  }, [preview, editor, diagramId, baseReadonly])

  // Memoised because `handleRestore`'s useCallback lists it as a dep —
  // without stable identity the restore handler gets a fresh closure every
  // render and the banner's `onRestore` prop churns.
  const handleVersionSaved = useCallback((headRev?: number) => {
    autosaverRef.current?.setHeadRev(headRev)
    diagramIsUpdated.current = false
  }, [])

  const handleExitPreview = useCallback(() => {
    // Removing `?version=` makes the URL↔preview hook exit preview.
    closePreview()
  }, [closePreview])

  // One restore path for the banner and the drawer. While previewing,
  // `editor.model` is the read-only overlay — persisting it as the pre-restore
  // undo snapshot would make Undo restore the very version we just restored.
  // Leave preview first so editor.model resyncs to the live canvas.
  const handleRestore = useCallback(
    async (versionId: string) => {
      if (!diagramId || !editor) return
      const previewing =
        selectScopedPreview(useVersionStore.getState(), diagramId) !== null
      if (previewing) {
        restoredDuringPreviewRef.current = true
        editor.setPreviewMode(false)
      }
      const liveBody = editor.model
      try {
        const { headRev } = await restoreVersion(diagramId, versionId, liveBody)
        handleVersionSaved(headRev)
        // Strip `?version=` so the URL sync doesn't re-enter the restored version.
        if (previewing) closePreview()
      } catch {
        restoredDuringPreviewRef.current = false
        toast.error(t.restoreFailed)
      }
    },
    [diagramId, editor, handleVersionSaved, restoreVersion, closePreview]
  )

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div ref={canvasColumnRef} className="relative h-full min-w-0 flex-1">
          {isLoading && (
            <div className="absolute inset-0 z-[1] flex items-center justify-center">
              Loading diagram…
            </div>
          )}
          <div
            className={`h-full w-full ${isLoading ? "invisible" : ""}`}
            ref={containerRef}
          />
          {!isLoading && preview && diagramId && (
            <div className="pointer-events-none absolute left-0 right-0 top-3 z-[5] flex justify-center px-4 [&>*]:pointer-events-auto">
              <VersionPreviewBanner
                containerWidth={canvasColumnWidth}
                diagramId={diagramId}
                canRestore={canRestoreFromPreview}
                onExitPreview={handleExitPreview}
                onRestore={handleRestore}
              />
            </div>
          )}
        </div>
        {diagramId && (
          <VersionRail
            diagramId={diagramId}
            onVersionSaved={handleVersionSaved}
            onConfirmedRestore={handleRestore}
            onPreview={openPreview}
          />
        )}
      </div>

      {diagramId && (
        <VersionDrawer
          diagramId={diagramId}
          onVersionSaved={handleVersionSaved}
          onConfirmedRestore={handleRestore}
          onPreview={openPreview}
        />
      )}
      <UndoRestoreToast />
    </div>
  )
}
