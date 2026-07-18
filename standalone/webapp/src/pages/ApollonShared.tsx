import React, { useCallback, useEffect, useRef, useState } from "react"
import { useEditorContext, useModalContext } from "@/contexts"
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
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"
import { DiagramView } from "@/types"
import { WebSocketManager } from "@/services/WebSocketManager"
import {
  createDiagramAutosaver,
  type DiagramAutosaver,
} from "@/services/createDiagramAutosaver"
import { selectScopedPreview, useVersionStore } from "@/stores/useVersionStore"
import {
  fetchFreshDiagram,
  isQueryCancellation,
  useDiagramSeedQuery,
} from "@/queries/diagramQueries"
import { diagramKeys } from "@/queries/keys"
import { prefetchVersions } from "@/queries/versionQueries"
import { useVersionRepositoryKind } from "@/contexts/VersionRepositoryContext"
import { useRestoreVersionMutation } from "@/queries/versionMutations"
import { applyControlEventToCache } from "@/queries/versionCacheEvents"
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
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts"
import { log } from "@/logger"
import { addSharedDiagramEntry } from "@/utils/sharedDiagramStorage"

// Route-bound API for typed params + search (avoids importing the route file,
// which would create a cycle: the route file imports this page).
const route = getRouteApi("/shared/$diagramId")

function readStoredCollabUser(): { name: string; color: string } | null {
  const storedName = sessionStorage.getItem("apollon-collab-name")
  return storedName
    ? { name: storedName, color: collabColorFromName(storedName) }
    : null
}

