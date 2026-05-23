import React, { useCallback, useEffect, useRef, useState } from "react"
import { useEditorContext, useModalContext } from "@/contexts"
import {
  Apollon,
  ApollonMode,
  importDiagram,
  type ApollonEditor,
  type UMLModel,
} from "@tumaet/apollon/react"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { toast } from "react-toastify"
import { Box } from "@mui/material"
import { DiagramView } from "@/types"
import { WebSocketManager } from "@/services/WebSocketManager"
import { ApiError, DiagramApiClient } from "@/services/DiagramApiClient"
import { useVersionStore } from "@/stores/useVersionStore"
import {
  UndoRestoreSnackbar,
  VersionDrawer,
  VersionPreviewBanner,
  VersionSidebar,
} from "@/components/versioning"
import { versioningStrings as t } from "@/components/versioning/strings"
import { structuralFingerprint } from "@/components/versioning/utils"
import { useElementWidth } from "@/hooks/useElementWidth"
import { useFlushOnUnload } from "@/hooks/useFlushOnUnload"
import { useVersionShortcut } from "@/hooks/useVersionShortcut"
import { log } from "@/logger"
import { collabColorFromName, randomCollabName } from "@/utils/collaboration"
import { CollaboratorCursors } from "@/components/CollaboratorCursors"
import { CollaboratorPresenceBar } from "@/components/CollaboratorPresenceBar"
import { CollaboratorSelectionHighlights } from "@/components/CollaboratorSelectionHighlights"

