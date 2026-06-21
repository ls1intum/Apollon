import { FC } from "react"
import { ErCfColumn } from "@/types"
import { CustomText } from "../CustomText"
import AssessmentIcon from "../../AssessmentIcon"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableElement } from "@/components/AssessmentSelectableElement"
import { getCustomColorsFromData } from "@/utils"
import { LAYOUT } from "@/constants"

// Width of the leftmost key gutter (holds "PK" / "FK" / "UK"), matching Mermaid's
// dedicated key column.
export const ER_CF_KEY_GUTTER_WIDTH = 34
// Gap between the name column and the (left-aligned) data-type column.
export const ER_CF_COLUMN_GAP = 16

interface Props {
  columns: (ErCfColumn & { score?: number })[]
  padding: number
  itemHeight: number
  width: number
  offsetFromTop: number
  // Width of the widest column name, so every row's type column aligns.
  maxNameWidth: number
  // The entity's themeable stroke colour, so the row dividers track a user's
  // chosen border colour (rather than a hard-coded chrome grey).
  strokeColor: string
  showAssessmentResults?: boolean
}

// Renders an entity's columns as an aligned table: [key gutter] name  type.
// The key role (PK/FK/UK) sits in a left gutter, the data type in a muted column
// left-aligned at a shared x so the types line up — the layout Mermaid, dbdiagram
// and DrawSQL converge on. Thin row dividers + a shaded header band (set by the
// caller) make it read as a real table rather than a list.
export const ErCfRowSection: FC<Props> = ({
  columns,
  padding,
  itemHeight,
  width,
  offsetFromTop,
  maxNameWidth,
  strokeColor,
  showAssessmentResults = false,
}) => {
  const nameX = padding + ER_CF_KEY_GUTTER_WIDTH
  const typeX = nameX + maxNameWidth + ER_CF_COLUMN_GAP

  return (
    <g transform={`translate(0, ${offsetFromTop})`}>
      {columns.map((column, index) => {
        const y = index * itemHeight
        const centerY = 15 + y
        const { fillColor, textColor } = getCustomColorsFromData(column)
        const keys = column.keys ?? []

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
              {/* Light rule between rows — the entity stroke at low opacity, so
                  it themes with the border but stays subtler than the header
                  SeparationLine above. The first row's top is that header rule. */}
              {index > 0 && (
                <line
                  x1={0}
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke={strokeColor}
                  strokeOpacity={0.25}
                  strokeWidth={1}
                />
              )}

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

              {column.type && (
                <CustomText
                  x={typeX}
                  y={centerY}
                  dominantBaseline="middle"
                  textAnchor="start"
                  fill={textColor}
                  opacity={0.6}
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
