import { BaseEdgeProps, StepEdgeBody, CommonEdgeElements } from "../GenericEdge"
import { EdgeMiddleLabels } from "../labelTypes/EdgeMiddleLabels"
import { useEdgeConfig } from "@/hooks/useEdgeConfig"
import { useStepPathEdge } from "@/hooks/useStepPathEdge"
import { useDiagramStore, usePopoverStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useToolbar } from "@/hooks"
import {
  AssessmentSelectableWrapper,
  FeedbackDropzone,
} from "@/components/wrapper"
import { getCustomColorsFromDataForEdge } from "@/utils/layoutUtils"
import { ErCrowsFootMarker } from "@/components/svgs/edges/ErCrowsFootMarker"
import { deriveErCfEdgeRender } from "@/utils/erCfUtils"

// Crow's-foot (Mermaid-style) relationship between two entity tables. Reuses the
// class diagram's step (orthogonal) routing — bend points, midpoint dragging,
// reconnection — and overlays a crow's-foot cardinality marker at each end,
// oriented along the path's final segment so it tracks bends. Solid line when
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
  const config = useEdgeConfig(type as "ErCfRelationship")
  const allowMidpointDragging =
    "allowMidpointDragging" in config ? config.allowMidpointDragging : true
  const enableStraightPath =
    "enableStraightPath" in config
      ? (config.enableStraightPath as boolean)
      : true

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
    bendHandles,
    isBendDragging,
    draggingHandleSegmentIndex,
    hasInitialCalculation,
    isReconnecting,
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

  const { strokeColor, textColor } = getCustomColorsFromDataForEdge(data)
  const {
    dashed,
    source: sourceMarker,
    target: targetMarker,
  } = deriveErCfEdgeRender(data, currentPath, sourcePoint, targetPoint)

  return (
    <AssessmentSelectableWrapper elementId={id} asElement="g">
      <FeedbackDropzone elementId={id} asElement="path" elementType={type}>
        <StepEdgeBody
          id={id}
          markerKey={`${id}-ercf`}
          currentPath={currentPath}
          overlayPath={overlayPath}
          pathRef={pathRef}
          strokeColor={strokeColor}
          strokeDashArray={dashed ? "8 5" : undefined}
          hasInitialCalculation={hasInitialCalculation}
          isReconnecting={isReconnecting}
          isBendDragging={isBendDragging}
          draggingHandleSegmentIndex={draggingHandleSegmentIndex}
          markerStart={undefined}
          markerEnd={undefined}
          sourcePoint={sourcePoint}
          targetPoint={targetPoint}
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
          isDiagramModifiable={isDiagramModifiable}
          canEditEndpoint={canEditEndpoint}
          allowMidpointDragging={allowMidpointDragging}
          bendHandles={bendHandles}
          handlePointerDown={handlePointerDown}
        >
          {!isReconnecting && (
            <>
              <ErCrowsFootMarker
                point={sourceMarker.point}
                direction={sourceMarker.direction}
                cardinality={sourceMarker.cardinality}
                strokeColor={strokeColor}
              />
              <ErCrowsFootMarker
                point={targetMarker.point}
                direction={targetMarker.direction}
                cardinality={targetMarker.cardinality}
                strokeColor={strokeColor}
              />
            </>
          )}
        </StepEdgeBody>

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
