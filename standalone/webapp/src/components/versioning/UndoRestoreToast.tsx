import { useEffect, useRef, useState, type FC } from "react"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { useEditorContext } from "@/contexts"
import { useVersionStore } from "@/stores/useVersionStore"
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
const UndoRestoreToastBody: FC<{ restoredVersionName: string }> = ({
  restoredVersionName,
}) => {
  const undo = useVersionStore((s) => s.undoRestore)
  const triggerUndoRestore = useVersionStore((s) => s.triggerUndoRestore)
  const { editor } = useEditorContext()
  const [submitting, setSubmitting] = useState(false)

  const onUndo = async () => {
    if (!editor || submitting || !undo) return
    setSubmitting(true)
    try {
      await triggerUndoRestore(undo.diagramId, editor.model)
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
      <UndoRestoreToastBody restoredVersionName={undo.restoredVersionName} />
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
  }, [undo, dismiss])

  return null
}
