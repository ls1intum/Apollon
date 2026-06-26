import { useState } from "react"
import { toast } from "react-toastify"
import { Button } from "@tumaet/ui/components/button"
import {
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@tumaet/ui/components/alert-dialog"
import { useModalContext } from "@/contexts"
import {
  selectScopedPreview,
  useVersionStore,
  type PendingVersion,
} from "@/stores/useVersionStore"
import { useClosePreview } from "@/hooks/useVersionPreviewUrlSync"
import { log } from "@/logger"
import { versioningStrings as t } from "./strings"

interface DeleteVersionModalProps {
  diagramId: string
  versionId: string
  /**
   * The target version, already resolved by the opener (which has it in hand) —
   * passed in rather than re-read from the store, used only to name it in the
   * warning copy. `null` falls back to the generic body.
   */
  version: PendingVersion | null
}

export const DeleteVersionModal = ({
  diagramId,
  versionId,
  version,
}: DeleteVersionModalProps) => {
  const { closeModal } = useModalContext()
  const deleteVersion = useVersionStore((s) => s.deleteVersion)
  // Clearing `?version=` before delete stops the URL sync re-entering the
  // deleted version and flashing a spurious "unavailable" toast.
  const closePreview = useClosePreview()
  const previewingThis = useVersionStore(
    (s) => selectScopedPreview(s, diagramId)?.versionId === versionId
  )
  const [working, setWorking] = useState(false)

  const handleConfirm = async () => {
    setWorking(true)
    try {
      if (previewingThis) closePreview()
      await deleteVersion(diagramId, versionId)
      // Close only on success — a rejected delete keeps the dialog open so the
      // error toast lands in context (so the destructive action owns its own
      // close instead of the auto-dismissing AlertDialog primitive).
      closeModal()
    } catch (err) {
      log.error("Delete version failed", err)
      toast.error(t.deleteFailed)
    } finally {
      setWorking(false)
    }
  }

  const label = version
    ? version.description?.trim() || version.name?.trim() || t.unnamed
    : null

  return (
    <div className="flex flex-col gap-4">
      <AlertDialogDescription className="text-foreground">
        {label
          ? `'${label}' will be permanently removed. This cannot be undone.`
          : t.deleteFallbackBody}
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={working}>{t.cancel}</AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={working}
        >
          {t.delete}
        </Button>
      </AlertDialogFooter>
    </div>
  )
}
