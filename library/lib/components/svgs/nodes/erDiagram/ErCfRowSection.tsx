import { FC } from "react"
import { ErCfColumn } from "@/types"
import { CustomText } from "../CustomText"
import AssessmentIcon from "../../AssessmentIcon"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableElement } from "@/components/AssessmentSelectableElement"
import { getCustomColorsFromData, measureTextWidth } from "@/utils"
import { DEFAULT_FONT_SIZE, LAYOUT } from "@/constants"

// Width of the leftmost key gutter (holds "PK" / "FK" / "UK"). Matches Mermaid's
// dedicated key column.
export const ER_CF_KEY_GUTTER_WIDTH = 34

interface Props {
  columns: (ErCfColumn & { score?: number })[]
  padding: number
  itemHeight: number
  width: number
  offsetFromTop: number
  showAssessmentResults?: boolean
}

// Renders an entity's columns as structured rows: [key gutter] name [type],
// the layout Mermaid / DBML / physical ER tools use. Primary-key names are
// underlined (drawn as an explicit line so it survives PNG/PDF export, unlike
// CSS text-decoration).
export const ErCfRowSection: FC<Props> = ({
  columns,
  padding,
  itemHeight,
  width,
  offsetFromTop,
  showAssessmentResults = false,
}) => {
  const nameX = padding + ER_CF_KEY_GUTTER_WIDTH
  const typeX = width - padding

  return (
    <g transform={`translate(0, ${offsetFromTop})`}>
      {columns.map((column, index) => {
        const y = index * itemHeight
        const centerY = 15 + y
        const { fillColor, textColor } = getCustomColorsFromData(column)
        const keys = column.keys ?? []
        const isPrimary = keys.includes("PK")

        return (
          <AssessmentSelectableElement
            key={column.id}
            elementId={column.id}
            width={width}
            itemHeight={itemHeight}
            yOffset={y}
          >
            <FeedbackDropzone elementId={column.id} elementType="attribute">
              <rect
                x={LAYOUT.LINE_WIDTH / 2}
                y={y + LAYOUT.LINE_WIDTH / 2}
                width={width - LAYOUT.LINE_WIDTH}
                height={itemHeight - LAYOUT.LINE_WIDTH}
                fill={fillColor}
              />

              {keys.length > 0 && (
                <CustomText
                  x={padding}
                  y={centerY}
                  dominantBaseline="middle"
                  textAnchor="start"
                  fontWeight="600"
                  fill={textColor}
                >
                  {keys.join(", ")}
                </CustomText>
              )}

              <CustomText
                x={nameX}
                y={centerY}
                dominantBaseline="middle"
                textAnchor="start"
                fill={textColor}
              >
                {column.name}
              </CustomText>
              {isPrimary && column.name && (
                <line
                  x1={nameX}
                  x2={nameX + measureTextWidth(column.name)}
                  y1={centerY + DEFAULT_FONT_SIZE * 0.6}
                  y2={centerY + DEFAULT_FONT_SIZE * 0.6}
                  stroke={textColor}
                  strokeWidth={1.5}
                />
              )}

              {column.type && (
                <CustomText
                  x={typeX}
                  y={centerY}
                  dominantBaseline="middle"
                  textAnchor="end"
                  fill={textColor}
                  opacity={0.65}
                >
                  {column.type}
                </CustomText>
              )}
            </FeedbackDropzone>
            {showAssessmentResults && typeof column.score === "number" && (
              <AssessmentIcon score={column.score} x={width - 15} y={y - 12} />
            )}
          </AssessmentSelectableElement>
        )
      })}
    </g>
  )
}
