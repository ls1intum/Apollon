import { BaseEdge } from "@xyflow/react"
import {
  BaseEdgeProps,
  CommonEdgeElements,
  EdgeEndpointMarkers,
} from "../GenericEdge"
import { EdgeMiddleLabels } from "../labelTypes/EdgeMiddleLabels"
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
import { ErCrowsFootMarker } from "@/components/svgs/edges/ErCrowsFootMarker"
import { deriveErCfEdgeRender } from "@/utils/erCfUtils"

// Crow's-foot (Mermaid-style) relationship: a straight line directly between two
// entity tables, with a crow's-foot cardinality marker at each end. Solid when
// identifying, dashed when not.
export const ErCfRelationshipEdge = ({
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

  const { strokeColor, textColor } = getCustomColorsFromDataForEdge(data)
  const {
    dashed,
    source: sourceMarker,
    target: targetMarker,
  } = deriveErCfEdgeRender(data, sourcePoint, targetPoint)

  return (
    <AssessmentSelectableWrapper elementId={id} asElement="g">
      <FeedbackDropzone elementId={id} asElement="path" elementType={type}>
        <g className="edge-container">
          <BaseEdge
            id={id}
            path={currentPath}
            pointerEvents="none"
            style={{
              stroke: strokeColor,
              strokeDasharray: dashed ? "8 5" : undefined,
            }}
          />

          {!isReconnecting && (
            <>
              <ErCrowsFootMarker
                point={sourcePoint}
                direction={sourceMarker.direction}
                cardinality={sourceMarker.cardinality}
                strokeColor={strokeColor}
              />
              <ErCrowsFootMarker
                point={targetPoint}
                direction={targetMarker.direction}
                cardinality={targetMarker.cardinality}
                strokeColor={strokeColor}
              />
            </>
          )}

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
          <>
            <EdgeMiddleLabels
              label={data?.label}
              pathMiddlePosition={edgeData.pathMiddlePosition}
              isMiddlePathHorizontal={edgeData.isMiddlePathHorizontal}
              showRelationshipLabels={true}
              avoidToolbarOverlap={true}
              textColor={textColor}
            />

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
          </>
        )}
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
