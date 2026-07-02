import { BaseEdgeProps, StepEdgeBody, CommonEdgeElements } from "../GenericEdge"
import { EdgeEndLabels } from "../labelTypes/EdgeEndLabels"
import { useEdgeConfig } from "@/hooks/useEdgeConfig"
import { useStepPathEdge } from "@/hooks/useStepPathEdge"
import { useDiagramStore, usePopoverStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useToolbar } from "@/hooks"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableWrapper } from "@/components"
import { getCustomColorsFromDataForEdge } from "@/utils"

export const ClassDiagramEdge = ({
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

  const config = useEdgeConfig(
    type as
      | "ClassAggregation"
      | "ClassInheritance"
      | "ClassRealization"
      | "ClassComposition"
      | "ClassBidirectional"
      | "ClassUnidirectional"
      | "ClassDependency"
  )

  const allowMidpointDragging =
    "allowMidpointDragging" in config ? config.allowMidpointDragging : true
  const enableStraightPath =
    "enableStraightPath" in config
      ? (config.enableStraightPath as boolean)
      : true

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
  const markerKey = `${id}-${markerStart ?? "none"}-${markerEnd ?? "none"}`

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
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
          isDiagramModifiable={isDiagramModifiable}
          canEditEndpoint={canEditEndpoint}
          handleEndpointPointerDown={handleEndpointPointerDown}
          allowMidpointDragging={allowMidpointDragging}
          bendHandles={bendHandles}
          handlePointerDown={handlePointerDown}
        />

        <EdgeEndLabels
          data={data}
          activePoints={edgeData.activePoints}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
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
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
