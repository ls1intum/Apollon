import { useState } from "react"
import { toast } from "react-toastify"
import { Button } from "@tumaet/ui/components/button"
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
    <div className="flex flex-col gap-4">
      <p className="text-[var(--apollon-primary-contrast)]">
        {t.confirmRestoreBody(`'${label}'`)}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={closeModal} disabled={working}>
          {t.cancel}
        </Button>
        <Button onClick={handleConfirm} disabled={working}>
          {t.confirmRestoreButton}
        </Button>
      </div>
    </div>
  )
}
