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
}

export const DeleteVersionModal = ({ diagramId, versionId }: Props) => {
  const { closeModal } = useModalContext()
  const deleteVersion = useVersionStore((s) => s.deleteVersion)
  const exitPreview = useVersionStore((s) => s.exitPreview)
  const previewingThis = useVersionStore(
    (s) => s.preview?.versionId === versionId
  )
  const target = useVersionStore((s) =>
    selectVersions(s, diagramId).find((v) => v.id === versionId)
  )
  const [working, setWorking] = useState(false)

  const onConfirm = async () => {
    setWorking(true)
    try {
      if (previewingThis) exitPreview()
      await deleteVersion(diagramId, versionId)
      closeModal()
    } catch (err) {
      log.error("Delete version failed", err)
      toast.error(t.deleteFailed)
    } finally {
      setWorking(false)
    }
  }

  const label = target
    ? target.description?.trim() || target.name?.trim() || t.unnamed
    : null

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[var(--apollon-primary-contrast)]">
        {label
          ? `'${label}' will be permanently removed. This cannot be undone.`
          : t.deleteFallbackBody}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={closeModal} disabled={working}>
          {t.cancel}
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={working}>
          {t.delete}
        </Button>
      </div>
    </div>
  )
}
