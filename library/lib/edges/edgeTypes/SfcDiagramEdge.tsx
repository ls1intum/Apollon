import { BaseEdge } from "@xyflow/react"
import {
  BaseEdgeProps,
  CommonEdgeElements,
  EdgeBendHandle,
  EdgeEndpointMarkers,
} from "../GenericEdge"
import { useStepPathEdge } from "@/hooks/useStepPathEdge"
import { useDiagramStore, usePopoverStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useToolbar } from "@/hooks"
import { useMemo, useRef } from "react"
import { EDGES } from "@/constants"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableWrapper } from "@/components"
import { getCustomColorsFromDataForEdge } from "@/utils/layoutUtils"
import { EdgeInlineMarkers } from "@/components/svgs/edges/InlineMarker"

function getParsedEdgeData(data: unknown): {
  isNegated: boolean
  displayName: string
  showBar: boolean
} {
  if (
    !data ||
    typeof data !== "object" ||
    !("label" in data) ||
    !(data as Record<string, unknown>).label
  ) {
    return { isNegated: false, displayName: "", showBar: false }
  }

  const label = (data as Record<string, unknown>).label as string

  try {
    const parsed = JSON.parse(label)
    return {
      isNegated: parsed.isNegated || false,
      displayName: parsed.displayName || "",
      showBar: parsed.showBar !== false, // default to true
    }
  } catch {
    return { isNegated: false, displayName: label, showBar: true }
  }
}
const crossbarLength = 20
const sfcCenterHandleCollisionRadius = 24
export const SfcDiagramEdge = ({
  id,
  type,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  data,
}: BaseEdgeProps) => {
  const anchorRef = useRef<SVGSVGElement | null>(null)
  const { handleDelete } = useToolbar({ id })

  const allowMidpointDragging = true
  const enableStraightPath = true

  const { assessments } = useDiagramStore(
    useShallow((state) => ({
      assessments: state.assessments,
    }))
  )

  const setPopOverElementId = usePopoverStore(
    useShallow((state) => state.setPopOverElementId)
  )

  const {
    pathRef,
    edgeData,
    currentPath,
    overlayPath,
    bendHandles,
    isBendDragging,
    draggingHandleSegmentIndex,
    hasInitialCalculation,
    isReconnecting,
    markerEnd,
    markerStart,
    strokeDashArray,
    handlePointerDown,
    sourcePoint,
    targetPoint,
    isDiagramModifiable,
    canEditEndpoint,
  } = useStepPathEdge({
    id,
    type,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceHandleId,
    targetHandleId,
    data,
    allowMidpointDragging,
    enableStraightPath,
  })

  const { isNegated, displayName, showBar } = getParsedEdgeData(data)
  const { strokeColor, textColor } = getCustomColorsFromDataForEdge(data)
  const markerKey = `${id}-${markerStart ?? "none"}-${markerEnd ?? "none"}`

  // The SFC transition bar marks the condition point ON the edge, so it sits
  // exactly on the path middle (standard SFC notation) rather than being
  // nudged off to the side. The center bend handle would sit under the bar, so
  // it is the handle that yields: handles colliding with the bar are hidden
  // (never all of them — an edge must keep at least one way to reshape it).
  const annotationAnchor = edgeData.pathMiddlePosition

  const visibleBendHandles = useMemo(() => {
    if (!showBar) return bendHandles

    const clear = bendHandles.filter(
      (handle) =>
        Math.hypot(
          handle.position.x - annotationAnchor.x,
          handle.position.y - annotationAnchor.y
        ) > sfcCenterHandleCollisionRadius
    )
    return clear.length > 0 ? clear : bendHandles
  }, [annotationAnchor.x, annotationAnchor.y, bendHandles, showBar])

  const labelPosition = {
    x: edgeData.isMiddlePathHorizontal
      ? annotationAnchor.x
      : annotationAnchor.x + 30,
    y: edgeData.isMiddlePathHorizontal
      ? annotationAnchor.y + 30
      : annotationAnchor.y,
    textAnchor: edgeData.isMiddlePathHorizontal
      ? ("middle" as const)
      : ("start" as const),
    dominantBaseline: "middle" as const,
  }

  const crossbarCoordinates = useMemo(() => {
    if (edgeData.isMiddlePathHorizontal) {
      // If middle segment is horizontal, make crossbar vertical
      return {
        x1: annotationAnchor.x,
        y1: annotationAnchor.y - crossbarLength,
        x2: annotationAnchor.x,
        y2: annotationAnchor.y + crossbarLength,
        orientation: "vertical" as const,
      }
    } else {
      // If middle segment is vertical, make crossbar horizontal
      return {
        x1: annotationAnchor.x - crossbarLength,
        y1: annotationAnchor.y,
        x2: annotationAnchor.x + crossbarLength,
        y2: annotationAnchor.y,
        orientation: "horizontal" as const,
      }
    }
  }, [edgeData.isMiddlePathHorizontal, annotationAnchor, crossbarLength])

  return (
    <AssessmentSelectableWrapper elementId={id} asElement="g">
      <FeedbackDropzone elementId={id} asElement="path" elementType={type}>
        <g className="edge-container">
          <BaseEdge
            key={markerKey}
            id={id}
            path={currentPath}
            pointerEvents="none"
            style={{
              stroke: strokeColor,
              strokeDasharray: isReconnecting ? "none" : strokeDashArray,
              transition: hasInitialCalculation
                ? "opacity 0.1s ease-in"
                : "none",
              opacity: 1,
            }}
          />

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
            style={{
              opacity: isReconnecting || isBendDragging ? 0 : 0.4,
            }}
          />

          <EdgeEndpointMarkers
            sourcePoint={sourcePoint}
            targetPoint={targetPoint}
            sourcePosition={sourcePosition}
            targetPosition={targetPosition}
            isDiagramModifiable={isDiagramModifiable}
            canEditEndpoint={canEditEndpoint}
            diagramType="sfc"
          />

          {isDiagramModifiable &&
            !isReconnecting &&
            allowMidpointDragging &&
            visibleBendHandles
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

          {/* SFC Transition - show crossbar and label */}
          <g>
            {/* Crossbar - perpendicular to middle segment direction */}
            {showBar && (
              <line
                x1={crossbarCoordinates.x1}
                y1={crossbarCoordinates.y1}
                x2={crossbarCoordinates.x2}
                y2={crossbarCoordinates.y2}
                stroke={strokeColor}
                strokeWidth="10"
                // Decorative only: must not steal the pointer from the bend
                // handle it sits on, or the centre handle becomes ungrabbable.
                pointerEvents="none"
              />
            )}

            {/* SFC Label - positioned based on edge orientation */}
            {displayName && (
              <text
                fill={textColor}
                x={labelPosition.x}
                y={labelPosition.y}
                textAnchor={labelPosition.textAnchor}
                dominantBaseline={labelPosition.dominantBaseline}
                fontSize="14"
                textDecoration={isNegated ? "overline" : undefined}
                pointerEvents="none"
              >
                {displayName}
              </text>
            )}
          </g>
        </g>

        <CommonEdgeElements
          id={id}
          pathMiddlePosition={edgeData.pathMiddlePosition}
          toolbarPosition={edgeData.toolbarPosition}
          isDiagramModifiable={isDiagramModifiable}
          assessments={assessments}
          anchorRef={anchorRef}
          handleDelete={handleDelete}
          setPopOverElementId={setPopOverElementId}
          type={type}
        />
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
