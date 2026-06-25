import { useEffect, useState } from "react"
import { InfoIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { useNavigate } from "@tanstack/react-router"
import { useModalContext } from "@/contexts"
import { useModalProgress } from "@/contexts/ModalProgressContext"
import { DiagramView } from "@/types"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { randomCollabName } from "@tumaet/apollon"
import { sharedDiagramRoute } from "@/utils/sharedDiagramLinks"
import {
  HomeDialogActions,
  HomeDialogContent,
  HomeDialogField,
  HomeDialogNotice,
  HomeDialogTextInput,
} from "./HomeDialog"
import { ShareLinkRow, MODE_OPTIONS } from "./ShareLinkRow"
import { useShareableDiagram } from "./useShareableDiagram"

type ShareDashboardModalProps = {
  modelId?: string
}

const resolveProps = (props: unknown): ShareDashboardModalProps => {
  if (!props || typeof props !== "object") return {}
  const candidate = props as ShareDashboardModalProps
  return {
    modelId:
      typeof candidate.modelId === "string" ? candidate.modelId : undefined,
  }
}

export const ShareDashboardModal = (
  props: ShareDashboardModalProps | Record<string, unknown>
) => {
  const { modelId } = resolveProps(props)
  const { closeModal, openModal } = useModalContext()
  const navigate = useNavigate()

  const persistedModel = usePersistenceModelStore((state) =>
    modelId ? state.models[modelId] : null
  )
  const modelData = persistedModel?.model ?? null
  const [name, setName] = useState(
    persistedModel?.model?.title?.trim() || "Untitled Diagram"
  )
  const [collaborateName, setCollaborateName] = useState(
    () => sessionStorage.getItem("apollon-collab-name") || ""
  )

  const share = useShareableDiagram(modelData)

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
          navigate(sharedDiagramRoute(id, share.mode))
        },
      })
      return
    }
    closeModal()
    navigate(sharedDiagramRoute(share.diagramId, share.mode))
  }

  return (
    <HomeDialogContent>
      <HomeDialogNotice>
        {share.diagramId
          ? "Share your diagram as a link — choose edit, live collaboration, or feedback mode."
          : "Creates a live version of this diagram to share for collaboration and feedback."}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="ml-1 inline-flex cursor-help items-center"
                />
              }
              aria-label="More information"
            >
              <InfoIcon
                className="size-4"
                style={{ color: "var(--home-accent-base)" }}
                aria-hidden
              />
            </TooltipTrigger>
            <TooltipContent>
              {share.diagramId ? (
                <span style={{ display: "block", lineHeight: "1.6" }}>
                  • <b>Edit</b> — view &amp; modify, no live sync
                  <br />• <b>Collaborate</b> — real-time multi-user editing
                  <br />• <b>Add feedback</b> — reviewers annotate a read-only
                  view
                  <br />• <b>View feedback</b> — read-only view of submitted
                  annotations
                </span>
              ) : (
                <span>
                  A snapshot is uploaded to our servers — your local diagram is
                  untouched. Links stay active for 120 days, and the clock
                  resets whenever the diagram is opened or edited.
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </HomeDialogNotice>

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
      )}

      <HomeDialogActions
        cancelLabel={share.diagramId ? "Close" : "Cancel"}
        confirmLabel={share.diagramId ? "Open diagram" : "Create"}
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
