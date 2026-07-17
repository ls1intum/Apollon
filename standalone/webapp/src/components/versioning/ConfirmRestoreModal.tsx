import { useState } from "react"
import { toast } from "react-toastify"
import { Button } from "@tumaet/ui/components/button"
import {
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@tumaet/ui/components/alert-dialog"
import { useModalContext } from "@/contexts"
import type { PendingVersion } from "@/types"
import { log } from "@/logger"
import { versioningStrings as t } from "./strings"

interface ConfirmRestoreModalProps {
  /**
   * The target version, already resolved by the opener (which has it in hand) —
   * passed in rather than re-read from the store. `null` falls back to generic
   * "this version" copy.
   */
  version: PendingVersion | null
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
  version,
  onConfirm,
}: ConfirmRestoreModalProps) => {
  const { closeModal } = useModalContext()
  const [working, setWorking] = useState(false)

  const handleConfirm = async () => {
    setWorking(true)
    try {
      await onConfirm()
      // Close only on success — a rejected restore keeps the dialog open so
      // the error toast lands in context (so the confirm action owns its own
      // close instead of the auto-dismissing AlertDialog primitive).
      closeModal()
    } catch (err) {
      log.error("Confirm restore failed", err as Error)
      toast.error(t.restoreFailed)
    } finally {
      setWorking(false)
    }
  }

  const label =
    version?.description?.trim() || version?.name?.trim() || "this version"

  return (
    <div className="flex flex-col gap-4">
      <AlertDialogDescription className="text-foreground">
        {t.confirmRestoreBody(`'${label}'`)}
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={working}>{t.cancel}</AlertDialogCancel>
        <Button variant="default" onClick={handleConfirm} disabled={working}>
          {t.confirmRestoreButton}
        </Button>
      </AlertDialogFooter>
    </div>
  )
}
