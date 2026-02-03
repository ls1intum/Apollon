import React, { useMemo, useCallback, SVGAttributes } from "react"

interface TitleAndDescriptionSVGProps {
  width: number
  height: number
  title: string
  description: string
  SIDEBAR_PREVIEW_SCALE?: number
  svgAttributes?: SVGAttributes<SVGElement>
}

export const TitleAndDescriptionSVG: React.FC<TitleAndDescriptionSVGProps> = ({
  width,
  height,
  title,
  description,
  SIDEBAR_PREVIEW_SCALE,
  svgAttributes,
}) => {
  const padding = 10 // Padding inside the SVG
  const titleHeight = 30 // Fixed height for the title
  const separatorHeight = 1 // Height of the separator line
  const lineHeight = 18 // Line height for description
  const descriptionStartY = padding + titleHeight + separatorHeight + 10 // Space for description
  const maxDescriptionHeight = height - descriptionStartY - padding // Max height for description

  // Memoized wrapText function
  const wrapText = useCallback((text: string, maxWidth: number): string[] => {
    const words = text.split(" ")
    const lines: string[] = []
    let currentLine = ""

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const lineWidth = testLine.length * 7 // Approximation for font size 14px
      if (lineWidth < maxWidth) {
        currentLine = testLine
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    })

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }, [])

  const maxTextWidth = width - 2 * padding

  // Memoized description lines calculation
  const descriptionLines = useMemo(() => {
    const wrappedLines = wrapText(description, maxTextWidth)
    const maxLines = Math.floor(maxDescriptionHeight / lineHeight)

    if (wrappedLines.length > maxLines) {
      const truncatedLines = wrappedLines.slice(0, maxLines)
      // Add ellipsis to the last line if the text is truncated
      truncatedLines[truncatedLines.length - 1] += " ..."
      return truncatedLines
    }

    return wrappedLines
  }, [description, maxTextWidth, maxDescriptionHeight, lineHeight, wrapText])

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
        stroke="black"
        strokeWidth="1"
        fill="white"
      />

      {/* Title */}
      <text
        x={width / 2}
        y={padding + titleHeight / 2}
        fontSize="16"
        fontWeight="bold"
        fill="black"
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
        stroke="black"
        strokeWidth={separatorHeight}
      />

      {/* Description */}
      {descriptionLines.map((line, index) => (
        <text
          key={index}
          x={padding}
          y={descriptionStartY + index * lineHeight}
          fontSize="14"
          fill="black"
          alignmentBaseline="hanging"
        >
          {line}
        </text>
      ))}
    </svg>
  )
}
