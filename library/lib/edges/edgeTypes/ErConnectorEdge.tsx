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

// Width of the solid stroke used to fake the Chen "total participation" double
// line: drawing the path thick in the stroke colour and then thin in the
// background colour leaves two parallel lines (the rims of the thick stroke).
const TOTAL_PARTICIPATION_OUTER_WIDTH = 5
const TOTAL_PARTICIPATION_INNER_WIDTH = 1.5

// Entity ↔ relationship connector. Carries one Chen cardinality label and an
// optional participation constraint (total = double line).
export const ErConnectorEdge = ({
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
  const isTotal = data?.participation === "total"

  return (
    <AssessmentSelectableWrapper elementId={id} asElement="g">
      <FeedbackDropzone elementId={id} asElement="path" elementType={type}>
        <g className="edge-container">
          {isTotal ? (
            <>
              <BaseEdge
                id={id}
                path={currentPath}
                pointerEvents="none"
                style={{
                  stroke: strokeColor,
                  strokeWidth: TOTAL_PARTICIPATION_OUTER_WIDTH,
                }}
              />
              <path
                d={currentPath}
                fill="none"
                stroke="var(--apollon-background, #ffffff)"
                strokeWidth={TOTAL_PARTICIPATION_INNER_WIDTH}
                pointerEvents="none"
              />
            </>
          ) : (
            <BaseEdge
              id={id}
              path={currentPath}
              pointerEvents="none"
              style={{ stroke: strokeColor }}
            />
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
              label={data?.cardinality}
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
