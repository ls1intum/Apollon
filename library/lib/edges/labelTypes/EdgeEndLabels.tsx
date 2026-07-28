import { useMemo } from "react"
import { IPoint } from "../Connection"
import { getEdgeEndLabelPlacements } from "@/utils/geometry/edgeEndLabelLayout"

interface EdgeEndLabelsProps {
  data?: {
    sourceRole?: string | null
    targetRole?: string | null
    sourceMultiplicity?: string | null
    targetMultiplicity?: string | null
  }

  activePoints: IPoint[]
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: string
  targetPosition: string
  textColor?: string
}

export const EdgeEndLabels = ({
  data,
  activePoints,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  textColor = "var(--apollon-foreground, #000000)",
}: EdgeEndLabelsProps) => {
  const { source: sourceLabels, target: targetLabels } = useMemo(
    () =>
      getEdgeEndLabelPlacements({
        activePoints,
        source: { x: sourceX, y: sourceY },
        target: { x: targetX, y: targetY },
        sourcePosition,
        targetPosition,
      }),
    [
      activePoints,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    ]
  )

  return (
    <>
      {/* Source Role Label */}
      {data?.sourceRole && (
        <text
          x={sourceLabels.roleX}
          y={sourceLabels.roleY}
          textAnchor={sourceLabels.roleTextAnchor}
          style={{
            fontSize: "16px",
            fill: textColor,
            userSelect: "none",
          }}
        >
          {data.sourceRole}
        </text>
      )}

      {/* Source Multiplicity Label */}
      {data?.sourceMultiplicity && (
        <text
          x={sourceLabels.multiplicityX}
          y={sourceLabels.multiplicityY}
          textAnchor={sourceLabels.multiplicityTextAnchor}
          style={{
            fontSize: "16px",
            fill: textColor,
            userSelect: "none",
          }}
        >
          {data.sourceMultiplicity}
        </text>
      )}

      {/* Target Role Label */}
      {data?.targetRole && (
        <text
          x={targetLabels.roleX}
          y={targetLabels.roleY}
          textAnchor={targetLabels.roleTextAnchor}
          style={{
            fontSize: "16px",
            fill: textColor,
            userSelect: "none",
          }}
        >
          {data.targetRole}
        </text>
      )}

      {/* Target Multiplicity Label */}
      {data?.targetMultiplicity && (
        <text
          x={targetLabels.multiplicityX}
          y={targetLabels.multiplicityY}
          textAnchor={targetLabels.multiplicityTextAnchor}
          style={{
            fontSize: "16px",
            fill: textColor,
            userSelect: "none",
          }}
        >
          {data.targetMultiplicity}
        </text>
      )}
    </>
  )
}
