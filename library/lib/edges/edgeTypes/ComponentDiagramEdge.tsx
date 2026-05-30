import { BaseEdge } from "@xyflow/react"
import {
  BaseEdgeProps,
  EdgeEndpointMarkers,
  EdgeBendHandle,
  CommonEdgeElements,
} from "../GenericEdge"
import { useDiagramStore, usePopoverStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useEdgeConfig } from "@/hooks/useEdgeConfig"
import { useStepPathEdge } from "@/hooks/useStepPathEdge"
import { useToolbar } from "@/hooks"
import { useRef } from "react"
import { EDGES } from "@/constants"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableWrapper } from "@/components"
import { getCustomColorsFromDataForEdge } from "@/utils/layoutUtils"
import { EdgeInlineMarkers } from "@/components/svgs/edges/InlineMarker"
import { resolveRequiredInterfaceEdgeType } from "@/utils"

const COMPONENT_REQUIRED_INTERFACE_TYPES = [
  "ComponentRequiredInterface",
  "ComponentRequiredQuarterInterface",
  "ComponentRequiredThreeQuarterInterface",
] as const

export const ComponentDiagramEdge = ({
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

  const config = useEdgeConfig(
    type as
      | "ComponentDependency"
      | "ComponentProvidedInterface"
      | "ComponentRequiredInterface"
      | "ComponentRequiredThreeQuarterInterface"
      | "ComponentRequiredQuarterInterface"
  )

  // For component edges, config has allowMidpointDragging
  const allowMidpointDragging =
    "allowMidpointDragging" in config ? config.allowMidpointDragging : true

  const { edges, assessments } = useDiagramStore(
    useShallow((state) => ({
      edges: state.edges,
      assessments: state.assessments,
    }))
  )

  const setPopOverElementId = usePopoverStore(
    useShallow((state) => state.setPopOverElementId)
  )

  const dynamicEdgeType = resolveRequiredInterfaceEdgeType({
    type,
    id,
    target,
    targetHandleId,
    edges,
    requiredTypes: COMPONENT_REQUIRED_INTERFACE_TYPES,
    defaultType: "ComponentRequiredInterface",
    reducedType: "ComponentRequiredQuarterInterface",
  })

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
    type: dynamicEdgeType,
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
    enableStraightPath: false,
  })

  const { strokeColor } = getCustomColorsFromDataForEdge(data)
  const markerKey = `${id}-${markerStart ?? "none"}-${markerEnd ?? "none"}`

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
            diagramType="step"
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
          type={dynamicEdgeType}
        />
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
