import { BaseEdge } from "@xyflow/react"
import { BaseEdgeProps, CommonEdgeElements } from "../GenericEdge"
import { EdgeMiddleLabels } from "../labelTypes/EdgeMiddleLabels"
import { EdgeIncludeExtendLabel } from "../labelTypes/EdgeIncludeExtendLabel"
import { useEdgeConfig } from "@/hooks/useEdgeConfig"
import { useStraightPathEdge } from "@/hooks/useStraightPathEdge"
import { useDiagramStore, usePopoverStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useToolbar } from "@/hooks"
import { useRef } from "react"
import { EDGES } from "@/constants"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableWrapper } from "@/components"
import { getCustomColorsFromDataForEdge } from "@/utils/layoutUtils"
import { EdgeInlineMarkers } from "@/components/svgs/edges/InlineMarker"

export const UseCaseEdge = ({
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
      | "UseCaseAssociation"
      | "UseCaseInclude"
      | "UseCaseExtend"
      | "UseCaseGeneralization"
  )
  const showRelationshipLabels =
    "showRelationshipLabels" in config ? config.showRelationshipLabels : false

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
    isDiagramModifiable,
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
              strokeDasharray: strokeDashArray,
            }}
          />

          <EdgeInlineMarkers
            pathD={currentPath}
            markerEnd={markerEnd}
            markerStart={markerStart}
            strokeColor={strokeColor}
          />

          <path
            ref={pathRef}
            className="edge-overlay"
            d={overlayPath}
            fill="none"
            strokeWidth={EDGES.EDGE_HIGHLIGHT_STROKE_WIDTH}
            pointerEvents="stroke"
            style={{ opacity: 0.4 }}
          />
        </g>

        <EdgeMiddleLabels
          label={data?.label}
          pathMiddlePosition={edgeData.pathMiddlePosition}
          isMiddlePathHorizontal={edgeData.isMiddlePathHorizontal}
          showRelationshipLabels={showRelationshipLabels}
          sourcePoint={edgeData.sourcePoint}
          targetPoint={edgeData.targetPoint}
          isUseCasePath={true}
          textColor={textColor}
        />

        <EdgeIncludeExtendLabel
          relationshipType={
            type === "UseCaseInclude"
              ? "include"
              : type === "UseCaseExtend"
                ? "extend"
                : undefined
          }
          showRelationshipLabels={
            type === "UseCaseInclude" || type === "UseCaseExtend"
          }
          pathMiddlePosition={edgeData.pathMiddlePosition}
          sourcePoint={edgeData.sourcePoint}
          targetPoint={edgeData.targetPoint}
        />

        <CommonEdgeElements
          id={id}
          pathMiddlePosition={edgeData.pathMiddlePosition}
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