export const ApollonShared: React.FC = () => {
  const { diagramId } = route.useParams()
  const { view: viewType, version: previewFromUrl } = route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const kind = useVersionRepositoryKind()
  const { setEditor, editor } = useEditorContext()
  const { openModal } = useModalContext()
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
  const [collaborationUser, setCollaborationUser] =
    useState(readStoredCollabUser)

  const preview = useVersionStore((s) => selectScopedPreview(s, diagramId))
  const restoreMutation = useRestoreVersionMutation(kind, diagramId)
  const { openPreview, closePreview } = useVersionPreviewUrlSync(
    kind,
    diagramId,
    previewFromUrl,
    Boolean(editor)
  )

  useEditorShortcuts(diagramId)

  useFlushOnUnload({
    diagramId,
    getModel: () => editorRef.current?.model,
    isDirty: () => diagramIsUpdated.current,
  })

  // The component instance survives diagramId / viewType changes (same
  // `/:diagramId` route), so per-diagram refs must be reset explicitly per
  // route lifecycle. Declared FIRST so it runs before the prompt and mount
  // effects below.
  useEffect(() => {
    const nextLifecycleKey = `${diagramId ?? ""}:${viewType ?? ""}`
    if (lifecycleKeyRef.current === nextLifecycleKey) return
    lifecycleKeyRef.current = nextLifecycleKey
    diagramIsUpdated.current = false
    restoredDuringPreviewRef.current = false
    hasPromptedRef.current = false
  }, [diagramId, viewType])

  // validateSearch has already coerced an unknown ?view to undefined.
  useEffect(() => {
    if (viewType) return
    toast.error("Invalid view type")
    navigate({ to: "/" })
  }, [viewType, navigate])

  const isCollaborationView = viewType === DiagramView.COLLABORATE
  const needsCollabName = isCollaborationView && !collaborationUser

  // A stored name was already picked up by the lazy state initialiser, so
  // reaching here means there is none. Prompt once per diagram — the seed
  // query stays disabled until a name exists.
  useEffect(() => {
    if (!viewType || !needsCollabName || hasPromptedRef.current) return
    hasPromptedRef.current = true
    openModal("COLLABORATE_NAME", {
      initialName: randomCollabName(),
      onConfirm: (name: string) => {
        sessionStorage.setItem("apollon-collab-name", name)
        setCollaborationUser({ name, color: collabColorFromName(name) })
      },
      onClose: () => {
        navigate({ to: "/", replace: true })
      },
    })
  }, [viewType, needsCollabName, diagramId, openModal, navigate])

  // One-shot editor seed; while disabled (missing view / unresolved collab
  // name) the query reports `isPending`, which keeps the overlay up.
  const diagramQuery = useDiagramSeedQuery(diagramId, {
    enabled: Boolean(diagramId) && Boolean(viewType) && !needsCollabName,
  })
  const diagram = diagramQuery.data

  // Seed failure = nothing to edit. Cancellation never lands here — an
  // unmounted/reset query doesn't transition to error.
  useEffect(() => {
    if (!diagramQuery.isError) return
    log.error("Failed to initialize diagram", diagramQuery.error)
    toast.error("Failed to initialize diagram")
    navigate({ to: "/" })
  }, [diagramQuery.isError, diagramQuery.error, navigate])

  // Editor + connection lifecycle. Runs when the seed body arrives and tears
  // down on route identity change/unmount. The seed's `data` identity is
  // stable for the whole mount (staleTime Infinity; imperative HEAD refetches
  // use a separate cache key), so this effect can safely depend on it without
  // ever rebuilding the editor mid-session.
  useEffect(() => {
    const container = containerRef.current
    if (!container || !diagramId || !viewType || !diagram) return
    if (isCollaborationView && !collaborationUser) return

    let instance: ApollonEditor | null = null
    let modelChangeSubscriptionId: number | null = null

    try {
      log.debug("Initializing Apollon editor with view type:", viewType)
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
          applyControlEventToCache(queryClient, diagramId, event)
          if (event.type === "VERSION_RESTORED") {
            const state = useVersionStore.getState()
            const isLocalRestore =
              state.pendingRestoreFromId === event.restoredFromVersionId ||
              state.undoRestore?.restoredFromVersionId ===
                event.restoredFromVersionId
            if (!isLocalRestore) {
              const actor = event.actor || "A collaborator"
              fetchFreshDiagram(queryClient, diagramId, "peer-restore")
                .then((next) => {
                  if (instance) instance.model = next
                })
                .catch((err) => {
                  if (isQueryCancellation(err)) return
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

      void prefetchVersions(queryClient, kind, diagramId)
    } catch (err) {
      log.error("Failed to initialize diagram", err)
      toast.error("Failed to initialize diagram")
      navigate({ to: "/" })
    }

    return () => {
      // Don't let an in-flight HEAD read apply to a torn-down editor.
      void queryClient.cancelQueries({ queryKey: diagramKeys.heads(diagramId) })
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
    collaborationUser,
    diagram,
    diagramId,
    isCollaborationView,
    kind,
    navigate,
    queryClient,
    setEditor,
    viewType,
  ])

  const baseReadonly = viewType === DiagramView.SEE_FEEDBACK

  // Imperative preview-mode driver: caches a pre-preview fingerprint in a ref
  // and overlays the preview model via the editor's imperative API. These are
  // effect-phase side effects, not render-time mutations.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    if (!editor) return
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
        fetchFreshDiagram(queryClient, diagramId, "preview-exit")
          .then((head) => {
            editor.model = importDiagram(head) as UMLModel
            editor.fitView()
          })
          .catch((err) => {
            if (isQueryCancellation(err)) return
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
    return () => {
      // A late `editor.model = head` would clobber the next preview. Scoped to
      // this reason only — the WS peer-restore read must survive.
      void queryClient.cancelQueries({
        queryKey: diagramKeys.head(diagramId, "preview-exit"),
      })
    }
  }, [preview, editor, diagramId, baseReadonly, queryClient])

  // Stable identity: `handleRestore` deps on it, and the banner's `onRestore`
  // prop would churn every render otherwise.
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
        const { headRev } = await restoreMutation.mutateAsync({
          versionId,
          currentBody: liveBody,
        })
        handleVersionSaved(headRev)
        // Strip `?version=` so the URL sync doesn't re-enter the restored version.
        if (previewing) closePreview()
      } catch {
        restoredDuringPreviewRef.current = false
        toast.error(t.restoreFailed)
      }
    },
    [
      diagramId,
      editor,
      handleVersionSaved,
      // `mutateAsync` is stable; the mutation object is not.
      restoreMutation.mutateAsync,
      closePreview,
    ]
  )

  const isLoading = diagramQuery.isPending || !editor

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
