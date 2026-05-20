import { Typography } from "@/components/Typography"
import { useEditorContext, useModalContext } from "@/contexts"
import { log } from "@/logger"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import { DiagramView } from "@/types"
import { randomCollabName } from "@/utils/collaboration"
import { Clipboard } from "@capacitor/clipboard"
import { isPlatform } from "@ionic/react"
import Info from "@mui/icons-material/Info"
import { Tooltip } from "@mui/material"
import { useNavigate } from "react-router"
import { toast } from "react-toastify"
import { APButton } from "../APButton"
import { serverURL } from "@/constants"

export const ShareModal = () => {
  const { editor } = useEditorContext()
  const { closeModal, openModal } = useModalContext()
  const navigate = useNavigate()
  const isCapacitorApp = isPlatform("ios") || isPlatform("android")

  const handleShareButtonPress = async (viewType: DiagramView) => {
    if (!editor) {
      toast.error("Editor instance is not available.")
      return
    }

    try {
      const model = editor.model
      const { id: diagramID } = await DiagramApiClient.createDiagram(model)

      const newurl = isCapacitorApp
        ? `${serverURL}/${diagramID}?view=${viewType}&mobile=true`
        : `${window.location.origin}/${diagramID}?view=${viewType}`

      await copyToClipboard(newurl)
      navigate(`/${diagramID}?view=${viewType}`)

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

  const copyToClipboard = async (link: string) => {
    if (isPlatform("ios") || isPlatform("capacitor")) {
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
          <APButton variant="outline" fullWidth onClick={handleCollaborate}>
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
