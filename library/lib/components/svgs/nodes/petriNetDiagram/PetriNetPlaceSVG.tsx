import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { CustomText } from "../CustomText"
import { LAYOUT } from "@/constants"
import { PetriNetPlaceProps } from "@/types"
import { getCustomColorsFromData } from "@/utils"

interface Props extends SVGComponentProps {
  data: PetriNetPlaceProps
}

export const PetriNetPlaceSVG: React.FC<Props> = ({
  id,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
  width,
  height,
}) => {
  const { name, tokens, capacity } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const centerX = width / 2
  const centerY = height / 2

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  const renderTokens = () => {
    if (tokens === 0) return null

    if (tokens <= 5) {
      // Show individual dots for small numbers
      const tokenPositions = []
      if (tokens === 1) {
        tokenPositions.push({ x: centerX, y: centerY })
      } else if (tokens === 2) {
        tokenPositions.push({ x: centerX, y: 13.25 })
        tokenPositions.push({ x: centerX, y: 46.75 })
      } else if (tokens === 3) {
        tokenPositions.push({ x: 15.06, y: 21.37 })
        tokenPositions.push({ x: 44.93, y: 21.37 })
        tokenPositions.push({ x: centerX, y: 47.25 })
      } else if (tokens === 4) {
        tokenPositions.push({ x: centerX, y: 12.25 })
        tokenPositions.push({ x: centerX, y: 47.75 })
        tokenPositions.push({ x: 12.25, y: centerY })
        tokenPositions.push({ x: 47.75, y: centerY })
      } else if (tokens === 5) {
        tokenPositions.push({ x: 19.27, y: 15.24 })
        tokenPositions.push({ x: 40.72, y: 15.24 })
        tokenPositions.push({ x: 47.35, y: 35.64 })
        tokenPositions.push({ x: 12.65, y: 35.64 })
        tokenPositions.push({ x: centerX, y: 48.25 })
      }

      return tokenPositions.map((pos, index) => (
        <circle key={index} cx={pos.x} cy={pos.y} r="9.25" fill={strokeColor} />
      ))
    } else {
      // Show number for larger values
      return (
        <CustomText fontWeight="bold" x={centerX} y={centerY} fill={textColor}>
          {tokens}
        </CustomText>
      )
    }
  }

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <circle
        cx={centerX}
        cy={centerY}
        r={width / 2}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
      />

      {typeof capacity === "number" && (
        <CustomText x={width + 8} y={-8} textAnchor="middle" fill={textColor}>
          C={capacity}
        </CustomText>
      )}

      <CustomText
        x={width / 2}
        y={height + 10}
        textAnchor="middle"
        fontWeight="600"
        dominantBaseline="central"
        fill={textColor}
      >
        {name}
      </CustomText>

      {renderTokens()}

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
