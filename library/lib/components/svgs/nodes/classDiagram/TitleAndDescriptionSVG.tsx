import React, { useMemo, SVGAttributes } from "react"
import { LAYOUT } from "@/constants"
import { wrapTextInRect } from "@/utils/svgTextLayout"

interface TitleAndDescriptionSVGProps {
  width: number
  height: number
  title: string
  description: string
  SIDEBAR_PREVIEW_SCALE?: number
  svgAttributes?: SVGAttributes<SVGElement>
}

const TITLE_FONT_SIZE = 16
const DESCRIPTION_FONT_SIZE = 14
const DESCRIPTION_LINE_HEIGHT = 18

export const TitleAndDescriptionSVG: React.FC<TitleAndDescriptionSVGProps> = ({
  width,
  height,
  title,
  description,
  SIDEBAR_PREVIEW_SCALE,
  svgAttributes,
}) => {
  const padding = 10
  const titleHeight = 30
  const separatorHeight = LAYOUT.LINE_WIDTH
  const descriptionStartY = padding + titleHeight + separatorHeight + 10
  const maxDescriptionHeight = height - descriptionStartY - padding
  const maxTextWidth = width - 2 * padding

  const descriptionLines = useMemo(() => {
    const maxLines = Math.max(
      0,
      Math.floor(maxDescriptionHeight / DESCRIPTION_LINE_HEIGHT)
    )
    const wrapped = wrapTextInRect(
      description,
      maxTextWidth,
      { fontSize: DESCRIPTION_FONT_SIZE },
      {
        maxLines,
        lineHeight: DESCRIPTION_LINE_HEIGHT,
      }
    )
    if (!wrapped.overflow || wrapped.lines.length === 0) return wrapped.lines
    const withEllipsis = [...wrapped.lines]
    withEllipsis[withEllipsis.length - 1] = `${
      withEllipsis[withEllipsis.length - 1]
    } ...`
    return withEllipsis
  }, [description, maxTextWidth, maxDescriptionHeight])

  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      {/* Outer Border */}
      <rect
        x={padding / 2}
        y={padding / 2}
        width={width - padding}
        height={height - padding}
        stroke="var(--apollon-primary-contrast, #000000)"
        strokeWidth={LAYOUT.LINE_WIDTH}
        fill="var(--apollon-background, white)"
      />

      {/* Title */}
      <text
        x={width / 2}
        y={padding + titleHeight / 2}
        fontSize={TITLE_FONT_SIZE}
        fontWeight="bold"
        fill="var(--apollon-primary-contrast, #000000)"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {title}
      </text>

      {/* Separator Line */}
      <line
        x1={padding / 2}
        x2={width - padding / 2}
        y1={padding + titleHeight}
        y2={padding + titleHeight}
        stroke="var(--apollon-primary-contrast, #000000)"
        strokeWidth={LAYOUT.LINE_WIDTH}
      />

      {/* Description */}
      {descriptionLines.map((line, index) => (
        <text
          key={index}
          x={padding}
          y={descriptionStartY + index * DESCRIPTION_LINE_HEIGHT}
          fontSize={DESCRIPTION_FONT_SIZE}
          fill="var(--apollon-primary-contrast, #000000)"
          alignmentBaseline="hanging"
        >
          {line}
        </text>
      ))}
    </svg>
  )
}
