import { ClassNodeElement } from "@/types"
import { CustomText } from "./CustomText"
import { FC } from "react"
import AssessmentIcon from "../AssessmentIcon"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableElement } from "@/components/AssessmentSelectableElement"
import { getCustomColorsFromData } from "@/utils"
import { LAYOUT } from "@/constants"

interface RowBlockSectionProps {
  items: (ClassNodeElement & { score?: number })[]
  padding: number
  itemHeight: number
  width: number
  offsetFromTop: number
  showAssessmentResults?: boolean
  itemElementType?: string
}
export const RowBlockSection: FC<RowBlockSectionProps> = ({
  items,
  padding,
  itemHeight,
  offsetFromTop,
  width,
  showAssessmentResults = false,
  itemElementType,
}) => {
  return (
    <g transform={`translate(0, ${offsetFromTop})`}>
      {items.map((item, index) => {
        const y = index * itemHeight
        const iconY = y - 12
        const iconX = width - 15
        const { fillColor, textColor } = getCustomColorsFromData(item)
        return (
          <AssessmentSelectableElement
            key={item.id}
            elementId={item.id}
            width={width}
            itemHeight={itemHeight}
            yOffset={y}
          >
            <FeedbackDropzone elementId={item.id} elementType={itemElementType}>
              <rect
                x={LAYOUT.LINE_WIDTH / 2}
                y={y + LAYOUT.LINE_WIDTH / 2}
                width={width - LAYOUT.LINE_WIDTH}
                height={itemHeight - LAYOUT.LINE_WIDTH}
                fill={fillColor}
              />
              <CustomText
                x={padding}
                y={15 + index * itemHeight}
                dominantBaseline="middle"
                textAnchor="start"
                fill={textColor}
              >
                {item.name}
              </CustomText>
            </FeedbackDropzone>
            {showAssessmentResults && typeof item.score === "number" && (
              <AssessmentIcon score={item.score} x={iconX} y={iconY} />
            )}
          </AssessmentSelectableElement>
        )
      })}
    </g>
  )
}
