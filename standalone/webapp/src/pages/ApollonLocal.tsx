import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react"
import { useLocation } from "react-router"
import { Box } from "@mui/material"
import { toast } from "react-toastify"
import {
  ApollonEditor,
  importDiagram,
  UMLDiagramType,
  type UMLModel,
} from "@tumaet/apollon"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext, useModalContext } from "@/contexts"
import { useElementWidth } from "@/hooks/useElementWidth"
import { useVersionShortcut } from "@/hooks/useVersionShortcut"
import { selectVersions, useVersionStore } from "@/stores/useVersionStore"
import {
  setVersionRepository,
  LocalVersionRepository,
  getVersionRepository,
} from "@/services/versionRepository"
import { ensureVersionStoreBootstrapped } from "@/stores/versionStoreBootstrap"
import {
  VersionDrawer,
  VersionPreviewBanner,
  VersionSidebar,
} from "@/components/versioning"
import { structuralFingerprint } from "@/lib/version/predicates"
import { versioningStrings as t } from "@/components/versioning/strings"
import type { Diagram } from "@/types"
import { log } from "@/logger"

/**
 * Standalone-mode page. Mounts the versioning UI against
 * `LocalVersionRepository` and uses `usePersistenceModelStore.currentModelId`
 * as the diagram id. No WebSocket, no autosave loop. Restore writes a
 * permanent "Before restoring …" auto-row instead of a 10s snackbar.
 */
export const ApollonLocal: FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasColumnRef = useRef<HTMLDivElement | null>(null)
  const canvasColumnWidth = useElementWidth(canvasColumnRef)
  const { setEditor, editor } = useEditorContext()
  const { openModal } = useModalContext()
  const { state } = useLocation()

  // Bootstrap once: cleanup-on-deleteModel subscription, BroadcastChannel
  // listener, visibility refetch.
  useEffect(() => {
    ensureVersionStoreBootstrapped()
  }, [])

  // Defensive: pages re-set the repo on mount so the holder is always
  // matched to the active route. Idempotent under StrictMode/HMR.
  useEffect(() => {
    setVersionRepository(LocalVersionRepository)
  }, [])

  const currentModelId = usePersistenceModelStore((s) => s.currentModelId)
  const diagram = usePersistenceModelStore((s) =>
    currentModelId ? s.models[currentModelId] : null
  )
  const createModelByTitleAndType = usePersistenceModelStore(
    (s) => s.createModelByTitleAndType
  )
  const updateModel = usePersistenceModelStore((s) => s.updateModel)

  const preview = useVersionStore((s) => s.preview)
  const exitPreview = useVersionStore((s) => s.exitPreview)
  const fetchVersions = useVersionStore((s) => s.fetchVersions)
  const versions = useVersionStore((s) =>
    currentModelId ? selectVersions(s, currentModelId) : []
  )

  useVersionShortcut(currentModelId ?? undefined)

  const prePreviewFingerprintRef = useRef<string | null>(null)
  const [canRestoreFromPreview, setCanRestoreFromPreview] = useState(false)

  // -------- Editor lifecycle --------------------------------------------
  useEffect(() => {
    if (!diagram) {
      createModelByTitleAndType("Class Diagram", UMLDiagramType.ClassDiagram)
      return
    }
    if (!containerRef.current) return

    const instance = new ApollonEditor(containerRef.current, {
      model: diagram.model,
    })

    const subId = instance.subscribeToModelChange((model) => {
      // Don't write the previewed snapshot back into the persistence
      // store — preview is read-only by contract.
      if (useVersionStore.getState().preview !== null) return
      updateModel(model)
    })

    setEditor(instance)
    void fetchVersions(diagram.id)

    return () => {
      log.debug("Cleaning up Apollon instance")
      instance.unsubscribe(subId)
      instance.destroy()
      setEditor(undefined)
    }
  }, [diagram?.id, state?.timeStapToCreate])

  // -------- Preview overlay ---------------------------------------------
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
      if (!currentModelId) {
        throw new Error("No current diagram id")
      }
      return getVersionRepository().getBody(currentModelId, versionId)
    },
    [preview, currentModelId]
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
      if (!editor || !currentModelId) return
      const summary = versions.find((v) => v.id === versionId)
      try {
        const body = await resolveBody(versionId)
        await useVersionStore
          .getState()
          .restoreVersion(currentModelId, versionId, editor.model)
        editor.model = importDiagram(body) as UMLModel
        editor.fitView()
        if (preview) exitPreview()
        if (summary) {
          const label =
            summary.description.trim() ||
            summary.name.trim() ||
            `v${summary.seq ?? ""}`
          toast.success(t.restoredSnack(label), { autoClose: 4000 })
        }
      } catch (err) {
        log.error("Restore failed", err as Error)
        toast.error(t.restoreFailed)
      }
    },
    [editor, currentModelId, versions, preview, resolveBody, exitPreview]
  )

  /**
   * Drawer / preview-banner entry point. Opens the confirm dialog only
   * when the canvas would be overwritten with different content;
   * restores immediately when the user is restoring the very state they
   * already have on canvas.
   */
  const handleConfirmedRestore = useCallback(
    async (versionId: string) => {
      if (!editor || !currentModelId) return
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
          diagramId: currentModelId,
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
    [editor, currentModelId, resolveBody, performRestore, openModal]
  )

  const handleVersionSaved = useCallback(() => {
    // No-op locally — the persistence store has already saved any model
    // change via the `subscribeToModelChange` subscription.
  }, [])

  const handleExitPreview = useCallback(() => {
    exitPreview()
  }, [exitPreview])

  const banner = useMemo(() => {
    if (!preview || !currentModelId) return null
    return (
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
          diagramId={currentModelId}
          canRestore={canRestoreFromPreview}
          onExit={handleExitPreview}
          onRestore={handleConfirmedRestore}
        />
      </Box>
    )
  }, [
    preview,
    currentModelId,
    canvasColumnWidth,
    canRestoreFromPreview,
    handleExitPreview,
    handleConfirmedRestore,
  ])

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
          <Box ref={containerRef} sx={{ width: "100%", height: "100%" }} />
          {banner}
        </Box>
        {currentModelId && (
          <VersionSidebar
            diagramId={currentModelId}
            onConfirmedRestore={handleConfirmedRestore}
            onVersionSaved={handleVersionSaved}
          />
        )}
      </Box>
      {currentModelId && (
        <VersionDrawer
          diagramId={currentModelId}
          onConfirmedRestore={handleConfirmedRestore}
          onVersionSaved={handleVersionSaved}
        />
      )}
      {/* No <UndoRestoreSnackbar /> in local mode — auto-snapshot rows
          in the drawer are the durable replacement. */}
    </div>
  )
}
