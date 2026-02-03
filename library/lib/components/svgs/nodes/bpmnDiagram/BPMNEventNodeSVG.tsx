import { CustomText } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { SVGComponentProps } from "@/types/SVG"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { BPMNEventProps } from "@/types"
import { getCustomColorsFromData } from "@/utils"

export type BPMNEventVariant = "start" | "intermediate" | "end"

export type BPMNEventNodeSVGProps = SVGComponentProps & {
  variant: BPMNEventVariant
  data: BPMNEventProps
}

export const BPMNEventNodeSVG: React.FC<BPMNEventNodeSVGProps> = ({
  width,
  height,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  variant,
  data,
  id,
  showAssessmentResults = false,
}) => {
  const { name, eventType } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const r = Math.min(width, height) / 2

  const innerCircle = variant === "intermediate"
  const thickStroke = variant === "end"

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  const icon = (() => {
    const centerX = width / 2 - 10
    const centerY = height / 2 - 10
    const translate = `translate(${centerX},${centerY})`
    const et = eventType as string | undefined
    if (!et) return null
    if (variant === "start") {
      switch (et) {
        case "message":
          return (
            <g transform={translate}>
              <polyline
                points="0 3, 0 17, 20 17, 20 3, 10 11, 0 3, 20 3"
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "timer":
          return (
            <g transform={translate}>
              <circle
                cx={10}
                cy={10}
                r={10}
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="10 4, 10 10, 13 13"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "conditional":
          return (
            <g transform={translate}>
              <rect
                x={2}
                y={2}
                width={16}
                height={16}
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="6 7, 14 7"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="6 13, 14 13"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "signal":
          return (
            <g transform={translate}>
              <polyline
                points="10 3, 3 15, 17 15, 10 3"
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
      }
    }
    if (variant === "intermediate") {
      switch (et) {
        case "message-catch":
          return (
            <g transform={translate}>
              <polyline
                points="0 3, 0 17, 20 17, 20 3, 10 11, 0 3, 20 3"
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "message-throw":
          return (
            <g transform={translate}>
              <polyline
                points="0.2 3, 19.8 3, 10 11, 0.2 3"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="0 5.5, 0 17, 20 17, 20 5.5, 10 13.5, 0 5.5"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "timer-catch":
          return (
            <g transform={translate}>
              <circle
                cx={10}
                cy={10}
                r={10}
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="10 4, 10 10, 13 13"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "escalation-throw":
          return (
            <g transform={translate}>
              <polyline
                points="10 3, 4 15, 10 12, 16 15, 10 3"
                stroke="var(--apollon2-primary-contrast)"
                fill="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "conditional-catch":
          return (
            <g transform={translate}>
              <rect
                x={2}
                y={2}
                width={16}
                height={16}
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="6 7, 14 7"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="6 13, 14 13"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "link-catch":
          return (
            <g transform={translate}>
              <polyline
                points="3 7, 13 7, 13 4, 18 10, 13 16, 13 13, 3 13, 3 7"
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "link-throw":
          return (
            <g transform={translate}>
              <polyline
                points="3 7, 13 7, 13 4, 18 10, 13 16, 13 13, 3 13, 3 7"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "compensation-throw":
          return (
            <g transform={translate}>
              <polyline
                points="3 10, 9 6, 9 14, 3 10"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="10 10, 16 6, 16 14, 10 10"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "signal-catch":
          return (
            <g transform={translate}>
              <polyline
                points="10 3, 3 15, 17 15, 10 3"
                fill="none"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "signal-throw":
          return (
            <g transform={translate}>
              <polyline
                points="10 3, 3 15, 17 15, 10 3"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
      }
    }
    if (variant === "end") {
      switch (et) {
        case "message":
          return (
            <g transform={translate}>
              <polyline
                points="0.2 3, 19.8 3, 10 11, 0.2 3"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="0 5.5, 0 17, 20 17, 20 5.5, 10 13.5, 0 5.5"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "escalation":
          return (
            <g transform={translate}>
              <polyline
                points="10 3, 4 15, 10 12, 16 15, 10 3"
                stroke="var(--apollon2-primary-contrast)"
                fill="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "error":
          return (
            <g transform={translate}>
              <polyline
                points="3 16, 6 4, 13 11, 17 4, 14 16, 7 10, 3 16"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "compensation":
          return (
            <g transform={translate}>
              <polyline
                points="3 10, 9 6, 9 14, 3 10"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
              <polyline
                points="10 10, 16 6, 16 14, 10 10"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "signal":
          return (
            <g transform={translate}>
              <polyline
                points="10 3, 3 15, 17 15, 10 3"
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
        case "terminate":
          return (
            <g transform={translate}>
              <circle
                cx={10}
                cy={10}
                r={8}
                fill="var(--apollon2-primary-contrast)"
                stroke="var(--apollon2-primary-contrast)"
              />
            </g>
          )
      }
    }
    return null
  })()

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <circle
        cx={width / 2}
        cy={height / 2}
        r={r}
        strokeWidth={thickStroke ? LAYOUT.LINE_WIDTH * 2 : LAYOUT.LINE_WIDTH}
        stroke={strokeColor}
        fill={fillColor}
      />
      {innerCircle && (
        <circle
          cx={width / 2}
          cy={height / 2}
          r={r - 3.5}
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
          fill={fillColor}
        />
      )}
      {icon}
      {name && (
        <CustomText
          x={width / 2}
          y={height + 10}
          textAnchor="middle"
          fontWeight="normal"
          fontSize={14}
          dominantBaseline="hanging"
          fill={textColor}
        >
          {name}
        </CustomText>
      )}

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
