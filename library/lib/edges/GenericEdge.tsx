import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { BaseEdge, Position, useStore } from "@xyflow/react"
import { ExtendedEdgeProps } from "./EdgeProps"
import { CustomEdgeToolbar } from "@/components"
import { IPoint } from "./Connection"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import AssessmentIcon from "@/components/svgs/AssessmentIcon"
import { EdgeInlineMarkers } from "@/components/svgs/edges/InlineMarker"
import type { DiagramEdgeType } from "./types"
import { Assessment } from "@/typings"
import type { BendHandle } from "@/utils/geometry/bendHandles"
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

export type BaseEdgeProps = ExtendedEdgeProps

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
}: {
  sourcePoint: IPoint
  targetPoint: IPoint
  sourcePosition?: EndpointSide
  targetPosition?: EndpointSide
  isDiagramModifiable: boolean
  canEditEndpoint?: boolean
}) => {
  const sourceHandleRef = useRef<SVGRectElement | null>(null)
  const screenScale = useHandleScreenScale()

  useEffect(() => {
    if (!isDiagramModifiable) return

    // NOTE: `.react-flow__edgeupdater*` are React Flow v12 internal class names.
    // We deliberately defer reconnection to RF's native updater while our hit
    // target controls UX; pin to RF v12 (revisit on a major React Flow bump).
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
  }, [isDiagramModifiable])

  if (!isDiagramModifiable) {
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

/**
 * The shared SVG body for every orthogonal (step-path) edge: the base path,
 * inline export markers, the interaction overlay, endpoint reconnect targets,
 * and the bend handles. Diagram-specific decorations (e.g. the SFC transition
 * bar) are passed as `children` and render inside the same group. Per-type
 * files keep only their own config, labels, and `CommonEdgeElements`.
 */
export const StepEdgeBody = ({
  id,
  markerKey,
  currentPath,
  overlayPath,
  pathRef,
  strokeColor,
  strokeDashArray,
  hasInitialCalculation,
  isReconnecting,
  isBendDragging,
  draggingHandleSegmentIndex,
  markerStart,
  markerEnd,
  sourcePoint,
  targetPoint,
  sourcePosition,
  targetPosition,
  isDiagramModifiable,
  canEditEndpoint,
  allowMidpointDragging,
  bendHandles,
  handlePointerDown,
  children,
}: {
  id: string
  markerKey: string
  currentPath: string
  overlayPath: string
  pathRef: React.Ref<SVGPathElement>
  strokeColor: string
  strokeDashArray?: string
  hasInitialCalculation: boolean
  isReconnecting: boolean
  isBendDragging: boolean
  draggingHandleSegmentIndex: number | null
  markerStart?: string
  markerEnd?: string
  sourcePoint: IPoint
  targetPoint: IPoint
  sourcePosition?: Position
  targetPosition?: Position
  isDiagramModifiable: boolean
  canEditEndpoint: boolean
  allowMidpointDragging: boolean
  bendHandles: BendHandle[]
  handlePointerDown: (
    event: ReactPointerEvent<SVGRectElement>,
    handle: BendHandle
  ) => void
  children?: ReactNode
}) => {
  return (
    <g className="edge-container">
      <BaseEdge
        key={markerKey}
        id={id}
        path={currentPath}
        pointerEvents="none"
        style={{
          stroke: strokeColor,
          strokeDasharray: isReconnecting ? "none" : strokeDashArray,
          transition: hasInitialCalculation ? "opacity 0.1s ease-in" : "none",
          opacity: 1,
        }}
      />

      {/* Inline markers for export compatibility (survives ungrouping). */}
      {!isReconnecting && (
        <EdgeInlineMarkers
          pathD={currentPath}
          markerEnd={markerEnd}
          markerStart={markerStart}
          strokeColor={strokeColor}
        />
      )}

      <path
        ref={pathRef}
        className="edge-overlay"
        d={overlayPath}
        fill="none"
        strokeWidth={EDGES.EDGE_HIGHLIGHT_STROKE_WIDTH}
        pointerEvents="stroke"
        style={{ opacity: isReconnecting || isBendDragging ? 0 : 0.4 }}
      />

      <EdgeEndpointMarkers
        sourcePoint={sourcePoint}
        targetPoint={targetPoint}
        sourcePosition={sourcePosition}
        targetPosition={targetPosition}
        isDiagramModifiable={isDiagramModifiable}
        canEditEndpoint={canEditEndpoint}
      />

      {isDiagramModifiable &&
        !isReconnecting &&
        allowMidpointDragging &&
        bendHandles
          .filter(
            (handle) =>
              !isBendDragging ||
              handle.segmentIndex === draggingHandleSegmentIndex
          )
          .map((handle) => (
            <EdgeBendHandle
              key={`${id}-bend-${handle.segmentIndex}`}
              id={id}
              segmentIndex={handle.segmentIndex}
              position={handle.position}
              orientation={handle.orientation}
              onPointerDown={(e) => handlePointerDown(e, handle)}
            />
          ))}

      {children}
    </g>
  )
}

export const CommonEdgeElements = ({
  id,
  pathMiddlePosition,
  toolbarPosition,
  isDiagramModifiable,
  assessments,
  handleDelete,
  setPopOverElementId,
  type,
}: {
  id: string
  pathMiddlePosition: IPoint
  toolbarPosition?: IPoint
  isDiagramModifiable: boolean
  assessments: Record<string, Assessment>
  handleDelete: () => void
  setPopOverElementId: (id: string) => void
  type: string
}) => {
  const nodeScore = assessments[id]?.score
  const uiPosition = toolbarPosition ?? pathMiddlePosition
  // Owns its popover anchor: a callback ref captures the toolbar's
  // <foreignObject> into state so the popover positions against the live
  // element without reading a ref's `.current` during render.
  const [anchorEl, anchorRef] = usePopoverAnchor<SVGForeignObjectElement>()

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
        anchorEl={anchorEl}
        type={type as DiagramEdgeType}
      />
    </>
  )
}
