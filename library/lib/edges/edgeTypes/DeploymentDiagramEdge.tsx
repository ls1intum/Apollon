import { BaseEdge } from "@xyflow/react"
import {
  BaseEdgeProps,
  EdgeEndpointMarkers,
  EdgeBendHandle,
  CommonEdgeElements,
} from "../GenericEdge"
import { useDiagramStore, usePopoverStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { EdgeMiddleLabels } from "../labelTypes/EdgeMiddleLabels"
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

const DEPLOYMENT_REQUIRED_INTERFACE_TYPES = [
  "DeploymentRequiredInterface",
  "DeploymentRequiredQuarterInterface",
  "DeploymentRequiredThreeQuarterInterface",
] as const

export const DeploymentDiagramEdge = ({
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
      | "DeploymentDependency"
      | "DeploymentProvidedInterface"
      | "DeploymentRequiredInterface"
      | "DeploymentRequiredThreeQuarterInterface"
      | "DeploymentRequiredQuarterInterface"
  )

  const allowMidpointDragging =
    "allowMidpointDragging" in config ? config.allowMidpointDragging : true
  const showRelationshipLabels =
    "showRelationshipLabels" in config ? config.showRelationshipLabels : false

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
    requiredTypes: DEPLOYMENT_REQUIRED_INTERFACE_TYPES,
    defaultType: "DeploymentRequiredInterface",
    reducedType: "DeploymentRequiredQuarterInterface",
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
    enableStraightPath: true,
  })

  const { strokeColor, textColor } = getCustomColorsFromDataForEdge(data)
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

        <EdgeMiddleLabels
          label={data?.label}
          pathMiddlePosition={edgeData.pathMiddlePosition}
          isMiddlePathHorizontal={edgeData.isMiddlePathHorizontal}
          showRelationshipLabels={showRelationshipLabels}
          avoidToolbarOverlap={true}
          textColor={textColor}
        />

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
