import {
  useState,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Position, useStore } from "@xyflow/react"
import { ExtendedEdgeProps } from "./EdgeProps"
import { CustomEdgeToolbar } from "@/components"
import { IPoint } from "./Connection"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import AssessmentIcon from "@/components/svgs/AssessmentIcon"
import { DiagramEdgeType } from "."
import { Assessment } from "@/typings"
import { CANVAS, EDGES } from "@/constants"

// Edge handles live inside the zoomed React Flow viewport. We want them to
// keep a usable MINIMUM on-screen size when zoomed out (so they never shrink to
// a few px), but to GROW with the edge when zoomed in (so they stay in
// proportion to the now-thick edge instead of looking like a tiny dot on it).
//
//   scale = 1 / min(zoom, 1)   (zoom floored to the canvas minimum)
//     zoom <= 1  → 1/zoom  → constant on-screen size (counter-scaled)
//     zoom  > 1  → 1       → natural flow size → grows on-screen with zoom
export const getHandleScreenScale = (zoom: number): number => {
  const safeZoom = Math.max(
    Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
    CANVAS.MIN_SCALE_TO_ZOOM_OUT
  )
  return 1 / Math.min(safeZoom, 1)
}

const useHandleScreenScale = (): number =>
  getHandleScreenScale(useStore((state) => state.transform[2]))

export interface BaseEdgeProps extends ExtendedEdgeProps {
  diagramType?: "class" | "usecase" | "activity" | "component" | "deployment"
}
export const useEdgeState = (initialPoints?: IPoint[]) => {
  const [customPoints, setCustomPoints] = useState<IPoint[]>([])

  useEffect(() => {
    if (initialPoints && initialPoints.length > 0) {
      setCustomPoints(initialPoints)
    }
  }, [initialPoints])

  return {
    customPoints,
    setCustomPoints,
  }
}

type EndpointSide = Position

const getEndpointDirection = (side?: EndpointSide): IPoint => {
  switch (side?.toLowerCase()) {
    case "top":
      return { x: 0, y: -1 }
    case "right":
      return { x: 1, y: 0 }
    case "bottom":
      return { x: 0, y: 1 }
    case "left":
      return { x: -1, y: 0 }
    default:
      return { x: 0, y: 0 }
  }
}

export const getEndpointHitTargetRect = (
  point: IPoint,
  side?: EndpointSide,
  screenScale = 1
) => {
  const hitSize = EDGES.ENDPOINT_HIT_TARGET_SIZE * screenScale
  const hitOffset = hitSize / 2
  const direction = getEndpointDirection(side)

  return {
    x: point.x + direction.x * hitOffset - hitOffset,
    y: point.y + direction.y * hitOffset - hitOffset,
    width: hitSize,
    height: hitSize,
    radius: hitOffset,
  }
}

