import { Alert, Button, Snackbar } from "@mui/material"
import { useEffect, useState, type FC } from "react"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { useEditorContext } from "@/contexts"
import { useVersionStore } from "@/stores/useVersionStore"
import { versioningStrings as t } from "./strings"

/**
 * Surfaces the post-restore Undo affordance for ~10s. Mounted globally near
 * the editor; reads from `useVersionStore.undoRestore`.
 */
export const UndoRestoreSnackbar: FC = () => {
  const undo = useVersionStore((s) => s.undoRestore)
  const dismiss = useVersionStore((s) => s.dismissUndoRestore)
  const triggerUndoRestore = useVersionStore((s) => s.triggerUndoRestore)
  const { editor } = useEditorContext()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!undo) return
    const remaining = Math.max(0, undo.expiresAt - Date.now())
    const timer = setTimeout(dismiss, remaining)
    return () => clearTimeout(timer)
  }, [undo, dismiss])

  if (!undo) return null

  const onUndo = async () => {
    if (!editor || submitting) return
    setSubmitting(true)
    try {
      await triggerUndoRestore(undo.diagramId, editor.model)
    } catch (err) {
      log.error("Undo restore failed", err)
      toast.error("Could not undo the restore.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      onClose={dismiss}
    >
      <Alert
        severity="success"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={onUndo}
            disabled={submitting}
          >
            {t.undoRestore}
          </Button>
        }
      >
        {t.restoredSnack("the previous version")}
      </Alert>
    </Snackbar>
  )
}
