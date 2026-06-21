import React, { useCallback, useEffect, useRef, useState } from "react"
import { CANVAS, DROPS, DropElementConfig, ZINDEX } from "@/constants"
import { DropNodeData } from "@/types"
import { createPortal } from "react-dom"
import { useReactFlow, type Node } from "@xyflow/react"
import {
  generateUUID,
  getPositionOnCanvas,
  isParentNodeType,
  resizeAllParents,
} from "@/utils"
import { canDropIntoParent } from "@/utils/bpmnConstraints"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { log } from "../logger"

/* ========================================================================
   Page-scroll lock during a palette drag.

   The editor is a library embedded in arbitrary host pages, so we save the
   host's existing `body` styles and restore them verbatim — resetting to ""
   would silently clobber a host that intentionally runs with, say,
   `body { overflow: hidden }`. Only one palette item can be dragged at a
   time (one pointer), so module-level saved state is safe.
   ======================================================================== */
let savedBodyOverflow = ""
let savedBodyTouchAction = ""

const disableScroll = () => {
  savedBodyOverflow = document.body.style.overflow
  savedBodyTouchAction = document.body.style.touchAction
  document.body.style.overflow = "hidden"
  document.body.style.touchAction = "none"
}

const enableScroll = () => {
  document.body.style.overflow = savedBodyOverflow
  document.body.style.touchAction = savedBodyTouchAction
}

/* ========================================================================
   DraggableGhost Component
   Wraps a child element with drag & drop behavior and drop logic.
   ======================================================================== */
interface DraggableGhostProps {
  children: React.ReactNode
  dropElementConfig: DropElementConfig
  /**
   * Visual scale of the palette preview.
   * Used to convert pointer offsets into node-placement offsets.
   */
  previewScale?: number
}

