import { FC, useMemo } from "react"
import { MultilineText } from "./MultilineText"
import { LAYOUT } from "@/constants"
import { wrapTextInRect } from "@/utils/svgTextLayout"

export type NodeSubtextContent = {
  /**
   * Short implementation marker rendered in brackets, e.g. `[Kotlin/Ktor]` or
   * `[EC2]`. Capped at one line: it is a marker, not a sentence.
   */
  technology?: string
  /** Free-text sentence(s) below the technology marker. */
  description?: string
}

type Props = NodeSubtextContent & {
  x: number
  /** Visual center of the first subtext line. */
  y: number
  maxWidth: number
  /** Cap across the technology and description blocks together. */
  maxLines: number
  fill?: string
}

// Resolved per call, not at module scope: `constants.ts` pulls in every node SVG
// transitively, so `LAYOUT` is still undefined while this module is initialising.
// Same reason `StereotypeAndName` defers its padding default.
const subtextFont = () => ({
  fontSize: LAYOUT.SUBTEXT_FONT_SIZE,
  fontWeight: 400,
})

/** Whether either half is worth rendering — both are optional and usually absent. */
export const hasNodeSubtext = ({
  technology,
  description,
}: NodeSubtextContent): boolean =>
  Boolean(technology?.trim()) || Boolean(description?.trim())

/**
 * How many lines [NodeSubtext] will occupy, so a caller laying out a vertically
 * centered group can budget for it before rendering. Same measurement path as
 * the component itself, so the two cannot disagree.
 */
export const countNodeSubtextLines = (
  { technology, description }: NodeSubtextContent,
  maxWidth: number,
  maxLines: number
): number => {
  if (maxLines <= 0) return 0
  const technologyLines = technology?.trim() ? 1 : 0
  const remaining = maxLines - technologyLines
  if (!description?.trim() || remaining <= 0) return technologyLines
  const wrapped = wrapTextInRect(description, maxWidth, subtextFont(), {
    lineHeight: LAYOUT.SUBTEXT_LINE_HEIGHT,
    maxLines: remaining,
  })
  return technologyLines + wrapped.lines.length
}

/**
 * The `[technology]` marker and description paragraph shown under a node's name.
 *
 * Both halves are optional and render nothing when absent, so a node that has
 * never been given either looks exactly as it did before the fields existed.
 * They are one component rather than two because they share a line budget: a
 * long description must not push the technology marker out of the box, and the
 * two together have to stop at the node's bottom edge.
 */
export const NodeSubtext: FC<Props> = ({
  technology,
  description,
  x,
  y,
  maxWidth,
  maxLines,
  fill,
}) => {
  const technologyText = technology?.trim()
  const descriptionText = description?.trim()

  const descriptionMaxLines = useMemo(
    () => maxLines - (technologyText ? 1 : 0),
    [maxLines, technologyText]
  )

  if (maxLines <= 0 || (!technologyText && !descriptionText)) {
    return null
  }

  return (
    <>
      {technologyText && (
        <MultilineText
          text={`[${technologyText}]`}
          x={x}
          y={y}
          maxWidth={maxWidth}
          fontSize={LAYOUT.SUBTEXT_FONT_SIZE}
          lineHeight={LAYOUT.SUBTEXT_LINE_HEIGHT}
          fontStyle="italic"
          fill={fill}
          verticalAnchor="top"
          maxLines={1}
        />
      )}
      {descriptionText && descriptionMaxLines > 0 && (
        <MultilineText
          text={descriptionText}
          x={x}
          y={y + (technologyText ? LAYOUT.SUBTEXT_LINE_HEIGHT : 0)}
          maxWidth={maxWidth}
          fontSize={LAYOUT.SUBTEXT_FONT_SIZE}
          lineHeight={LAYOUT.SUBTEXT_LINE_HEIGHT}
          fill={fill}
          verticalAnchor="top"
          maxLines={descriptionMaxLines}
        />
      )}
    </>
  )
}
