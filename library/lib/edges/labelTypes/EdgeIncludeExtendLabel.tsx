import { IPoint } from "../Connection"
import { computeUseCaseLabelLayout } from "@/utils/geometry/edgeLabelLayout"

interface EdgeIncludeExtendLabelsProps {
  sourcePoint?: IPoint
  targetPoint?: IPoint
  showRelationshipLabels?: boolean
  relationshipType?: "include" | "extend"
  textColor?: string
}

export const EdgeIncludeExtendLabel = ({
  sourcePoint,
  targetPoint,
  showRelationshipLabels = false,
  relationshipType = "include",
  textColor = "var(--apollon-foreground, #000000)",
}: EdgeIncludeExtendLabelsProps) => {
  if (
    !showRelationshipLabels ||
    !relationshipType ||
    !sourcePoint ||
    !targetPoint
  )
    return null

  // Centered on the line (offset 0): the stereotype sits in the gap that
  // calculateStraightPath carves at the midpoint, so the dashed line never
  // crosses the text. Shares the rotation math with the use-case association
  // label via the same helper.
  const { x, y, rotation } = computeUseCaseLabelLayout(
    sourcePoint,
    targetPoint,
    0
  )

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={`rotate(${rotation}, ${x}, ${y})`}
      className="edge-label"
      style={{
        fontSize: "12px",
        fill: textColor,
        fontStyle: "italic",
        userSelect: "none",
        fontWeight: "bold",
        pointerEvents: "none",
      }}
    >
      {relationshipType === "include" ? "<<include>>" : "<<extend>>"}
    </text>
  )
}
