import { Box, Button, Paper, Snackbar } from "@mui/material"
import { useEffect, useState, type FC } from "react"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { useEditorContext } from "@/contexts"
import { useVersionStore } from "@/stores/useVersionStore"
import { versioningStrings as t } from "./strings"

/**
 * Surfaces the post-restore Undo affordance for ~10s. Mounted globally near
 * the editor; reads from `useVersionStore.undoRestore`.
 *
 * App theming is via CSS custom properties on `documentElement` — not MUI's
 * ThemeProvider — so we use a custom Paper instead of `<Alert>` to follow
 * the dark toggle correctly.
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
      <Paper
        elevation={6}
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 2,
          minWidth: 320,
          bgcolor: "var(--apollon-background-variant)",
          color: "var(--apollon-primary-contrast)",
          border: "1px solid var(--apollon-switch-box-border-color)",
          borderLeft: "3px solid var(--apollon-primary)",
          borderRadius: 1,
        }}
        role="alert"
      >
        <Box sx={{ flex: 1 }}>{t.restoredSnack("the previous version")}</Box>
        <Button
          size="small"
          onClick={onUndo}
          disabled={submitting}
          sx={{
            textTransform: "none",
            color: "var(--apollon-primary)",
            "&.Mui-disabled": {
              color: "var(--apollon-secondary)",
            },
          }}
        >
          {t.undoRestore}
        </Button>
      </Paper>
    </Snackbar>
  )
}
