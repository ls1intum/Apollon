import { IPoint } from "../Connection"

interface EdgeIncludeExtendLabelsProps {
  label?: string | null
  pathMiddlePosition: IPoint

  sourcePoint?: IPoint
  targetPoint?: IPoint
  isUseCasePath?: boolean
  showRelationshipLabels?: boolean
  relationshipType?: "include" | "extend"
}

export const EdgeIncludeExtendLabel = ({
  sourcePoint,
  targetPoint,
  showRelationshipLabels = false,
  relationshipType = "include",
}: EdgeIncludeExtendLabelsProps) => {
  return (
    <>
      {showRelationshipLabels &&
        relationshipType &&
        sourcePoint &&
        targetPoint &&
        (() => {
          const dx = targetPoint.x - sourcePoint.x
          const dy = targetPoint.y - sourcePoint.y
          const angle = Math.atan2(dy, dx) * (180 / Math.PI)
          let rotation = angle
          if (angle > 90 || angle < -90) {
            rotation = angle + 180
          }

          const middleX = (sourcePoint.x + targetPoint.x) / 2
          const middleY = (sourcePoint.y + targetPoint.y) / 2

          return (
            <text
              x={middleX}
              y={middleY}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${rotation}, ${middleX}, ${middleY})`}
              className="edge-label"
              style={{
                fontSize: "12px",
                fill: "var(--apollon-primary-contrast)",
                fontStyle: "italic",
                userSelect: "none",
                fontWeight: "bold",
                pointerEvents: "none",
              }}
            >
              {relationshipType === "include" ? "<<include>>" : "<<extend>>"}
            </text>
          )
        })()}
    </>
  )
}
