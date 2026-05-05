import { Tooltip } from "@mui/material"
import { Typography } from "@/components/Typography"
import Info from "@mui/icons-material/Info"
import { APButton } from "../APButton"
import { toast } from "react-toastify"
import { useEditorContext, useModalContext } from "@/contexts"
import { useNavigate } from "react-router"
import { DiagramView } from "@/types"
import { DiagramAPIManager } from "@/services/DiagramAPIManager"
import { log } from "@/logger"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { addSharedDiagramEntry } from "@/utils/sharedDiagramStorage"

type ShareModalProps = {
  modelId?: string
}

const resolveModelId = (props: unknown): string | undefined => {
  if (!props || typeof props !== "object") {
    return undefined
  }

  const candidate = (props as ShareModalProps).modelId
  return typeof candidate === "string" ? candidate : undefined
}

export const ShareModal = (props: unknown) => {
  const modelId = resolveModelId(props)
  const { editor } = useEditorContext()
  const { closeModal } = useModalContext()
  const navigate = useNavigate()
  const persistedModel = usePersistenceModelStore((state) =>
    modelId ? state.models[modelId]?.model : null
  )

  const handleShareButtonPress = async (viewType: DiagramView) => {
    const modelToShare = editor?.model ?? persistedModel

    if (!modelToShare) {
      toast.error("Diagram data is not available for sharing.")
      return
    }

    try {
      const { id: diagramID } = await DiagramAPIManager.createDiagram(modelToShare)
      addSharedDiagramEntry(diagramID)

      const newurl = `${window.location.origin}/shared/${diagramID}?view=${viewType}`
      copyToClipboard(newurl)
      navigate(`/shared/${diagramID}?view=${viewType}`)

      toast.success(
        `The link has been copied to your clipboard and can be shared to collaborate, simply by pasting the link. You can re-access the link by going to share menu.`,
        {
          autoClose: 10000,
        }
      )
      closeModal()
    } catch (err) {
      log.error("Error creating diagram:", err as Error)
      toast.error("Could not create diagram.")
    }
  }

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography>
          After sharing, this diagram will be accessible to everyone with access
          to the link for at least 12 weeks{" "}
          <Tooltip title="Copy link to clipboard">
            <Info />
          </Tooltip>
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <div>
          <APButton
            variant="outline"
            fullWidth
            onClick={() => handleShareButtonPress(DiagramView.EDIT)}
          >
            Edit
          </APButton>
        </div>
        <div>
          <APButton
            variant="outline"
            fullWidth
            onClick={() => handleShareButtonPress(DiagramView.COLLABORATE)}
          >
            Collaborate
          </APButton>
        </div>
        <div>
          <APButton
            variant="outline"
            fullWidth
            onClick={() => handleShareButtonPress(DiagramView.GIVE_FEEDBACK)}
          >
            Give Feedback
          </APButton>
        </div>
        <div>
          <APButton
            variant="outline"
            fullWidth
            onClick={() => handleShareButtonPress(DiagramView.SEE_FEEDBACK)}
          >
            See Feedback
          </APButton>
        </div>
      </div>
      <fieldset className="border border-gray-300 p-2 rounded-xl w-fill ">
        <legend className="text-sm px-2 text-[var(--apollon-primary-contrast)]">
          Recently shared Diagram:
        </legend>
        <div className="flex items-center ">
          <input
            type="text"
            value={window.location.href}
            readOnly
            className="grow h-[42px] px-3 py-2 border rounded-md border-r-0 rounded-r-none border-[var(--apollon-primary-contrast)] bg-[var(--apollon-background)] text-[var(--apollon-primary-contrast)]"
          />
          <APButton
            onClick={() => copyToClipboard(window.location.href)}
            variant="outline"
            className=" rounded-l-none h-[42px]"
          >
            Copy Link
          </APButton>
        </div>
      </fieldset>
    </div>
  )
}
