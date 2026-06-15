import { Typography } from "@/components/Typography"
import { useEditorContext, useModalContext } from "@/contexts"
import { log } from "@/logger"
import { randomCollabName } from "@tumaet/apollon"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import { DiagramView } from "@/types"
import { Clipboard } from "@capacitor/clipboard"
import { isPlatform } from "@ionic/react"
import Info from "@mui/icons-material/Info"
import { Tooltip } from "@mui/material"
import { useNavigate } from "react-router"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { addSharedDiagramEntry } from "@/utils/sharedDiagramStorage"
import {
  buildSharedDiagramPath,
  buildSharedDiagramUrl,
} from "@/utils/sharedDiagramLinks"

export const ShareModal = () => {
  const { editor } = useEditorContext()
  const { closeModal, openModal } = useModalContext()
  const navigate = useNavigate()

  const handleShareButtonPress = async (viewType: DiagramView) => {
    if (!editor) {
      toast.error("Editor instance is not available.")
      return
    }

    try {
      const model = editor.model
      const { id: diagramID } = await DiagramApiClient.createDiagram(model)
      addSharedDiagramEntry(diagramID, { lastSharedView: viewType })

      // buildSharedDiagramUrl resolves a native-aware origin internally.
      const newurl = buildSharedDiagramUrl(diagramID, viewType)

      await copyToClipboard(newurl)
      navigate(buildSharedDiagramPath(diagramID, viewType))
      closeModal()

      toast.success(
        `The link has been copied to your clipboard and can be shared to collaborate, simply by pasting the link. You can re-access the link by going to share menu.`,
        {
          autoClose: 10000,
        }
      )
    } catch (err) {
      log.error("Error creating diagram:", err as Error)
      toast.error("Could not create diagram.")
    }
  }

  const copyToClipboard = async (link: string) => {
    if (isPlatform("capacitor")) {
      await Clipboard.write({ string: link })
    } else {
      await navigator.clipboard.writeText(link)
    }
  }

  const handleCollaborate = () => {
    const storedName =
      sessionStorage.getItem("apollon-collab-name") || randomCollabName()
    openModal("COLLABORATE_NAME", {
      initialName: storedName,
      onConfirm: (name: string) => {
        sessionStorage.setItem("apollon-collab-name", name)
        handleShareButtonPress(DiagramView.COLLABORATE)
      },
    })
  }

  return (
    <div
      className="flex min-w-0 flex-col gap-4 sm:gap-6"
      data-testid="share-modal-content"
    >
      <div>
        <Typography>
          After sharing, this diagram will be accessible to everyone with access
          to the link for at least 12 weeks{" "}
          <Tooltip title="Copy link to clipboard">
            <Info />
          </Tooltip>
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <Button
            variant="outline"
            fullWidth
            onClick={() => handleShareButtonPress(DiagramView.EDIT)}
          >
            Edit
          </Button>
        </div>
        <div>
          <Button variant="outline" fullWidth onClick={handleCollaborate}>
            Collaborate
          </Button>
        </div>
        <div>
          <Button
            variant="outline"
            fullWidth
            onClick={() => handleShareButtonPress(DiagramView.GIVE_FEEDBACK)}
          >
            Give Feedback
          </Button>
        </div>
        <div>
          <Button
            variant="outline"
            fullWidth
            onClick={() => handleShareButtonPress(DiagramView.SEE_FEEDBACK)}
          >
            See Feedback
          </Button>
        </div>
      </div>
      <fieldset className="min-w-0 rounded-xl border border-gray-300 p-2">
        <legend className="text-sm px-2 text-[var(--apollon-primary-contrast)]">
          Recently shared Diagram:
        </legend>
        <div className="flex min-w-0 items-center">
          <input
            type="text"
            value={window.location.href}
            readOnly
            className="h-[42px] min-w-0 grow rounded-md rounded-r-none border border-r-0 border-[var(--apollon-primary-contrast)] bg-[var(--apollon-background)] px-3 py-2 text-[var(--apollon-primary-contrast)]"
          />
          <Button
            onClick={() => copyToClipboard(window.location.href)}
            variant="outline"
            className="h-[42px] whitespace-nowrap rounded-l-none px-3"
          >
            Copy Link
          </Button>
        </div>
      </fieldset>
    </div>
  )
}
