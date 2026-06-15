import React, { useCallback, useEffect, useRef, useState } from "react"
import { useEditorContext, useModalContext } from "@/contexts"
import {
  setVersionRepository,
  RemoteVersionRepository,
} from "@/services/versionRepository"
import { ensureVersionStoreBootstrapped } from "@/stores/versionStoreBootstrap"
import {
  ApollonEditor,
  ApollonMode,
  collabColorFromName,
  importDiagram,
  randomCollabName,
  type ApollonOptions,
  type UMLModel,
} from "@tumaet/apollon/react"
import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { toast } from "react-toastify"
import { Box } from "@mui/material"
import { DiagramView } from "@/types"
import { WebSocketManager } from "@/services/WebSocketManager"
import { ApiError, DiagramApiClient } from "@/services/DiagramApiClient"
import { useVersionStore } from "@/stores/useVersionStore"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import {
  UndoRestoreSnackbar,
  VersionDrawer,
  VersionPreviewBanner,
  VersionSidebar,
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

export const ApollonWithConnection: React.FC = () => {
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
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const diagramIsUpdated = useRef(false)
  const lastObservedHeadRev = useRef<number | undefined>(undefined)
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

  const preview = useVersionStore((s) => s.preview)
  const restoreVersion = useVersionStore((s) => s.restoreVersion)
  // `?version=<id>` is the source of truth for preview, shared with the local
  // editor via one hook so the two can't drift. Writers (drawer/banner/restore)
  // call openPreview/closePreview; the hook mirrors URL→store.
  const { openPreview, closePreview } = useVersionPreviewUrlSync(
    diagramId,
    previewFromUrl,
    Boolean(editor)
  )
  const applyControlEvent = useVersionStore((s) => s.applyControlEvent)
  const fetchVersions = useVersionStore((s) => s.fetchVersions)

  useVersionShortcut(diagramId)

  // Bootstrap wires the cross-tab BroadcastChannel + visibility refetch +
  // cascade-delete subscription that local mode relies on; safe to install in
  // collab too (the persistence-store subscription has no effect when no local
  // diagram is being deleted).
  useEffect(() => {
    ensureVersionStoreBootstrapped()
  }, [])

  useFlushOnUnload({
    diagramId,
    getModel: () => editorRef.current?.model,
    isDirty: () => diagramIsUpdated.current,
  })

  useEffect(() => {
    // Bind the remote repository before this effect fetches versions (the
    // drawer no longer self-fetches). Set in the effect, not render, so render
    // stays pure; ordering before the fetch below is guaranteed.
    setVersionRepository(RemoteVersionRepository)
    const nextLifecycleKey = `${diagramId ?? ""}:${viewType ?? ""}`

    // The component instance survives diagramId / viewType / user
    // changes (same `/:diagramId` route), so state and refs must be
    // reset explicitly per route lifecycle, not on every rerender.
    if (lifecycleKeyRef.current !== nextLifecycleKey) {
      lifecycleKeyRef.current = nextLifecycleKey
      setIsLoading(true)
      diagramIsUpdated.current = false
      lastObservedHeadRev.current = undefined
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
        const validViews = Object.values(DiagramView)
        if (!viewType || !validViews.includes(viewType)) {
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

        syncIntervalRef.current = setInterval(() => {
          const previewing = useVersionStore.getState().preview !== null
          if (previewing) return
          if (!diagramIsUpdated.current || !diagramId || !instance) return
          // In collab, every connected peer autosaves the same Yjs-converged
          // model. If-Match would race them artificially — Yjs guarantees
          // content convergence, so HEAD revision contention isn't a real
          // conflict here. Single-editor views keep the optimistic check.
          const ifMatch = isCollaborationView
            ? undefined
            : lastObservedHeadRev.current
          DiagramApiClient.sendDiagramUpdate(diagramId, instance.model, {
            ifMatch,
          })
            .then((res) => {
              lastObservedHeadRev.current = res.headRev
              diagramIsUpdated.current = false
            })
            .catch(async (err) => {
              if (err instanceof ApiError && err.code === "REVISION_MISMATCH") {
                // Catch the server's hint and rebase to it; if the meta is
                // absent, KEEP the prior rev rather than clearing it —
                // clearing would let the very next tick PUT without an
                // If-Match guard and could clobber a concurrent writer.
                const meta = err.meta as { currentHeadRev?: number } | undefined
                if (typeof meta?.currentHeadRev === "number") {
                  lastObservedHeadRev.current = meta.currentHeadRev
                }
              } else {
                log.error("Autosave failed", err)
                toast.error("Failed to sync changes")
              }
            })
        }, 5000)

        modelChangeSubscriptionId = instance.subscribeToModelChange(() => {
          if (useVersionStore.getState().preview !== null) return
          diagramIsUpdated.current = true
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
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
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

  // Memoised because `handleRestoreFromPreview`'s useCallback lists it
  // as a dep — without stable identity the restore handler gets a fresh
  // closure every render and the banner's `onRestore` prop churns.
  const handleVersionSaved = useCallback((headRev?: number) => {
    if (typeof headRev === "number") {
      lastObservedHeadRev.current = headRev
    }
    diagramIsUpdated.current = false
  }, [])

  const handleExitPreview = useCallback(() => {
    // Removing `?version=` makes the URL↔preview hook exit preview.
    closePreview()
  }, [closePreview])

  const handleRestoreFromPreview = useCallback(
    async (versionId: string) => {
      if (!diagramId || !editor) return
      restoredDuringPreviewRef.current = true
      try {
        const { headRev } = await restoreVersion(
          diagramId,
          versionId,
          editor.model
        )
        handleVersionSaved(headRev)
        closePreview()
      } catch {
        restoredDuringPreviewRef.current = false
        toast.error(t.restoreFailed)
      }
    },
    [diagramId, editor, handleVersionSaved, restoreVersion, closePreview]
  )

  return (
    <div className="h-full flex flex-col">
      <Box
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Box
          ref={canvasColumnRef}
          sx={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            position: "relative",
          }}
        >
          {isLoading && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              Loading diagram…
            </Box>
          )}
          <Box
            className={isLoading ? "invisible" : ""}
            ref={containerRef}
            sx={{ width: "100%", height: "100%" }}
          />
          {!isLoading && preview && diagramId && (
            <Box
              sx={{
                position: "absolute",
                top: 12,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 5,
                px: 2,
                "& > *": { pointerEvents: "auto" },
              }}
            >
              <VersionPreviewBanner
                containerWidth={canvasColumnWidth}
                diagramId={diagramId}
                canRestore={canRestoreFromPreview}
                onExit={handleExitPreview}
                onRestore={handleRestoreFromPreview}
              />
            </Box>
          )}
        </Box>
        {diagramId && (
          <VersionSidebar
            diagramId={diagramId}
            onVersionSaved={handleVersionSaved}
            onPreview={openPreview}
          />
        )}
      </Box>

      {diagramId && (
        <VersionDrawer
          diagramId={diagramId}
          onVersionSaved={handleVersionSaved}
          onPreview={openPreview}
        />
      )}
      <UndoRestoreSnackbar />
    </div>
  )
}
