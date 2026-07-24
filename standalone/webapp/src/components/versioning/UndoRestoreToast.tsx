import { useEffect, useRef, useState, type FC } from "react"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { useEditorContext } from "@/contexts"
import { useVersionStore } from "@/stores/useVersionStore"
import { useUndoRestoreMutation } from "@/queries/versionMutations"
import { useVersionRepositoryKind } from "@/contexts/VersionRepositoryContext"
import type { RepositoryKind } from "@/services/versionRepository"
import { versioningStrings as t } from "./strings"

const UNDO_RESTORE_TOAST_ID = "undo-restore"

/**
 * Headless driver for the post-restore Undo affordance. Watches
 * `useVersionStore.undoRestore` and surfaces it as a react-toastify toast
 * (with an inline Undo button) so every notification in the app shares one
 * system and look. Auto-dismisses when the store's window expires.
 *
 * A component (mounted globally near the editor) rather than an imperative call,
 * so the wiring lives in one place in ApollonShared.
 */
const UndoRestoreToastBody: FC<{
  restoredVersionName: string
  /**
   * Resolved by the driver below, not from context: react-toastify renders
   * toast content at its `ToastContainer`, which is mounted at the app root —
   * outside the editor route's `VersionRepositoryProvider`.
   */
  kind: RepositoryKind
}> = ({ restoredVersionName, kind }) => {
  const undo = useVersionStore((s) => s.undoRestore)
  const dismiss = useVersionStore((s) => s.dismissUndoRestore)
  const undoRestore = useUndoRestoreMutation(kind)
  const { editor } = useEditorContext()
  const [submitting, setSubmitting] = useState(false)

  const onUndo = async () => {
    if (!editor || submitting || !undo) return
    // Refuse past the undo window. The snackbar should auto-dismiss before
    // this point, but guard defensively so a stale re-render can't restore
    // to a 10+ second old snapshot.
    if (Date.now() > undo.expiresAt) {
      dismiss()
      return
    }
    // Capture the canvas BEFORE leaving preview so the undo's own pre-restore
    // auto-snapshot records what the user is looking at right now; then exit
    // any active preview — restoring while previewing would leave the store
    // claiming a preview the canvas no longer shows.
    const currentBody = editor.model
    const store = useVersionStore.getState()
    if (store.preview !== null) store.exitPreview()
    setSubmitting(true)
    try {
      await undoRestore.mutateAsync({
        diagramId: undo.diagramId,
        autoSnapshotVersionId: undo.autoSnapshotVersionId,
        currentBody,
      })
      toast.dismiss(UNDO_RESTORE_TOAST_ID)
    } catch (err) {
      log.error("Undo restore failed", err)
      toast.error("Could not undo the restore.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex w-full items-center gap-3">
      <span className="flex-1">
        {t.restoredSnack(restoredVersionName || "the previous version")}
      </span>
      <button
        type="button"
        onClick={onUndo}
        disabled={submitting}
        className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-accent-strong transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t.undoRestore}
      </button>
    </div>
  )
}

export const UndoRestoreToast: FC = () => {
  const undo = useVersionStore((s) => s.undoRestore)
  const dismiss = useVersionStore((s) => s.dismissUndoRestore)
  // Read here — this driver renders inside the editor route's provider, while
  // the toast body it hands to react-toastify does not.
  const kind = useVersionRepositoryKind()
  const shownIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!undo) {
      // Store cleared the window (expired/undone elsewhere) — close the toast.
      if (shownIdRef.current) {
        toast.dismiss(UNDO_RESTORE_TOAST_ID)
        shownIdRef.current = null
      }
      return
    }

    const remaining = Math.max(0, undo.expiresAt - Date.now())
    if (remaining <= 0) {
      // Window already elapsed — clear it without flashing a toast.
      dismiss()
      return
    }

    const body = (
      <UndoRestoreToastBody
        restoredVersionName={undo.restoredVersionName}
        kind={kind}
      />
    )

    if (shownIdRef.current === undo.autoSnapshotVersionId) {
      toast.update(UNDO_RESTORE_TOAST_ID, {
        render: body,
        autoClose: remaining,
      })
    } else {
      toast.info(body, {
        toastId: UNDO_RESTORE_TOAST_ID,
        autoClose: remaining,
        closeOnClick: false,
        // When the toast closes (timeout or manual), clear the store window so
        // state stays in sync with what the user sees.
        onClose: () => {
          shownIdRef.current = null
          dismiss()
        },
      })
      shownIdRef.current = undo.autoSnapshotVersionId
    }
  }, [undo, dismiss, kind])

  return null
}