export const DraggableGhost: React.FC<DraggableGhostProps> = ({
  children,
  dropElementConfig,
  previewScale = DROPS.SIDEBAR_PREVIEW_SCALE,
}) => {
  const nodeSnapStepPx = CANVAS.SNAP_TO_GRID_PX
  const diagramId = useDiagramStore(useShallow((state) => state.diagramId))
  // Hooks from react-flow and zustand store for node management
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow()
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
    }))
  )

  // Local state to track drag status, ghost position, and pointer offset
  const [isDragging, setIsDragging] = useState(false)
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 })
  const [clickOffset, setClickOffset] = useState({ x: 0, y: 0 })

  /* ----------------------------------------------------------------------
     onDrop: Handles the pointer up event by calculating the drop position,
     checking boundaries, and creating/updating the new node.
     ---------------------------------------------------------------------- */
  const onDrop = useCallback(
    (event: PointerEvent) => {
      event.preventDefault()

      const canvas = document.getElementById(`react-flow-library-${diagramId}`)
      if (!canvas) {
        log.warn("Canvas element not found")
        return
      }

      // Convert drop position from screen to flow coordinates (with grid snapping)
      const dropPosition = screenToFlowPosition(
        { x: event.clientX, y: event.clientY },
        { snapToGrid: true }
      )

      // Check if the drop occurred outside the canvas bounds
      const canvasBounding = canvas.getBoundingClientRect()
      const isOutsideCanvas =
        event.clientX < canvasBounding.left ||
        event.clientY < canvasBounding.top ||
        event.clientX > canvasBounding.right ||
        event.clientY > canvasBounding.bottom

      if (isOutsideCanvas) {
        return
      }

      // Deep clone defaultData to avoid mutating the original config
      const defaultData = structuredClone(dropElementConfig.defaultData ?? {})

      // Assign new IDs to methods and attributes
      if (defaultData.methods) {
        defaultData.methods = (defaultData.methods as Array<object>).map(
          (method) => ({
            ...method,
            id: generateUUID(),
          })
        )
      }
      if (defaultData.attributes) {
        defaultData.attributes = (defaultData.attributes as Array<object>).map(
          (attribute) => ({
            ...attribute,
            id: generateUUID(),
          })
        )
      }
      if (defaultData.lanes) {
        defaultData.lanes = (defaultData.lanes as Array<object>).map(
          (lane) => ({
            ...lane,
            id: generateUUID(),
          })
        )
      }

      // Prepare the drop data including offset adjustments
      const dropData: DropNodeData = {
        type: dropElementConfig.type,
        data: defaultData,
        offsetX: clickOffset.x / previewScale,
        offsetY: clickOffset.y / previewScale,
      }

      // Find potential parent node by checking intersections with a potential Parent node type
      const intersectingNodes = getIntersectingNodes({
        x: dropPosition.x,
        y: dropPosition.y,
        width: CANVAS.MOUSE_UP_OFFSET_PX,
        height: CANVAS.MOUSE_UP_OFFSET_PX,
      }).filter((node) => {
        return (
          isParentNodeType(node.type) &&
          node.type &&
          canDropIntoParent(dropElementConfig.type, node.type)
        )
      })

      const parentNode = intersectingNodes[intersectingNodes.length - 1]
      const parentId = parentNode ? parentNode.id : undefined

      // Adjust node position based on pointer offset
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // Snap position to grid
      position.x -=
        Math.floor(clickOffset.x / previewScale / nodeSnapStepPx) *
        nodeSnapStepPx
      position.y -=
        Math.floor(clickOffset.y / previewScale / nodeSnapStepPx) *
        nodeSnapStepPx

      if (parentId) {
        const parentPositionOnCanvas = getPositionOnCanvas(parentNode, nodes)
        position.x -= parentPositionOnCanvas.x
        position.y -= parentPositionOnCanvas.y
      }

      // Create the new node with a unique ID and calculated position. The drop
      // size may differ from the sidebar preview size (e.g. a swimlane previews
      // small but drops large).
      const dropWidth = dropElementConfig.dropWidth ?? dropElementConfig.width
      const dropHeight =
        dropElementConfig.dropHeight ?? dropElementConfig.height
      const newNode: Node = {
        id: generateUUID(),
        width: dropWidth,
        height: dropHeight,
        type: dropData.type,
        position: { ...position },
        data: { ...defaultData, ...dropData.data },
        parentId: parentId,
        measured: {
          width: dropWidth,
          height: dropHeight,
        },
        selected: false,
      }

      // Update nodes and resize parent nodes if necessary
      const updatedNodes = structuredClone([...nodes, newNode])
      if (parentId) {
        resizeAllParents(newNode, updatedNodes)
      }

      setNodes(updatedNodes)
    },
    [
      screenToFlowPosition,
      setNodes,
      getIntersectingNodes,
      nodes,
      clickOffset.x,
      clickOffset.y,
      dropElementConfig,
      nodeSnapStepPx,
      previewScale,
    ]
  )

  /* ----------------------------------------------------------------------
     Pointer Event Handlers
     ---------------------------------------------------------------------- */
  // Initiate drag: disable scrolling and record click offset
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    disableScroll()

    const previewElement = event.currentTarget.querySelector<HTMLElement>(
      "[data-draggable-preview]"
    )
    const elementRect = (
      previewElement ?? event.currentTarget
    ).getBoundingClientRect()
    const offsetX = event.clientX - elementRect.left
    const offsetY = event.clientY - elementRect.top

    setClickOffset({ x: offsetX, y: offsetY })
    setGhostPosition({ x: event.clientX - offsetX, y: event.clientY - offsetY })
    setIsDragging(true)
  }

  // Update ghost position during dragging
  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return
    setGhostPosition({
      x: event.clientX - clickOffset.x,
      y: event.clientY - clickOffset.y,
    })
  }

  // Shared teardown for both a completed drop and an interrupted drag
  // (pointercancel: gesture taken over by the OS, multi-touch, etc.).
  const resetDrag = () => {
    enableScroll()
    setIsDragging(false)
    setGhostPosition({ x: 0, y: 0 })
  }

  // Keep the latest `onDrop` reachable from the document listeners without
  // re-binding them: `onDrop` is a useCallback that changes whenever `nodes`
  // changes, which on a busy canvas is constantly. Reading it through a ref
  // lets the listeners bind once per drag (deps below), not once per render.
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  }, [onDrop])

  // End dragging: re-enable scrolling, reset state, and trigger drop logic
  const handlePointerUp = (event: PointerEvent) => {
    resetDrag()
    onDropRef.current(event)
  }

  const handlePointerCancel = () => {
    resetDrag()
  }

  /* ----------------------------------------------------------------------
     Attach global pointer event listeners when dragging
     ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!isDragging) return

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    document.addEventListener("pointercancel", handlePointerCancel)
    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
      document.removeEventListener("pointercancel", handlePointerCancel)
    }
  }, [isDragging, clickOffset])

  /* ----------------------------------------------------------------------
     Render the ghost element via a portal when dragging
     ---------------------------------------------------------------------- */
  // `fixed`, not `absolute`: the ghost is portaled into document.body and
  // positioned with viewport coordinates (clientX/clientY). `absolute` would
  // resolve against the document, so any page scroll offset would shift the
  // ghost away from the cursor — visible whenever the editor is embedded
  // below the fold. `fixed` resolves against the viewport, matching clientX/Y.
  const ghostElement = (
    <div
      style={{
        position: "fixed",
        left: `${ghostPosition.x}px`,
        top: `${ghostPosition.y}px`,
        pointerEvents: "none",
        zIndex: ZINDEX.DRAGGABLE_ELEMENT,
        opacity: 0.8,
      }}
    >
      {children}
    </div>
  )

  return (
    <>
      <div
        onPointerDown={handlePointerDown}
        style={{
          touchAction: "none",
        }}
      >
        {children}
      </div>
      {isDragging && createPortal(ghostElement, document.body)}
    </>
  )
}
