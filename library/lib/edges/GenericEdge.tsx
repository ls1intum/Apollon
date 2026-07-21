import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { BaseEdge, Position, useStore } from "@xyflow/react"
import { useDiagramStore } from "@/store/context"
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
import { isFreeformEdgeAnchor } from "@/utils/edgeUtils"
import { CANVAS, EDGES } from "@/constants"

// Edge handles live inside the zoomed React Flow viewport. We want them to
// keep a usable MINIMUM on-screen size when zoomed out (so they never shrink to
// a few px), but to GROW with the edge when zoomed in (so they stay in
// proportion to the thick edge instead of looking like a tiny dot on it).
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
const FREEFORM_ENDPOINT_HIT_TARGET_SIZE = 44
const FREEFORM_ENDPOINT_GRIP_LONG_AXIS = 18
/** The grip never shrinks below this on-screen length, so an endpoint always shows a
 * visible handle even on a very short or crowded edge. The grip is purely visual
 * (pointer-events:none), so flooring it can only ever help legibility — the interactive
 * hit target is sized separately. */
const FREEFORM_ENDPOINT_GRIP_MIN_LONG_AXIS = 12
const FREEFORM_ENDPOINT_GRIP_SHORT_AXIS = 8
const FREEFORM_ENDPOINT_GRIP_RADIUS = 4
/** Grip outline width in flow units at natural scale. Multiplied by the handle screen
 * scale (and drawn WITHOUT non-scaling-stroke) so the outline tracks the handle body:
 * constant on-screen when zoomed out, growing with the handle when zoomed in. */
const FREEFORM_ENDPOINT_GRIP_STROKE = 4
/** Breathing room kept between a shortened grip and the middle of a short edge,
 * so the two grips read as two handles rather than one bar. */
const FREEFORM_ENDPOINT_GRIP_MARGIN = 2

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

const normalizeDir = (v: IPoint): IPoint => {
  const len = Math.hypot(v.x, v.y)
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len }
}

/**
 * How far out from its endpoint a handle may reach before it starts eating into
 * the other endpoint's half of the edge. Both handles grow outward along the
 * edge, so on a short edge they march straight into each other. Each endpoint
 * owns half the run between the two, and `Infinity` means unconstrained — the
 * handles only need to give way when they actually point at one another.
 */
const getEndpointRun = (
  point: IPoint,
  otherPoint: IPoint,
  direction: IPoint
): number => {
  const toOther = { x: otherPoint.x - point.x, y: otherPoint.y - point.y }
  const towardsOther = direction.x * toOther.x + direction.y * toOther.y
  if (towardsOther <= 0) return Number.POSITIVE_INFINITY

  return Math.hypot(toOther.x, toOther.y) / 2
}

/**
 * Half the on-screen length of the bend handle `EdgeBendHandle` draws for a segment of
 * this bendable length, expressed in FLOW units. The single source of truth shared by
 * the handle renderer and `nearestHandleReach`: the endpoint reconnect target must stop
 * at the handle's RENDERED near edge, and that edge is screen-scale dependent (the drawn
 * handle is clamped to a minimum SCREEN size, so when zoomed out its flow-space half
 * grows PAST `bendableLength / 2`). Capping against `bendableLength / 2` instead lets the
 * drawn handle poke into the target at low zoom, and the target — drawn on top — eats it.
 */
const renderedBendHandleHalfLength = (
  bendableLength: number,
  screenScale: number
): number => {
  const room =
    bendableLength - 2 * EDGES.BEND_HANDLE_CORNER_CLEARANCE_PX * screenScale
  const longAxis = Math.min(
    Math.max(room, EDGES.BEND_HANDLE_MIN_SCREEN_LENGTH_PX * screenScale),
    EDGES.BEND_HANDLE_SCREEN_LENGTH_PX * screenScale
  )
  return longAxis / 2
}

/**
 * How far outward the endpoint reconnect target may reach before it buries the nearest
 * bend handle. The target is drawn ON TOP of the handles, so it must stop at the
 * handle's RENDERED near edge — which is screen-scale dependent, hence
 * `renderedBendHandleHalfLength` rather than the flow-space `bendableLength`. Caps
 * against ANY handle kind: an inner handle can sit at the corner just past a short
 * stub, and when the terminal stub is too short to bend there is no terminal handle to
 * cap against at all. `Infinity` when nothing lies ahead of the endpoint.
 */
