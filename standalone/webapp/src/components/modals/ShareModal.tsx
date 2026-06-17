import { useEditorContext, useModalContext } from "@/contexts"
import { log } from "@/logger"
import { randomCollabName } from "@tumaet/apollon"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import { DiagramView } from "@/types"
import { Clipboard } from "@capacitor/clipboard"
import { isPlatform } from "@ionic/react"
import { InfoIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { useNavigate } from "react-router"
import { toast } from "react-toastify"
import { Button } from "@tumaet/ui/components/button"
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
    <div className="flex flex-col gap-6 text-[var(--apollon-primary-contrast)]">
      <div>
        <p className="inline-flex items-center gap-1">
          After sharing, this diagram will be accessible to everyone with access
          to the link for at least 12 weeks{" "}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex cursor-help items-center" />
                }
                aria-label="Copy link to clipboard"
              >
                <InfoIcon className="size-4" aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Copy link to clipboard</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleShareButtonPress(DiagramView.EDIT)}
          >
            Edit
          </Button>
        </div>
        <div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCollaborate}
          >
            Collaborate
          </Button>
        </div>
        <div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleShareButtonPress(DiagramView.GIVE_FEEDBACK)}
          >
            Give Feedback
          </Button>
        </div>
        <div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleShareButtonPress(DiagramView.SEE_FEEDBACK)}
          >
            See Feedback
          </Button>
        </div>
      </div>
      <fieldset className="w-fill rounded-xl border border-gray-300 p-2">
        <legend className="px-2 text-sm text-[var(--apollon-primary-contrast)]">
          Recently shared Diagram:
        </legend>
        <div className="flex items-center">
          <input
            type="text"
            value={window.location.href}
            readOnly
            className="h-[42px] grow rounded-md rounded-r-none border border-r-0 border-[var(--apollon-primary-contrast)] bg-[var(--apollon-background)] px-3 py-2 text-[var(--apollon-primary-contrast)]"
          />
          <Button
            onClick={() => copyToClipboard(window.location.href)}
            variant="outline"
            className="h-[42px] rounded-l-none"
          >
            Copy Link
          </Button>
        </div>
      </fieldset>
    </div>
  )
}
