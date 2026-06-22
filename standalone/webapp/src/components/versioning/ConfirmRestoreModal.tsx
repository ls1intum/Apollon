import { Button, Stack } from "@mui/material"
import { useState } from "react"
import { toast } from "react-toastify"
import { Typography } from "@/components/Typography"
import { useModalContext } from "@/contexts"
import { selectVersions, useVersionStore } from "@/stores/useVersionStore"
import { log } from "@/logger"
import { versioningStrings as t } from "./strings"

interface Props {
  diagramId: string
  versionId: string
  /** Async restore action — provided by the page; the modal awaits it. */
  onConfirm: () => Promise<void> | void
}

/**
 * Local-mode replacement for collab's 10s undo snackbar. Opens only when
 * the canvas has unsaved changes; clean-canvas restores skip the modal.
 * The "Before restoring …" auto-snapshot row written by the repository
 * is the always-visible durable undo that pairs with this dialog.
 */
export const ConfirmRestoreModal = ({
  diagramId,
  versionId,
  onConfirm,
}: Props) => {
  const { closeModal } = useModalContext()
  const target = useVersionStore((s) =>
    selectVersions(s, diagramId).find((v) => v.id === versionId)
  )
  const [working, setWorking] = useState(false)

  const handleConfirm = async () => {
    setWorking(true)
    try {
      await onConfirm()
      closeModal()
    } catch (err) {
      log.error("Confirm restore failed", err as Error)
      toast.error(t.restoreFailed)
    } finally {
      setWorking(false)
    }
  }

  const label =
    target?.description?.trim() || target?.name?.trim() || "this version"

  return (
    <Stack spacing={2}>
      <Typography>{t.confirmRestoreBody(`'${label}'`)}</Typography>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={closeModal} disabled={working}>
          {t.cancel}
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleConfirm}
          disabled={working}
        >
          {t.confirmRestoreButton}
        </Button>
      </Stack>
    </Stack>
  )
}
