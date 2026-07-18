import { BaseEdge } from "@xyflow/react"
import {
  BaseEdgeProps,
  CommonEdgeElements,
  EdgeEndpointMarkers,
} from "../GenericEdge"
import { useStraightPathEdge } from "@/hooks/useStraightPathEdge"
import { useDiagramStore, usePopoverStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useToolbar } from "@/hooks"
import { EDGES } from "@/constants"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableWrapper } from "@/components/wrapper"
import { getCustomColorsFromDataForEdge } from "@/utils/layoutUtils"
import { EdgeInlineMarkers } from "@/components/svgs/edges/InlineMarker"

export const SyntaxTreeEdge = ({
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
  const { handleDelete } = useToolbar({ id })

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
    markerEnd,
    markerStart,
    strokeDashArray,
    sourcePoint,
    targetPoint,
    sourcePosition: renderSourcePosition,
    targetPosition: renderTargetPosition,
    isDiagramModifiable,
    canEditEndpoint,
    handleEndpointPointerDown,
  } = useStraightPathEdge({
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
            // Select/hover ride `.edge-overlay`, not RF's fat interaction ribbon,
            // so the ribbon can't paint over a neighbour edge's handle. See GenericEdge.
            interactionWidth={0}
            style={{
              stroke: strokeColor,
              strokeDasharray: strokeDashArray,
            }}
          />

          <EdgeInlineMarkers pathD={currentPath} strokeColor={strokeColor} />

          <path
            ref={pathRef}
            className="edge-overlay"
            d={overlayPath}
            fill="none"
            strokeWidth={EDGES.EDGE_HIGHLIGHT_STROKE_WIDTH}
            pointerEvents="stroke"
            style={{ opacity: 0.4 }}
          />

          <EdgeEndpointMarkers
            sourcePoint={sourcePoint}
            targetPoint={targetPoint}
            sourcePosition={renderSourcePosition}
            targetPosition={renderTargetPosition}
            isDiagramModifiable={isDiagramModifiable}
            canEditEndpoint={canEditEndpoint}
            onEndpointPointerDown={handleEndpointPointerDown}
            straight
          />
        </g>

        <CommonEdgeElements
          id={id}
          pathMiddlePosition={edgeData.pathMiddlePosition}
          toolbarPosition={edgeData.toolbarPosition}
          isDiagramModifiable={isDiagramModifiable}
          assessments={assessments}
          handleDelete={handleDelete}
          setPopOverElementId={setPopOverElementId}
          type={type}
        />
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
