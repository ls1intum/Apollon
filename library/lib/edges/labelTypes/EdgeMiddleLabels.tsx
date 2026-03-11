import { IPoint } from "../Connection"

interface EdgeMiddleLabelsProps {
  label?: string | null
  pathMiddlePosition: IPoint
  isMiddlePathHorizontal: boolean
  sourcePoint?: IPoint
  targetPoint?: IPoint
  showRelationshipLabels?: boolean
  isUseCasePath?: boolean
  isPetriNet?: boolean // New prop to identify PetriNet edges
  textColor: string
}

export const EdgeMiddleLabels = ({
  label,
  pathMiddlePosition,
  isMiddlePathHorizontal,
  sourcePoint,
  targetPoint,
  showRelationshipLabels = false,
  isUseCasePath = false,
  isPetriNet = false,
  textColor,
}: EdgeMiddleLabelsProps) => {
  if (isPetriNet && label === "1") return null

  if (!label || !showRelationshipLabels) return null

  // Calculate position and rotation for the label
  let x: number
  let y: number
  let rotation = 0

  if (isUseCasePath && sourcePoint && targetPoint) {
    const dx = targetPoint.x - sourcePoint.x
    const dy = targetPoint.y - sourcePoint.y
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    rotation = angle > 90 || angle < -90 ? angle + 180 : angle

    const offsetDistance = 15
    const perpX = -dy
    const perpY = dx
    const perpLength = Math.sqrt(perpX * perpX + perpY * perpY)

    if (perpLength > 0) {
      const normalizedPerpX = perpX / perpLength
      const normalizedPerpY = perpY / perpLength
      x = (sourcePoint.x + targetPoint.x) / 2 + normalizedPerpX * offsetDistance
      y = (sourcePoint.y + targetPoint.y) / 2 + normalizedPerpY * offsetDistance
    } else {
      x = (sourcePoint.x + targetPoint.x) / 2
      y = (sourcePoint.y + targetPoint.y) / 2
    }
  } else {
    const LABEL_GAP = 8
    if (isMiddlePathHorizontal) {
      // Horizontal edge: place label above the line
      x = pathMiddlePosition.x
      y = pathMiddlePosition.y - LABEL_GAP
    } else {
      // Vertical edge: place label to the left of the line with gap
      x = pathMiddlePosition.x - LABEL_GAP
      y = pathMiddlePosition.y
    }
  }

  const textAnchor = isUseCasePath
    ? "middle"
    : isMiddlePathHorizontal
      ? "middle"
      : "end"
  const dominantBaseline = isUseCasePath
    ? "middle"
    : isMiddlePathHorizontal
      ? "auto"
      : "middle"

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline={dominantBaseline}
      style={{
        fontSize: "12px",
        fontWeight: 700,
        fill: textColor,
        userSelect: "none",
        pointerEvents: "none",
      }}
      transform={rotation !== 0 ? `rotate(${rotation} ${x} ${y})` : undefined}
      className="nodrag nopan"
    >
      {label}
    </text>
  )
}
