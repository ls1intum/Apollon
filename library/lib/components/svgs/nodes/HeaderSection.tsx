import { FC } from "react"
import { ClassStereotype } from "@/types"
import { CustomText } from "./CustomText"
import { LAYOUT } from "@/constants"
import { stereotypeLabel, withAbstractMarker } from "@/utils"

interface HeaderSectionProps {
  showStereotype: boolean
  stereotype?: ClassStereotype
  name: string
  width: number
  headerHeight: number
  isUnderlined?: boolean
  /** Abstract class → italic name (UML 2.5.1 §9.2.4). */
  isAbstract?: boolean
  textColor?: string
  fill?: string
}

export const HeaderSection: FC<HeaderSectionProps> = ({
  showStereotype,
  stereotype,
  name,
  width,
  headerHeight,
  isUnderlined = false,
  isAbstract = false,
  textColor,
  fill = "var(--apollon-background, white)",
}) => {
  return (
    <>
      <rect
        x={LAYOUT.LINE_WIDTH / 2}
        y={LAYOUT.LINE_WIDTH / 2}
        width={width - LAYOUT.LINE_WIDTH}
        height={headerHeight - LAYOUT.LINE_WIDTH / 2}
        fill={fill}
      />
      <CustomText
        x={width / 2}
        y={headerHeight / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fontWeight="bold"
        textDecoration={isUnderlined ? "underline" : "normal"}
        fill={textColor}
      >
        {showStereotype && stereotype && (
          <tspan x={width / 2} dy="-8" fontSize="85%">
            {stereotypeLabel(stereotype)}
          </tspan>
        )}
        <tspan
          x={width / 2}
          dy={showStereotype && stereotype ? "18" : "0"}
          fontStyle={isAbstract ? "italic" : "normal"}
        >
          {withAbstractMarker(name, isAbstract)}
        </tspan>
      </CustomText>
    </>
  )
}