export const ApollonWithConnection: React.FC = () => {
  const { diagramId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setEditor, editor } = useEditorContext()
  const { openModal } = useModalContext()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasColumnRef = useRef<HTMLDivElement | null>(null)
  const canvasColumnWidth = useElementWidth(canvasColumnRef)
  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const diagramIsUpdated = useRef(false)
  const lastObservedHeadRev = useRef<number | undefined>(undefined)
  const restoredDuringPreviewRef = useRef(false)
  // Canvas fingerprint at preview entry — pinned across V1→V2→V3 so the
  // banner's "restore" enablement always compares against the user's
  // pre-preview state, not against whichever overlay is currently shown.
  const prePreviewFingerprintRef = useRef<string | null>(null)
  const hasPromptedRef = useRef(false)
  const [canRestoreFromPreview, setCanRestoreFromPreview] = useState(false)
  const [collaborationUser, setCollaborationUser] = useState<{
    name: string
    color: string
  } | null>(null)

  const [initialDiagram, setInitialDiagram] = useState<UMLModel | null>(null)
  const [loadNonce, setLoadNonce] = useState(0)

  const viewType = searchParams.get("view")
  const previewFromUrl = searchParams.get("version")
  const isCollaborationActive =
    viewType === DiagramView.COLLABORATE && !!collaborationUser

  const preview = useVersionStore((s) => s.preview)
  const exitPreview = useVersionStore((s) => s.exitPreview)
  const restoreVersion = useVersionStore((s) => s.restoreVersion)
  const applyControlEvent = useVersionStore((s) => s.applyControlEvent)
  const fetchVersions = useVersionStore((s) => s.fetchVersions)

  useVersionShortcut(diagramId)

  useFlushOnUnload({
    diagramId,
    getModel: () => editor?.model,
    isDirty: () => diagramIsUpdated.current,
  })

  const isCollaborationView =
    (viewType as DiagramView) === DiagramView.COLLABORATE
  const baseReadonly = viewType === DiagramView.SEE_FEEDBACK
  const apollonMode =
    viewType === DiagramView.GIVE_FEEDBACK ||
    viewType === DiagramView.SEE_FEEDBACK
      ? ApollonMode.Assessment
      : ApollonMode.Modelling

  useEffect(() => {
    setInitialDiagram(null)
    diagramIsUpdated.current = false
    lastObservedHeadRev.current = undefined
    restoredDuringPreviewRef.current = false
    hasPromptedRef.current = false

    if (!diagramId) return

    const validViews = Object.values(DiagramView)
    if (!viewType || !validViews.includes(viewType as DiagramView)) {
      toast.error("Invalid view type")
      navigate("/")
      return
    }
    log.debug("Initializing Apollon editor with view type:", viewType)

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
        })
      }
      return
    }

    const abort = new AbortController()
    DiagramApiClient.fetchDiagram(diagramId, { signal: abort.signal })
      .then((diagram) => {
        if (abort.signal.aborted) return
        log.debug("Fetched diagram", {
          diagramId,
          nodeCount: diagram.nodes?.length ?? 0,
          edgeCount: diagram.edges?.length ?? 0,
        })
        setInitialDiagram(diagram as UMLModel)
        setLoadNonce((n) => n + 1)
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        log.error("Failed to initialize diagram", err)
        toast.error("Failed to initialize diagram")
        navigate("/")
      })

    return () => abort.abort()
  }, [
    diagramId,
    viewType,
    collaborationUser,
    isCollaborationView,
    navigate,
    openModal,
  ])

  useEffect(() => {
    if (!editor || !diagramId || !viewType) return

    const abort = new AbortController()

    if (isCollaborationView && collaborationUser) {
      editor.setLocalAwarenessState({
        user: collaborationUser,
        selectedElementId: null,
      })
    }

    if (
      [
        DiagramView.COLLABORATE,
        DiagramView.GIVE_FEEDBACK,
        DiagramView.SEE_FEEDBACK,
      ].includes(viewType as DiagramView)
    ) {
      wsManagerRef.current = new WebSocketManager(diagramId, editor, () =>
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
            DiagramApiClient.fetchDiagram(diagramId, { signal: abort.signal })
              .then((next) => {
                editor.model = next
              })
              .catch((err) => {
                if (err instanceof DOMException && err.name === "AbortError")
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

    let cleanupCursorTracking: (() => void) | null = null
    let selectionSubscriptionId: number | null = null

    if (isCollaborationView && collaborationUser) {
      const container = containerRef.current
      if (container) {
        const rafRef = { current: 0 as number }
        const pendingRef = {
          current: null as { x: number; y: number } | null,
        }

        const flushCursor = () => {
          if (pendingRef.current) {
            editor.setLocalAwarenessCursor(pendingRef.current)
            pendingRef.current = null
          }
          rafRef.current = 0
        }

        const handlePointerMove = (event: PointerEvent) => {
          const flowPosition = editor.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
          if (!flowPosition) return

          pendingRef.current = {
            x: flowPosition.x,
            y: flowPosition.y,
          }

          if (!rafRef.current) {
            rafRef.current = window.requestAnimationFrame(flushCursor)
          }
        }

        const handlePointerLeave = () => {
          editor.setLocalAwarenessCursor(null)
        }

        container.addEventListener("pointermove", handlePointerMove)
        container.addEventListener("pointerleave", handlePointerLeave)

        cleanupCursorTracking = () => {
          container.removeEventListener("pointermove", handlePointerMove)
          container.removeEventListener("pointerleave", handlePointerLeave)
          if (rafRef.current) {
            window.cancelAnimationFrame(rafRef.current)
            rafRef.current = 0
          }
          editor.setLocalAwarenessCursor(null)
        }
      }

      selectionSubscriptionId = editor.subscribeToSelectionChange(
        (selectedElementIds) => {
          const selectedElementId = selectedElementIds.at(-1) ?? null
          editor.setLocalAwarenessSelectedElement(selectedElementId)
        }
      )
    }

    syncIntervalRef.current = setInterval(() => {
      const previewing = useVersionStore.getState().preview !== null
      if (previewing) return
      if (!diagramIsUpdated.current) return
      // Collab: skip If-Match — Yjs guarantees convergence; HEAD-rev contention
      // is fake here. Single-editor views keep the optimistic check.
      const ifMatch = isCollaborationView
        ? undefined
        : lastObservedHeadRev.current
      DiagramApiClient.sendDiagramUpdate(diagramId, editor.model, { ifMatch })
        .then((res) => {
          lastObservedHeadRev.current = res.headRev
          diagramIsUpdated.current = false
        })
        .catch(async (err) => {
          if (err instanceof ApiError && err.code === "REVISION_MISMATCH") {
            // Rebase to the server's hint. If the meta is absent, KEEP the
            // prior rev rather than clearing it — clearing would let the next
            // tick PUT without an If-Match guard and clobber a concurrent writer.
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

    const modelChangeSubscriptionId = editor.subscribeToModelChange(() => {
      if (useVersionStore.getState().preview !== null) return
      diagramIsUpdated.current = true
    })

    void fetchVersions(diagramId)

    return () => {
      abort.abort()
      wsManagerRef.current?.cleanup()
      wsManagerRef.current = null
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      cleanupCursorTracking?.()
      if (selectionSubscriptionId !== null) {
        editor.setLocalAwarenessSelectedElement(null)
        editor.unsubscribe(selectionSubscriptionId)
      }
      editor.unsubscribe(modelChangeSubscriptionId)
    }
  }, [
    editor,
    diagramId,
    viewType,
    collaborationUser,
    isCollaborationView,
    applyControlEvent,
    fetchVersions,
  ])

  // URL `?version=` → preview state. One-way: drawer entries don't write to
  // the URL, so an empty URL alone is not a signal to exit; only the
  // transition from has-version to no-version (browser back / external removal).
  const prevPreviewFromUrl = useRef<string | null>(null)
  useEffect(() => {
    if (!diagramId || !editor) return
    if (previewFromUrl && preview?.versionId !== previewFromUrl) {
      void useVersionStore
        .getState()
        .enterPreview(diagramId, previewFromUrl)
        .catch(() => toast.error("This version is no longer available."))
    } else if (
      !previewFromUrl &&
      prevPreviewFromUrl.current !== null &&
      preview !== null
    ) {
      exitPreview()
    }
    prevPreviewFromUrl.current = previewFromUrl ?? null
  }, [previewFromUrl, preview?.versionId, diagramId, editor, exitPreview])

  // Imperative because the success/failure paths have different
  // model/fitView tails that don't reduce to a single reactive prop.
  useEffect(() => {
    if (!editor) return
    const abort = new AbortController()
    if (preview) {
      if (prePreviewFingerprintRef.current === null) {
        prePreviewFingerprintRef.current = structuralFingerprint(editor.model)
      }
      setCanRestoreFromPreview(
        prePreviewFingerprintRef.current !== structuralFingerprint(preview.body)
      )
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
      prePreviewFingerprintRef.current = null
      if (!diagramId) return

      if (restoredDuringPreviewRef.current) {
        // After a restore the server's HEAD is the new canonical state. Flip
        // preview off, then fetch HEAD and apply — the final `editor.model =`
        // runs with previewActive=false so writes hit Yjs and broadcast.
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
        editor.setPreviewMode(false)
        editor.fitView()
      }
    }
    return () => abort.abort()
  }, [preview, editor, diagramId, baseReadonly])

  const handleVersionSaved = useCallback((headRev?: number) => {
    if (typeof headRev === "number") {
      lastObservedHeadRev.current = headRev
    }
    diagramIsUpdated.current = false
  }, [])

  const handleExitPreview = useCallback(() => {
    if (!diagramId) return
    exitPreview()
    if (searchParams.has("version")) {
      const next = new URLSearchParams(searchParams)
      next.delete("version")
      setSearchParams(next, { replace: true })
    }
  }, [diagramId, exitPreview, searchParams, setSearchParams])

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
        if (searchParams.has("version")) {
          const next = new URLSearchParams(searchParams)
          next.delete("version")
          setSearchParams(next, { replace: true })
        }
      } catch {
        restoredDuringPreviewRef.current = false
        toast.error(t.restoreFailed)
      }
    },
    [
      diagramId,
      editor,
      handleVersionSaved,
      restoreVersion,
      searchParams,
      setSearchParams,
    ]
  )

  const handleApollonMount = useCallback(
    (instance: ApollonEditor) => {
      setEditor(instance)
      return () => setEditor(undefined)
    },
    [setEditor]
  )

  const isLoading = initialDiagram === null

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
          >
            {initialDiagram && (
              <Apollon
                key={`${diagramId}:${loadNonce}`}
                defaultModel={initialDiagram}
                collaborationEnabled
                readonly={baseReadonly}
                mode={apollonMode}
                onMount={handleApollonMount}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </Box>
          <CollaboratorPresenceBar isActive={isCollaborationActive} />
          <CollaboratorCursors
            containerRef={containerRef}
            isActive={isCollaborationActive && !preview}
          />
          <CollaboratorSelectionHighlights
            containerRef={containerRef}
            isActive={isCollaborationActive && !preview}
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
          />
        )}
      </Box>

      {diagramId && (
        <VersionDrawer
          diagramId={diagramId}
          onVersionSaved={handleVersionSaved}
        />
      )}
      <UndoRestoreSnackbar />
    </div>
  )
}
