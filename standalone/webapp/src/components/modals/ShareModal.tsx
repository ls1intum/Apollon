import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useEditorContext, useModalContext } from "@/contexts"
import { useModalProgress } from "@/contexts/ModalProgressContext"
import { DiagramView } from "@/types"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { randomCollabName } from "@tumaet/apollon"
import { sharedDiagramRoute } from "@/utils/sharedDiagramLinks"
import { useSharedDiagramId } from "@/hooks/useSharedDiagramId"
import {
  HomeDialogActions,
  HomeDialogContent,
  HomeDialogField,
  HomeDialogNotice,
  HomeDialogTextInput,
} from "./HomeDialog"
import { ShareLinkRow, MODE_OPTIONS } from "./ShareLinkRow"
import { useShareableDiagram } from "./useShareableDiagram"
import { EmbedSnippetPanel } from "./EmbedSnippetPanel"

/**
 * In-editor "Share" dialog. Uploads a snapshot of the current diagram ONCE, then
 * shows one link whose access mode (edit / collaborate / feedback) is a property
 * of the link — switching it never creates a second copy. Reuses the shared
 * share core with the dashboard dialog. If the diagram is already shared, it
 * opens straight on the link.
 */
export const ShareModal = () => {
  const { editor } = useEditorContext()
  const { closeModal, openModal } = useModalContext()
  const navigate = useNavigate()

  const modelData = editor?.model ?? null
  const sharedId = useSharedDiagramId()
  const share = useShareableDiagram(modelData, sharedId)

  const [name, setName] = useState(
    () => editor?.model?.title?.trim() || "Untitled Diagram"
  )
  const [collaborateName, setCollaborateName] = useState(
    () => sessionStorage.getItem("apollon-collab-name") || ""
  )
  const hasLocalOriginal = Boolean(
    usePersistenceModelStore.getState().currentModelId
  )

  const { setLoading } = useModalProgress()
  useEffect(() => setLoading(share.isCreating), [share.isCreating, setLoading])

  const openShared = () => {
    if (!share.diagramId) return
    if (share.mode === DiagramView.COLLABORATE) {
      const id = share.diagramId
      openModal("COLLABORATE_NAME", {
        initialName: collaborateName.trim() || randomCollabName(),
        onConfirm: (chosen: string) => {
          sessionStorage.setItem("apollon-collab-name", chosen)
          setCollaborateName(chosen)
          closeModal()
          navigate(sharedDiagramRoute(id, share.mode))
        },
      })
      return
    }
    closeModal()
    navigate(sharedDiagramRoute(share.diagramId, share.mode))
  }

  return (
    <HomeDialogContent testId="share-modal-content">
      {/* Heads-up only on create; the shared view's field label + dropdown say enough. */}
      {!share.diagramId && (
        <HomeDialogNotice>
          A copy is uploaded so anyone with the link can open it — your local
          diagram stays untouched.
        </HomeDialogNotice>
      )}

      {!share.diagramId && (
        <HomeDialogField label="Name" htmlFor="share-diagram-name">
          <HomeDialogTextInput
            id="share-diagram-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            disabled={share.isCreating}
            placeholder="Diagram name"
          />
        </HomeDialogField>
      )}

      {share.diagramId && (
        <>
          <HomeDialogField label="Anyone with this link">
            <ShareLinkRow
              link={share.link}
              copied={share.copied}
              onCopy={() => void share.copy()}
              mode={share.mode}
              options={MODE_OPTIONS}
              onSelectMode={share.selectMode}
            />
          </HomeDialogField>

          {/* No opacity dim on the note below: `--home-text-secondary` is
              already a muted secondary tone (~6.4:1 on the dialog); a 70%
              opacity dropped it to ~3.2:1, under WCAG AA. */}
          {hasLocalOriginal && (
            <p className="text-xs text-[var(--home-text-secondary)]">
              Your local copy and its history stay on this device.
            </p>
          )}

          <EmbedSnippetPanel diagramId={share.diagramId} title={name} />
        </>
      )}

      <HomeDialogActions
        cancelLabel={share.diagramId ? "Close" : "Cancel"}
        confirmLabel={share.diagramId ? "Open diagram" : "Create share link"}
        loadingLabel="Creating..."
        loading={share.isCreating}
        confirmDisabled={!share.diagramId && !name.trim()}
        onCancel={closeModal}
        onConfirm={() =>
          share.diagramId ? openShared() : void share.create(name)
        }
      />
    </HomeDialogContent>
  )
}
