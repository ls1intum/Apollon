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
import {
  AssessmentSelectableWrapper,
  FeedbackDropzone,
} from "@/components/wrapper"
import { getCustomColorsFromDataForEdge } from "@/utils/layoutUtils"

// Plain undecorated line connecting an attribute to its owner (entity,
// relationship, or parent composite attribute). No markers, no labels.
export const ErLinkEdge = ({
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
    useShallow((state) => ({ assessments: state.assessments }))
  )

  const setPopOverElementId = usePopoverStore(
    useShallow((state) => state.setPopOverElementId)
  )

  const {
    pathRef,
    edgeData,
    currentPath,
    overlayPath,
    sourcePoint,
    targetPoint,
    isDiagramModifiable,
    isReconnecting,
    canEditEndpoint,
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
  })

  const { strokeColor } = getCustomColorsFromDataForEdge(data)

  return (
    <AssessmentSelectableWrapper elementId={id} asElement="g">
      <FeedbackDropzone elementId={id} asElement="path" elementType={type}>
        <g className="edge-container">
          <BaseEdge
            id={id}
            path={currentPath}
            pointerEvents="none"
            style={{ stroke: strokeColor }}
          />

          <path
            ref={pathRef}
            className="edge-overlay"
            d={overlayPath}
            fill="none"
            strokeWidth={EDGES.EDGE_HIGHLIGHT_STROKE_WIDTH}
            pointerEvents="stroke"
            style={{ opacity: isReconnecting ? 0 : 0.4 }}
          />

          {!isReconnecting && (
            <EdgeEndpointMarkers
              sourcePoint={sourcePoint}
              targetPoint={targetPoint}
              sourcePosition={sourcePosition}
              targetPosition={targetPosition}
              isDiagramModifiable={isDiagramModifiable}
              canEditEndpoint={canEditEndpoint}
            />
          )}
        </g>

        {!isReconnecting && (
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
        )}
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
