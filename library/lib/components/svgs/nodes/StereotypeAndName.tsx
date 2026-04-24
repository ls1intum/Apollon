import { FC, useMemo } from "react"
import { CustomText } from "./CustomText"
import { MultilineText } from "./MultilineText"
import { LAYOUT } from "@/constants"
import { maxLinesForHeight, wrapTextInRect } from "@/utils/svgTextLayout"

type Props = {
  name: string
  /** Optional UML stereotype like `"component"` or `"subsystem"`. */
  stereotype?: string
  /** Whether to show the stereotype line above the name. */
  showStereotype: boolean
  /** Node width in SVG user units. */
  width: number
  /** Node height in SVG user units. */
  height: number
  /** Horizontal padding reserved on each side (e.g. for a right-edge icon). */
  sideReserve?: number
  /** Additional name-tspan attributes (e.g. `textDecoration="underline"`). */
  nameTextDecoration?: React.SVGProps<SVGTextElement>["textDecoration"]
  fontWeight?: string | number
  fill?: string
}

/**
 * Renders a centered `{«stereotype», name}` group inside a rectangular node.
 *
 * Layout: the stereotype is a single short line at `0.8em` of the name font;
 * the name wraps via `MultilineText` and is capped to what fits below the
 * stereotype. The whole group is vertically centered in the node — so when
 * the name grows from one line to three, the stereotype slides upward to
 * keep the pair centered as a unit, rather than sitting at a fixed offset
 * that only looks right for single-line names.
 *
 * Extracted from `ComponentNodeSVG` / `DeploymentComponentSVG` where the
 * same math was hand-inlined twice; also used by the subsystem and
 * deployment-node header variants for visual consistency.
 */
export const StereotypeAndName: FC<Props> = ({
  name,
  stereotype,
  showStereotype,
  width,
  height,
  sideReserve = 48,
  nameTextDecoration,
  fontWeight = "bold",
  fill,
}) => {
  const centerX = width / 2
  const centerY = height / 2
  const nameMaxWidth = Math.max(1, width - sideReserve)
  const nameMaxLines = showStereotype
    ? maxLinesForHeight(
        height - LAYOUT.STEREOTYPE_LINE_HEIGHT - LAYOUT.STEREOTYPE_NAME_GAP - 8,
        LAYOUT.NAME_LINE_HEIGHT
      )
    : maxLinesForHeight(height - 16, LAYOUT.NAME_LINE_HEIGHT)

  const nameLineCount = useMemo(() => {
    if (!name) return 0
    const wrapped = wrapTextInRect(
      name,
      nameMaxWidth,
      { fontSize: LAYOUT.NAME_FONT_SIZE, fontWeight },
      { lineHeight: LAYOUT.NAME_LINE_HEIGHT, maxLines: nameMaxLines }
    )
    return Math.max(1, wrapped.lines.length)
  }, [name, nameMaxWidth, nameMaxLines, fontWeight])

  const groupHeight = showStereotype
    ? LAYOUT.STEREOTYPE_LINE_HEIGHT +
      LAYOUT.STEREOTYPE_NAME_GAP +
      nameLineCount * LAYOUT.NAME_LINE_HEIGHT
    : nameLineCount * LAYOUT.NAME_LINE_HEIGHT
  const groupTop = centerY - groupHeight / 2
  const stereotypeCenterY = groupTop + LAYOUT.STEREOTYPE_LINE_HEIGHT / 2
  const nameFirstLineCenterY = showStereotype
    ? groupTop +
      LAYOUT.STEREOTYPE_LINE_HEIGHT +
      LAYOUT.STEREOTYPE_NAME_GAP +
      LAYOUT.NAME_LINE_HEIGHT / 2
    : groupTop + LAYOUT.NAME_LINE_HEIGHT / 2

  return (
    <>
      {showStereotype && stereotype && stereotype.length > 0 && (
        <CustomText
          x={centerX}
          y={stereotypeCenterY}
          textAnchor="middle"
          fontWeight={String(fontWeight)}
          dominantBaseline="middle"
          fill={fill}
          fontSize="0.8em"
        >
          {`«${stereotype}»`}
        </CustomText>
      )}
      <MultilineText
        text={name}
        x={centerX}
        y={nameFirstLineCenterY}
        maxWidth={nameMaxWidth}
        fontSize={LAYOUT.NAME_FONT_SIZE}
        lineHeight={LAYOUT.NAME_LINE_HEIGHT}
        fontWeight={fontWeight}
        fill={fill}
        verticalAnchor="top"
        maxLines={nameMaxLines}
        textDecoration={nameTextDecoration}
      />
    </>
  )
}
