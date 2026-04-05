import { useMemo } from "react"
import { calculateDynamicEdgeLabels } from "@/utils/edgeUtils"
import { IPoint } from "../Connection"

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
  textColor = "var(--apollon-primary-contrast, #000000)",
}: EdgeEndLabelsProps) => {
  const sourceLabels = useMemo(() => {
    if (activePoints.length < 2) {
      return calculateDynamicEdgeLabels(sourceX, sourceY, sourcePosition)
    }

    const sourcePoint = activePoints[0]
    const nextPoint = activePoints[1]
    const deltaX = nextPoint.x - sourcePoint.x
    const deltaY = nextPoint.y - sourcePoint.y

    let direction: string
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? "right" : "left"
    } else {
      direction = deltaY > 0 ? "bottom" : "top"
    }
    return calculateDynamicEdgeLabels(sourcePoint.x, sourcePoint.y, direction)
  }, [activePoints, sourceX, sourceY, sourcePosition])

  const targetLabels = useMemo(() => {
    if (activePoints.length < 2) {
      return calculateDynamicEdgeLabels(targetX, targetY, targetPosition)
    }

    const targetPoint = activePoints[activePoints.length - 1]
    return calculateDynamicEdgeLabels(
      targetPoint.x,
      targetPoint.y,
      targetPosition
    )
  }, [activePoints, targetX, targetY, targetPosition])

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
