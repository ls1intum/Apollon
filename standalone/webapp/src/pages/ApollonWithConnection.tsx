import React, { useEffect, useRef, useState } from "react"
import { useEditorContext } from "@/contexts"
import { ApollonEditor, ApollonMode, ApollonOptions } from "@tumaet/apollon"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { toast } from "react-toastify"
import { DiagramView } from "@/types"
import { WebSocketManager } from "@/services/WebSocketManager"
import { DiagramAPIManager } from "@/services/DiagramAPIManager"
import { log } from "@/logger"
import { addSharedDiagramEntry } from "@/utils/sharedDiagramStorage"

export const ApollonWithConnection: React.FC = () => {
  const { id: diagramId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setEditor } = useEditorContext()
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const diagramIsUpdated = useRef(false)

  useEffect(() => {
    let instance: ApollonEditor | null = null

    const initialize = async () => {
      if (!containerRef.current || !diagramId) return

      try {
        const viewType = searchParams.get("view")
        const validViews = Object.values(DiagramView)
        if (!viewType || !validViews.includes(viewType as DiagramView)) {
          toast.error("Invalid view type")
          navigate("/")
          return
        }
        log.debug("Initializing Apollon editor with view type:", viewType)

        const diagram = await DiagramAPIManager.fetchDiagramData(diagramId)
        addSharedDiagramEntry(diagramId)
        log.debug("Fetched diagram data:", diagram)

        const editorOptions: ApollonOptions = {
          model: diagram,
          collaborationEnabled: true,
        }

        if (viewType === DiagramView.GIVE_FEEDBACK) {
          editorOptions.mode = ApollonMode.Assessment
          editorOptions.readonly = false
        } else if (viewType === DiagramView.SEE_FEEDBACK) {
          editorOptions.mode = ApollonMode.Assessment
          editorOptions.readonly = true
        } else if (viewType === DiagramView.EDIT) {
          editorOptions.mode = ApollonMode.Modelling
          editorOptions.readonly = false
        } else {
          editorOptions.mode = ApollonMode.Modelling
          editorOptions.readonly = false
        }

        instance = new ApollonEditor(containerRef.current!, editorOptions)
        setEditor(instance)
        setIsLoading(false)

        if (
          [
            DiagramView.COLLABORATE,
            DiagramView.GIVE_FEEDBACK,
            DiagramView.SEE_FEEDBACK,
          ].includes(viewType as DiagramView)
        ) {
          wsManagerRef.current = new WebSocketManager(diagramId, instance, () =>
            toast.error("WebSocket error")
          )
          wsManagerRef.current.startConnection()
        }

        syncIntervalRef.current = setInterval(() => {
          if (diagramIsUpdated.current && diagramId) {
            DiagramAPIManager.sendDiagramUpdate(
              diagramId,
              instance!.model
            ).catch(() => toast.error("Failed to sync changes"))
            diagramIsUpdated.current = false
          }
        }, 5000)

        instance.subscribeToModelChange(() => {
          diagramIsUpdated.current = true
        })
      } catch {
        toast.error("Failed to initialize diagram")
        navigate("/")
      }
    }

    initialize()

    return () => {
      setEditor(undefined)
      wsManagerRef.current?.cleanup()
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
      instance?.destroy()
    }
  }, [diagramId, searchParams, setEditor])

  return (
    <div className="h-full">
      {isLoading && (
        <div className="flex grow justify-center  items-center ">
          Preparing the diagram for collaboration...
        </div>
      )}

      <div className={isLoading ? "invisible" : "h-full "} ref={containerRef} />
    </div>
  )
}