const nearestHandleReach = (
  bendHandles: BendHandle[] | undefined,
  endpoint: IPoint,
  direction: IPoint,
  screenScale: number
): number => {
  if (!bendHandles || bendHandles.length === 0) return Number.POSITIVE_INFINITY
  const gap = EDGES.ENDPOINT_HANDLE_CLEARANCE_PX * screenScale
  let reach = Number.POSITIVE_INFINITY
  for (const handle of bendHandles) {
    const along =
      (handle.position.x - endpoint.x) * direction.x +
      (handle.position.y - endpoint.y) * direction.y
    if (along <= 0) continue // handle is beside/behind the endpoint's outward axis
    const nearEdge =
      along -
      renderedBendHandleHalfLength(handle.bendableLength, screenScale) -
      gap
    if (nearEdge > 0) reach = Math.min(reach, nearEdge)
  }
  return reach
}

export const getEndpointHitTargetRect = (
  point: IPoint,
  side?: EndpointSide,
  screenScale = 1,
  hitTargetSize: number = EDGES.ENDPOINT_HIT_TARGET_SIZE,
  // Straight (direct) edges leave the node at an angle; pass the real outward
  // edge direction so the target follows the line instead of an orthogonal side.
  outwardDir?: IPoint,
  run: number = Number.POSITIVE_INFINITY
) => {
  const direction = outwardDir
    ? normalizeDir(outwardDir)
    : getEndpointDirection(side)
  // Keep the square inside this endpoint's half so the two hit targets meet at the
  // midpoint instead of overlapping. Floored so a very short edge still gets two
  // reachable targets rather than zero-sized ones.
  const hitSize = Math.max(
    Math.min(hitTargetSize * screenScale, run),
    EDGES.MIN_ENDPOINT_HIT_TARGET_PX * screenScale
  )
  const hitOffset = hitSize / 2

  return {
    x: point.x + direction.x * hitOffset - hitOffset,
    y: point.y + direction.y * hitOffset - hitOffset,
    width: hitSize,
    height: hitSize,
    radius: hitOffset,
  }
}

const getEndpointGripRect = (
  point: IPoint,
  side?: EndpointSide,
  screenScale = 1,
  outwardDir?: IPoint,
  run: number = Number.POSITIVE_INFINITY
) => {
  // Anchor the grip to the endpoint (+ small clearance for the marker), not the
  // centre of the wide hit-target — otherwise it floats ~22px off the tip when
  // zoomed out. The hit-target stays wide for grabbing.
  const radius = FREEFORM_ENDPOINT_GRIP_RADIUS * screenScale
  const short = FREEFORM_ENDPOINT_GRIP_SHORT_AXIS * screenScale
  // On a short edge the full-size grip cannot sit clear of the endpoint AND stay in its
  // own half, so shorten it and pull it in — but never below a visible minimum. The two
  // grips give way equally (each owns its half of the edge via `run`), so they read as
  // two handles; the floor guarantees each stays visible even when its half is tiny.
  const margin = FREEFORM_ENDPOINT_GRIP_MARGIN * screenScale
  const long = Math.max(
    Math.min(FREEFORM_ENDPOINT_GRIP_LONG_AXIS * screenScale, run - margin),
    FREEFORM_ENDPOINT_GRIP_MIN_LONG_AXIS * screenScale
  )
  // Keep the grip's near edge at the endpoint tip (clearance ≥ long/2) so a floored grip
  // sits ON the edge rather than straddling the node border.
  const baseClearance = long / 2 + radius
  const clearance = Math.max(
    Math.min(baseClearance, run - long / 2 - margin),
    long / 2
  )

  if (outwardDir) {
    // Straight edge: a bar whose long axis runs ALONG the edge, offset outward
    // along it and rotated to its angle — so the grip tracks the line, not an
    // orthogonal N/E/S/W side.
    const dir = normalizeDir(outwardDir)
    const cx = point.x + dir.x * clearance
    const cy = point.y + dir.y * clearance
    return {
      x: cx - long / 2,
      y: cy - short / 2,
      width: long,
      height: short,
      radius,
      rotationDeg: (Math.atan2(dir.y, dir.x) * 180) / Math.PI,
      centerX: cx,
      centerY: cy,
    }
  }

  // Step edge: orthogonal grip aligned to the endpoint's side.
  const isHorizontalGrip = side === Position.Left || side === Position.Right
  const width = isHorizontalGrip ? long : short
  const height = isHorizontalGrip ? short : long
  const dir = getEndpointDirection(side)
  const cx = point.x + dir.x * clearance
  const cy = point.y + dir.y * clearance
  return {
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    radius,
    rotationDeg: 0,
    centerX: cx,
    centerY: cy,
  }
}

