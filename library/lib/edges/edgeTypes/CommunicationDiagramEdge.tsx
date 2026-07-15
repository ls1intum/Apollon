import { BaseEdgeProps, StepEdgeBody, CommonEdgeElements } from "../GenericEdge"
import { EdgeMultipleLabels } from "../labelTypes/EdgeMultipleLabels"
import { getMessageHostSegment } from "../labelTypes/messageLayout"
import { useEdgeConfig } from "@/hooks/useEdgeConfig"
import type { DiagramEdgeType } from "@/edges/types"
import { useStepPathEdge } from "@/hooks/useStepPathEdge"
import { useDiagramStore, usePopoverStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useToolbar } from "@/hooks"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableWrapper } from "@/components"
import { getCustomColorsFromDataForEdge } from "@/utils/layoutUtils"

export const CommunicationDiagramEdge = ({
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

  const config = useEdgeConfig(type as DiagramEdgeType)

  const allowMidpointDragging =
    "allowMidpointDragging" in config ? config.allowMidpointDragging : true

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
    handleEndpointPointerDown,
    sourcePoint,
    targetPoint,
    sourcePosition: renderSourcePosition,
    targetPosition: renderTargetPosition,
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
  })

  const { strokeColor, textColor } = getCustomColorsFromDataForEdge(data)
  const markerKey = `${id}-${markerStart ?? "none"}-${markerEnd ?? "none"}`

  // Host the message stack on the edge's longest arm, not the raw mid-segment:
  // a short jog between two long arms would otherwise centre the labels on the
  // jog and cross both neighbouring arms.
  const messageHost = getMessageHostSegment(
    edgeData.activePoints,
    edgeData.sourcePoint,
    edgeData.targetPoint
  )

  return (
    <AssessmentSelectableWrapper elementId={id} asElement="g">
      <FeedbackDropzone elementId={id} asElement="path" elementType={type}>
        <StepEdgeBody
          id={id}
          markerKey={markerKey}
          currentPath={currentPath}
          overlayPath={overlayPath}
          pathRef={pathRef}
          strokeColor={strokeColor}
          strokeDashArray={strokeDashArray}
          hasInitialCalculation={hasInitialCalculation}
          isReconnecting={isReconnecting}
          isBendDragging={isBendDragging}
          draggingHandleSegmentIndex={draggingHandleSegmentIndex}
          markerStart={markerStart}
          markerEnd={markerEnd}
          sourcePoint={sourcePoint}
          targetPoint={targetPoint}
          sourcePosition={renderSourcePosition}
          targetPosition={renderTargetPosition}
          isDiagramModifiable={isDiagramModifiable}
          canEditEndpoint={canEditEndpoint}
          allowMidpointDragging={allowMidpointDragging}
          bendHandles={bendHandles}
          handleEndpointPointerDown={handleEndpointPointerDown}
          handlePointerDown={handlePointerDown}
        />

        <EdgeMultipleLabels
          messages={data?.messages}
          pathMiddlePosition={messageHost.point}
          showRelationshipLabels={true}
          isReconnecting={isReconnecting}
          sourcePosition={messageHost.start}
          targetPosition={messageHost.end}
          textColor={textColor}
          isHorizontalEdge={messageHost.isHorizontal}
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
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
