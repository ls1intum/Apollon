import { FC } from "react"
import { INTERFACE, LAYOUT } from "@/constants"
import { MultilineText } from "./MultilineText"

interface Props {
  name?: string | null
  /** Interface circle bounds (always square — INTERFACE.SIZE). */
  width: number
  height: number
  fill?: string
}

/**
 * The provided/required interface name, centered directly BELOW the ball/socket
 * rather than floating off its top-right corner. "Below" keeps the name clear of
 * the assessment badge (drawn top-right) and reads naturally under a small
 * circle; the name wraps (MultilineText) instead of overflowing into neighbours.
 *
 * Renders as SVG <text>/<tspan> in the node's overflow:visible region. The
 * PNG/PDF/SVG export pipeline captures it via its node-text bbox scan
 * (utils/exportUtils.ts), so it exports correctly without enlarging the viewBox.
 */
export const InterfaceLabel: FC<Props> = ({ name, width, height, fill }) => {
  if (!name) return null

  // Read tokens at runtime, not module top-level: this file is part of the
  // @/components → nodes → @/constants import cycle, so a top-level read can hit
  // the constant before it is initialised (TDZ). See edgeUtils.ts for the same
  // hazard.
  const labelGap = LAYOUT.DEFAULT_PADDING / 2
  const labelMaxWidth = INTERFACE.SIZE * 4
  const circleBottom = height / 2 + width / 2
  return (
    <MultilineText
      text={name}
      x={width / 2}
      // verticalAnchor="top" treats `y` as the first line's CENTER, so offset by
      // half a line to clear the circle bottom by labelGap.
      y={circleBottom + labelGap + LAYOUT.NAME_LINE_HEIGHT / 2}
      verticalAnchor="top"
      textAnchor="middle"
      maxWidth={labelMaxWidth}
      maxLines={2}
      fontSize={LAYOUT.NAME_FONT_SIZE}
      lineHeight={LAYOUT.NAME_LINE_HEIGHT}
      fontWeight="bold"
      fill={fill}
    />
  )
}