export const EdgeEndpointMarkers = ({
  sourcePoint,
  targetPoint,
  sourcePosition,
  targetPosition,
  isDiagramModifiable,
  canEditEndpoint = true,
  onEndpointPointerDown,
  straight = false,
  bendHandles,
  sourcePinned = false,
  targetPinned = false,
}: {
  sourcePoint: IPoint
  targetPoint: IPoint
  sourcePosition?: EndpointSide
  targetPosition?: EndpointSide
  isDiagramModifiable: boolean
  canEditEndpoint?: boolean
  onEndpointPointerDown?: (
    event: ReactPointerEvent<SVGRectElement>,
    endpoint: "source" | "target"
  ) => void
  // Direct/straight edges: orient the grip + hit-target along the actual edge
  // angle instead of the endpoint's orthogonal N/E/S/W side.
  straight?: boolean
  // The edge's bend handles, so a reconnect target can cap its outward reach at
  // this end's terminal bend handle instead of painting over it.
  bendHandles?: BendHandle[]
  // Whether each end is USER-PINNED (a custom anchor) rather than auto-anchored.
  // Kept as a prop/class for the reset affordance and tests; the grip itself looks the
  // same either way (a clean white handle), so nothing clutters the endpoint.
  sourcePinned?: boolean
  targetPinned?: boolean
}) => {
  const sourceHandleRef = useRef<SVGRectElement | null>(null)
  const screenScale = useHandleScreenScale()

  useEffect(() => {
    if (!isDiagramModifiable) return

    // `.react-flow__edgeupdater*` are React Flow v12 internal class names.
    // Reconnection defers to RF's native updater while the hit target controls
    // UX; pinned to RF v12 (revisit on a major React Flow bump).
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

    // Hand off to React Flow's native reconnect updater so reconnection stays
    // owned by React Flow while the hit target controls UX.
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
  // For a straight edge the grip sits on the line, offset from its endpoint
  // TOWARD the other endpoint (so it clears the marker on the node side) and
  // rotated to the edge angle — the same "along the edge, away from the node"
  // placement the orthogonal side gives a step edge. Step edges pass no
  // direction and fall back to the side.
  const sourceOutward = straight
    ? { x: targetPoint.x - sourcePoint.x, y: targetPoint.y - sourcePoint.y }
    : undefined
  const targetOutward = straight
    ? { x: sourcePoint.x - targetPoint.x, y: sourcePoint.y - targetPoint.y }
    : undefined
  const sourceDir = sourceOutward
    ? normalizeDir(sourceOutward)
    : getEndpointDirection(sourcePosition)
  const targetDir = targetOutward
    ? normalizeDir(targetOutward)
    : getEndpointDirection(targetPosition)
  // The reconnect target reaches at most to the OTHER endpoint's half AND stops
  // short of this end's own terminal bend handle — so a short centred stub can
  // still expose a grabbable bend handle beyond the (now-shortened) target.
  const sourceRun = Math.min(
    getEndpointRun(sourcePoint, targetPoint, sourceDir),
    nearestHandleReach(bendHandles, sourcePoint, sourceDir, screenScale)
  )
  const targetRun = Math.min(
    getEndpointRun(targetPoint, sourcePoint, targetDir),
    nearestHandleReach(bendHandles, targetPoint, targetDir, screenScale)
  )
  const sourceHitTarget = getEndpointHitTargetRect(
    sourcePoint,
    sourcePosition,
    screenScale,
    onEndpointPointerDown ? FREEFORM_ENDPOINT_HIT_TARGET_SIZE : undefined,
    sourceOutward,
    sourceRun
  )
  const targetHitTarget = getEndpointHitTargetRect(
    targetPoint,
    targetPosition,
    screenScale,
    onEndpointPointerDown ? FREEFORM_ENDPOINT_HIT_TARGET_SIZE : undefined,
    targetOutward,
    targetRun
  )
  const className = [
    "edge-endpoint-handle",
    canEditEndpoint ? "" : "edge-endpoint-handle--disabled",
  ]
    .filter(Boolean)
    .join(" ")
  const showEndpointGrips = Boolean(onEndpointPointerDown)
  // The VISIBLE grip yields only to the other endpoint (so the two never cross the
  // midpoint), NOT to bend handles: it is pointer-events:none, so it may cosmetically
  // overlap a nearby bend handle without stealing any interaction. Only the hit target
  // (above) caps against bend handles, keeping them grabbable.
  const sourceGripRun = getEndpointRun(sourcePoint, targetPoint, sourceDir)
  const targetGripRun = getEndpointRun(targetPoint, sourcePoint, targetDir)
  const sourceGrip = getEndpointGripRect(
    sourcePoint,
    sourcePosition,
    screenScale,
    sourceOutward,
    sourceGripRun
  )
  const targetGrip = getEndpointGripRect(
    targetPoint,
    targetPosition,
    screenScale,
    targetOutward,
    targetGripRun
  )

  return (
    <>
      {showEndpointGrips && (
        <>
          <rect
            className={`edge-circle edge-endpoint-grip edge-endpoint-grip--source${
              sourcePinned ? " edge-endpoint-grip--pinned" : ""
            }`}
            x={sourceGrip.x}
            y={sourceGrip.y}
            width={sourceGrip.width}
            height={sourceGrip.height}
            rx={sourceGrip.radius}
            ry={sourceGrip.radius}
            transform={`rotate(${sourceGrip.rotationDeg} ${sourceGrip.centerX} ${sourceGrip.centerY})`}
            style={{ strokeWidth: FREEFORM_ENDPOINT_GRIP_STROKE * screenScale }}
            pointerEvents="none"
          />
          <rect
            className={`edge-circle edge-endpoint-grip edge-endpoint-grip--target${
              targetPinned ? " edge-endpoint-grip--pinned" : ""
            }`}
            x={targetGrip.x}
            y={targetGrip.y}
            width={targetGrip.width}
            height={targetGrip.height}
            rx={targetGrip.radius}
            ry={targetGrip.radius}
            transform={`rotate(${targetGrip.rotationDeg} ${targetGrip.centerX} ${targetGrip.centerY})`}
            style={{ strokeWidth: FREEFORM_ENDPOINT_GRIP_STROKE * screenScale }}
            pointerEvents="none"
          />
        </>
      )}
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
        onPointerDown={
          canEditEndpoint && onEndpointPointerDown
            ? (event) => onEndpointPointerDown(event, "source")
            : undefined
        }
        onMouseDown={
          canEditEndpoint && !onEndpointPointerDown
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
        onPointerDown={
          canEditEndpoint && onEndpointPointerDown
            ? (event) => onEndpointPointerDown(event, "target")
            : undefined
        }
        onMouseDown={
          canEditEndpoint && !onEndpointPointerDown
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
  bendableLength,
  onPointerDown,
}: {
  id: string
  segmentIndex: number
  position: IPoint
  orientation: "H" | "V"
  /** Flow-space room on this segment. The handle shrinks into it. */
  bendableLength: number
  onPointerDown: (e: ReactPointerEvent<SVGRectElement>) => void
}) => {
  const screenScale = useHandleScreenScale()
  // Fit the handle to the segment instead of deleting the handle when a
  // fixed-size one would not fit. A short segment gets a small nub; it is still
  // grabbable, and a small nub beats nothing to grab at all. Clearance keeps it
  // off the corners so a bend never reads as belonging to the next segment.
  const longAxis = 2 * renderedBendHandleHalfLength(bendableLength, screenScale)
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
  handleEndpointPointerDown,
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
  handleEndpointPointerDown?: (
    event: ReactPointerEvent<SVGRectElement>,
    endpoint: "source" | "target"
  ) => void
  allowMidpointDragging: boolean
  bendHandles: BendHandle[]
  handlePointerDown: (
    event: ReactPointerEvent<SVGRectElement>,
    handle: BendHandle
  ) => void
  children?: ReactNode
}) => {
  // Which ends the user has PINNED (a custom anchor) vs left to the router. Two
  // boolean selectors (not one object) so equality stays primitive and the edge
  // only re-renders when a pin actually flips. Drives the filled "anchored" grip.
  const sourcePinned = useDiagramStore((state) =>
    isFreeformEdgeAnchor(
      state.edges.find((edge) => edge.id === id)?.data?.sourceAnchor
    )
  )
  const targetPinned = useDiagramStore((state) =>
    isFreeformEdgeAnchor(
      state.edges.find((edge) => edge.id === id)?.data?.targetAnchor
    )
  )
  return (
    <g className="edge-container">
      <BaseEdge
        key={markerKey}
        id={id}
        path={currentPath}
        pointerEvents="none"
        // No fat React Flow interaction ribbon (default 20px): select/hover ride
        // our own `.edge-overlay` stroke instead. RF's ribbon is a wider hit path
        // that, on a dense diagram, paints OVER a neighbour edge's precise endpoint/
        // bend handle and steals its pointer. `.edge-overlay` is narrower and never
        // reaches a co-located neighbour's handle, so removing the ribbon fixes the
        // theft by subtraction. Selection/hover fire on the wrapping `.react-flow__
        // edge` group, not the ribbon, so nothing is lost.
        interactionWidth={0}
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
              bendableLength={handle.bendableLength}
              onPointerDown={(e) => handlePointerDown(e, handle)}
            />
          ))}

      {/* AFTER the bend handles, deliberately. Where an endpoint handle and a
          bend handle overlap near a node, the later one wins the click, and it
          should be the endpoint: a mis-grabbed bend is undone by dragging it
          back, a mis-grabbed reconnect detaches the edge. */}
      <EdgeEndpointMarkers
        sourcePoint={sourcePoint}
        targetPoint={targetPoint}
        sourcePosition={sourcePosition}
        targetPosition={targetPosition}
        isDiagramModifiable={isDiagramModifiable}
        canEditEndpoint={canEditEndpoint}
        onEndpointPointerDown={handleEndpointPointerDown}
        bendHandles={bendHandles}
        sourcePinned={sourcePinned}
        targetPinned={targetPinned}
      />

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

  // Whether this edge deviates from FULLY auto in any way the reset can undo.
  // There are two independent manual states, and either one keeps the router from
  // owning the edge: hand-drawn waypoints (`data.points`) AND pinned endpoint
  // anchors (`data.sourceAnchor`/`targetAnchor`, written when an endpoint is
  // dragged — which also freezes the opposite end). Checking only `points` hid the
  // reset button on an edge whose PATH is auto but whose ANCHORS are pinned, so
  // there was no way back to auto anchoring. Both count.
  const setEdges = useDiagramStore((state) => state.setEdges)
  const hasManualRoute = useDiagramStore((state) => {
    const data = state.edges.find((edge) => edge.id === id)?.data
    const points = data?.points
    const hasManualPoints = Array.isArray(points) && points.length > 0
    const hasPinnedAnchor =
      isFreeformEdgeAnchor(data?.sourceAnchor) ||
      isFreeformEdgeAnchor(data?.targetAnchor)
    return hasManualPoints || hasPinnedAnchor
  })

  // Hand the edge FULLY back to the router: drop the hand-drawn waypoints AND the
  // pinned anchors so the auto-anchor selector picks both ends again. Clearing only
  // the points would leave the anchors frozen (still not auto).
  const handleResetRouting = useCallback(() => {
    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id !== id) return edge
        const nextData = { ...(edge.data ?? {}) } as Record<string, unknown>
        nextData.points = []
        delete nextData.sourceAnchor
        delete nextData.targetAnchor
        return { ...edge, data: nextData }
      })
    )
  }, [id, setEdges])

  return (
    <>
      <CustomEdgeToolbar
        edgeId={id}
        anchorRef={anchorRef}
        position={uiPosition}
        scaleAnchor={pathMiddlePosition}
        onEditClick={() => setPopOverElementId(id)}
        onDeleteClick={handleDelete}
        canResetRouting={isDiagramModifiable && hasManualRoute}
        onResetRoutingClick={handleResetRouting}
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
