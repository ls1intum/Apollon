import React, { useEffect, useRef, useState } from "react"
import { useEditorContext, useModalContext } from "@/contexts"
import { ApollonEditor, ApollonMode, ApollonOptions } from "@tumaet/apollon"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { toast } from "react-toastify"
import { DiagramView } from "@/types"
import { WebSocketManager } from "@/services/WebSocketManager"
import { DiagramAPIManager } from "@/services/DiagramAPIManager"
import { log } from "@/logger"
import { collabColorFromName } from "@/utils/collaboration"
import { CollaboratorCursors } from "@/components/CollaboratorCursors"
import { CollaboratorSelectionHighlights } from "@/components/CollaboratorSelectionHighlights"

export const ApollonWithConnection: React.FC = () => {
  const { diagramId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setEditor } = useEditorContext()
  const { openModal } = useModalContext()
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const diagramIsUpdated = useRef(false)
  const hasPromptedRef = useRef(false)
  const [collaborationUser, setCollaborationUser] = useState<{
    name: string
    color: string
  } | null>(null)

  useEffect(() => {
    let instance: ApollonEditor | null = null
    let cleanupCursorTracking: (() => void) | null = null
    let selectionSubscriptionId: number | null = null

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

        const isCollaborationView =
          (viewType as DiagramView) === DiagramView.COLLABORATE
        if (isCollaborationView && !collaborationUser) {
          const storedName = sessionStorage.getItem("apollon-collab-name")
          if (storedName) {
            setCollaborationUser({
              name: storedName,
              color: collabColorFromName(storedName),
            })
          } else if (!hasPromptedRef.current) {
            hasPromptedRef.current = true
            openModal("COLLABORATE_NAME", {
              onConfirm: (name: string) => {
                sessionStorage.setItem("apollon-collab-name", name)
                setCollaborationUser({
                  name,
                  color: collabColorFromName(name),
                })
              },
            })
          }
          return
        }

        const diagram = await DiagramAPIManager.fetchDiagramData(diagramId)
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

        if (isCollaborationView && collaborationUser) {
          instance.setLocalAwarenessUser(collaborationUser)
          instance.setLocalAwarenessSelectedElement(null)
        }

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

        if (isCollaborationView && collaborationUser) {
          const element = containerRef.current
          const rafRef = { current: 0 as number | 0 }
          const pendingRef = {
            current: null as { x: number; y: number } | null,
          }

          const flushCursor = () => {
            if (pendingRef.current) {
              instance?.setLocalAwarenessCursor(pendingRef.current)
              pendingRef.current = null
            }
            rafRef.current = 0
          }

          const handlePointerMove = (event: PointerEvent) => {
            if (!element) return
            const flowPosition = instance?.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            })
            if (!flowPosition) return

            pendingRef.current = {
              x: flowPosition.x,
              y: flowPosition.y,
            }

            if (!rafRef.current) {
              rafRef.current = window.requestAnimationFrame(flushCursor)
            }
          }

          const handlePointerLeave = () => {
            instance?.setLocalAwarenessCursor(null)
          }

          element?.addEventListener("pointermove", handlePointerMove)
          element?.addEventListener("pointerleave", handlePointerLeave)

          cleanupCursorTracking = () => {
            element?.removeEventListener("pointermove", handlePointerMove)
            element?.removeEventListener("pointerleave", handlePointerLeave)
            if (rafRef.current) {
              window.cancelAnimationFrame(rafRef.current)
              rafRef.current = 0
            }
            instance?.setLocalAwarenessCursor(null)
          }

          selectionSubscriptionId = instance.subscribeToSelectionChange(
            (selectedElementIds) => {
              const selectedElementId = selectedElementIds.at(-1) ?? null
              instance?.setLocalAwarenessSelectedElement(selectedElementId)
            }
          )
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
      cleanupCursorTracking?.()
      if (selectionSubscriptionId !== null && instance) {
        instance.setLocalAwarenessSelectedElement(null)
        instance.unsubscribe(selectionSubscriptionId)
      }
      instance?.destroy()
    }
  }, [diagramId, searchParams, setEditor, openModal, collaborationUser])

  return (
    <div className="h-full">
      {isLoading && (
        <div className="flex grow justify-center  items-center ">
          Preparing the diagram for collaboration...
        </div>
      )}

      <div className={isLoading ? "invisible" : "h-full "}>
        <div className="h-full" style={{ position: "relative" }}>
          <div className="h-full" ref={containerRef} />
          <CollaboratorCursors
            containerRef={containerRef}
            isActive={
              searchParams.get("view") === DiagramView.COLLABORATE &&
              !!collaborationUser
            }
          />
          <CollaboratorSelectionHighlights
            containerRef={containerRef}
            isActive={
              searchParams.get("view") === DiagramView.COLLABORATE &&
              !!collaborationUser
            }
          />
        </div>
      </div>
    </div>
  )
}