export const EdgeEndpointMarkers = ({
  sourcePoint,
  targetPoint,
  sourcePosition,
  targetPosition,
  isDiagramModifiable,
  canEditEndpoint = true,
  diagramType,
}: {
  sourcePoint: IPoint
  targetPoint: IPoint
  sourcePosition?: EndpointSide
  targetPosition?: EndpointSide
  isDiagramModifiable: boolean
  canEditEndpoint?: boolean
  diagramType: string
}) => {
  const sourceHandleRef = useRef<SVGRectElement | null>(null)
  const screenScale = useHandleScreenScale()

  useEffect(() => {
    if (!isDiagramModifiable || diagramType === "usecase") return

    const edgeGroup = sourceHandleRef.current?.closest(".react-flow__edge")
    const nativeUpdaters = Array.from(
      edgeGroup?.querySelectorAll<SVGElement>(".react-flow__edgeupdater") ?? []
    )

    const previousPointerEvents = nativeUpdaters.map(
      (updater) => updater.style.pointerEvents
    )

    nativeUpdaters.forEach((updater) => {
      updater.style.pointerEvents = "none"
    })

    return () => {
      nativeUpdaters.forEach((updater, index) => {
        updater.style.pointerEvents = previousPointerEvents[index]
      })
    }
  }, [diagramType, isDiagramModifiable])

  if (!isDiagramModifiable || diagramType === "usecase") {
    return null
  }

  const forwardToNativeReconnect = (
    event: ReactMouseEvent<SVGRectElement>,
    endType: "source" | "target"
  ) => {
    const edgeGroup = event.currentTarget.closest(".react-flow__edge")
    const nativeUpdater = edgeGroup?.querySelector(
      `.react-flow__edgeupdater-${endType}`
    )

    if (!nativeUpdater) return

    event.preventDefault()
    event.stopPropagation()
    const eventWindow = event.currentTarget.ownerDocument.defaultView ?? window

    // Deliberately hand off to React Flow's native reconnect updater so
    // reconnection stays owned by React Flow while our hit target controls UX.
    nativeUpdater.dispatchEvent(
      new eventWindow.MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        button: event.button,
        buttons: event.buttons,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      })
    )
  }
  const sourceHitTarget = getEndpointHitTargetRect(
    sourcePoint,
    sourcePosition,
    screenScale
  )
  const targetHitTarget = getEndpointHitTargetRect(
    targetPoint,
    targetPosition,
    screenScale
  )
  const className = [
    "edge-endpoint-handle",
    canEditEndpoint ? "" : "edge-endpoint-handle--disabled",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <>
      <rect
        ref={sourceHandleRef}
        className={`${className} edge-endpoint-handle--source`}
        x={sourceHitTarget.x}
        y={sourceHitTarget.y}
        width={sourceHitTarget.width}
        height={sourceHitTarget.height}
        rx={sourceHitTarget.radius}
        ry={sourceHitTarget.radius}
        pointerEvents={canEditEndpoint ? "all" : "none"}
        onMouseDown={
          canEditEndpoint
            ? (event) => forwardToNativeReconnect(event, "source")
            : undefined
        }
      />
      <rect
        className={`${className} edge-endpoint-handle--target`}
        x={targetHitTarget.x}
        y={targetHitTarget.y}
        width={targetHitTarget.width}
        height={targetHitTarget.height}
        rx={targetHitTarget.radius}
        ry={targetHitTarget.radius}
        pointerEvents={canEditEndpoint ? "all" : "none"}
        onMouseDown={
          canEditEndpoint
            ? (event) => forwardToNativeReconnect(event, "target")
            : undefined
        }
      />
    </>
  )
}

export const EdgeBendHandle = ({
  id,
  segmentIndex,
  position,
  orientation,
  onPointerDown,
}: {
  id: string
  segmentIndex: number
  position: IPoint
  orientation: "H" | "V"
  onPointerDown: (e: ReactPointerEvent<SVGRectElement>) => void
}) => {
  const screenScale = useHandleScreenScale()
  const longAxis = 34 * screenScale
  const shortAxis = 10 * screenScale
  const width = orientation === "H" ? longAxis : shortAxis
  const height = orientation === "H" ? shortAxis : longAxis

  return (
    <rect
      className="edge-circle edge-bend-handle"
      pointerEvents="all"
      key={`${id}-bend-${segmentIndex}`}
      x={position.x - width / 2}
      y={position.y - height / 2}
      width={width}
      height={height}
      rx={6 * screenScale}
      ry={6 * screenScale}
      style={{
        cursor: orientation === "H" ? "ns-resize" : "ew-resize",
        zIndex: 9999,
      }}
      onPointerDown={onPointerDown}
    />
  )
}

export const CommonEdgeElements = ({
  id,
  pathMiddlePosition,
  toolbarPosition,
  isDiagramModifiable,
  assessments,
  anchorRef,
  handleDelete,
  setPopOverElementId,
  type,
}: {
  id: string
  pathMiddlePosition: IPoint
  toolbarPosition?: IPoint
  isDiagramModifiable: boolean
  assessments: Record<string, Assessment>
  anchorRef: React.RefObject<SVGSVGElement>
  handleDelete: () => void
  setPopOverElementId: (id: string) => void
  type: string
}) => {
  const nodeScore = assessments[id]?.score
  const uiPosition = toolbarPosition ?? pathMiddlePosition

  return (
    <>
      <CustomEdgeToolbar
        edgeId={id}
        anchorRef={anchorRef}
        position={uiPosition}
        scaleAnchor={pathMiddlePosition}
        onEditClick={() => setPopOverElementId(id)}
        onDeleteClick={handleDelete}
      />

      {!isDiagramModifiable && (
        <AssessmentIcon
          x={uiPosition.x - 15}
          y={uiPosition.y - 15}
          score={nodeScore}
        />
      )}

      <PopoverManager
        elementId={id}
        anchorEl={anchorRef.current}
        type={type as DiagramEdgeType}
      />
    </>
  )
}
