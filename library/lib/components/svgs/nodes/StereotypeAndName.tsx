import { FC, useMemo } from "react"
import { CustomText } from "./CustomText"
import { MultilineText } from "./MultilineText"
import { LAYOUT } from "@/constants"
import { maxLinesForHeight, wrapTextInRect } from "@/utils/svgTextLayout"

type VerticalAnchor = "center" | "top"

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
  /**
   * Horizontal space (total of both sides) to reserve for surrounding chrome
   * such as an icon in the top-right corner. Defaults to
   * `2 * LAYOUT.DEFAULT_PADDING`; pass a larger value when the node has a
   * visible icon that the wrapped name would otherwise run under.
   */
  sideReserve?: number
  /**
   * Whether the `{stereotype, name}` group centers vertically (`"center"`)
   * or sits pinned to the top of the node (`"top"`). Centering is the
   * right choice when the node has no other vertical chrome; top-anchoring
   * suits container / swimlane nodes whose body is reserved for children.
   */
  verticalAnchor?: VerticalAnchor
  /** y coordinate of the first line's visual center in `"top"` mode. */
  topAnchorY?: number
  /** Additional name-tspan attributes (e.g. `textDecoration="underline"`). */
  nameTextDecoration?: React.SVGProps<SVGTextElement>["textDecoration"]
  fontWeight?: string | number
  fill?: string
}

/**
 * Renders a `{«stereotype», name}` group inside a rectangular node.
 *
 * Two placement modes:
 *  - `"center"` (default): the stereotype and the wrapped name are
 *    centered as a single vertical group. When the name grows from one
 *    to three lines, the stereotype slides upward so the pair stays on
 *    the vertical midline.
 *  - `"top"`: the first name line's visual center lands at `topAnchorY`
 *    (defaults to `22`, matching the legacy hanging-baseline layout) and
 *    the stereotype sits just above it. Used by container nodes like
 *    ComponentSubsystem and DeploymentNode where the body below is
 *    reserved for children.
 *
 * Extracted from `ComponentNodeSVG` / `DeploymentComponentSVG` where the
 * same math was hand-inlined twice; the top-anchored variant unifies
 * `ComponentSubsystemNodeSVG` / `DeploymentNodeSVG` with the same
 * abstraction.
 */
export const StereotypeAndName: FC<Props> = ({
  name,
  stereotype,
  showStereotype,
  width,
  height,
  sideReserve,
  verticalAnchor = "center",
  topAnchorY = 22,
  nameTextDecoration,
  fontWeight = "bold",
  fill,
}) => {
  // `LAYOUT` can't be read at module scope because `constants.ts` pulls in
  // every node SVG transitively — resolving the default here (at render
  // time, after module init) breaks the cycle.
  const resolvedSideReserve = sideReserve ?? LAYOUT.DEFAULT_PADDING * 2
  const centerX = width / 2
  const nameMaxWidth = Math.max(1, width - resolvedSideReserve)

  // Top-anchored nodes can use their full height below the label area;
  // centered nodes cap to what fits above + below the stereotype.
  const nameMaxLines =
    verticalAnchor === "top"
      ? maxLinesForHeight(
          height - topAnchorY - LAYOUT.NAME_LINE_HEIGHT,
          LAYOUT.NAME_LINE_HEIGHT
        )
      : showStereotype
        ? maxLinesForHeight(
            height -
              LAYOUT.STEREOTYPE_LINE_HEIGHT -
              LAYOUT.STEREOTYPE_NAME_GAP -
              8,
            LAYOUT.NAME_LINE_HEIGHT
          )
        : maxLinesForHeight(height - 16, LAYOUT.NAME_LINE_HEIGHT)

  // Measure the wrapped name up-front so centered mode can slide the
  // stereotype up/down as the name grows — keeping the whole group on the
  // vertical midline regardless of line count.
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

  const { stereotypeCenterY, nameFirstLineCenterY } = (() => {
    if (verticalAnchor === "top") {
      return {
        stereotypeCenterY:
          topAnchorY -
          LAYOUT.STEREOTYPE_LINE_HEIGHT / 2 -
          LAYOUT.STEREOTYPE_NAME_GAP -
          LAYOUT.NAME_LINE_HEIGHT / 2 +
          LAYOUT.NAME_LINE_HEIGHT / 2,
        nameFirstLineCenterY: showStereotype
          ? topAnchorY +
            LAYOUT.STEREOTYPE_LINE_HEIGHT +
            LAYOUT.STEREOTYPE_NAME_GAP -
            LAYOUT.NAME_LINE_HEIGHT / 2 +
            LAYOUT.NAME_LINE_HEIGHT / 2
          : topAnchorY,
      }
    }
    const groupHeight = showStereotype
      ? LAYOUT.STEREOTYPE_LINE_HEIGHT +
        LAYOUT.STEREOTYPE_NAME_GAP +
        nameLineCount * LAYOUT.NAME_LINE_HEIGHT
      : nameLineCount * LAYOUT.NAME_LINE_HEIGHT
    const groupTop = height / 2 - groupHeight / 2
    return {
      stereotypeCenterY: groupTop + LAYOUT.STEREOTYPE_LINE_HEIGHT / 2,
      nameFirstLineCenterY: showStereotype
        ? groupTop +
          LAYOUT.STEREOTYPE_LINE_HEIGHT +
          LAYOUT.STEREOTYPE_NAME_GAP +
          LAYOUT.NAME_LINE_HEIGHT / 2
        : groupTop + LAYOUT.NAME_LINE_HEIGHT / 2,
    }
  })()

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
