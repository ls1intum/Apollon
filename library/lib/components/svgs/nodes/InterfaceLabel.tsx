import { FC } from "react"
import { INTERFACE, LAYOUT } from "@/constants"
import { MultilineText } from "./MultilineText"
import type { InterfaceLabelSide } from "@/utils/geometry/interfaceLabelLayout"

interface Props {
  name?: string | null
  /** Interface circle bounds (always square — INTERFACE.SIZE). */
  width: number
  height: number
  fill?: string
  /** Which side of the circle the name sits on. Defaults to "bottom"; the node
   * component flips it away from sides a connecting edge attaches to. */
  side?: InterfaceLabelSide
}

/**
 * The provided/required interface name. Sits centered below the ball/socket by
 * default (reads naturally under a small circle and clears the top-right
 * assessment badge), and is moved to a clear side by the node component when a
 * connecting edge would otherwise run through it. The name wraps (MultilineText)
 * instead of overflowing into neighbours.
 *
 * Renders as SVG <text>/<tspan> in the node's overflow:visible region. The
 * PNG/PDF/SVG export pipeline captures it via its node-text bbox scan
 * (utils/exportUtils.ts), so it exports correctly without enlarging the viewBox.
 */
export const InterfaceLabel: FC<Props> = ({
  name,
  width,
  height,
  fill,
  side = "bottom",
}) => {
  if (!name) return null

  // Read tokens at runtime, not module top-level: this file is part of the
  // @/components → nodes → @/constants import cycle, so a top-level read can hit
  // the constant before it is initialised (TDZ). See edgeUtils.ts for the same
  // hazard.
  const gap = LAYOUT.DEFAULT_PADDING / 2
  const halfLine = LAYOUT.NAME_LINE_HEIGHT / 2
  const cx = width / 2
  const cy = height / 2
  const r = width / 2 // interface circles are square (INTERFACE.SIZE)

  // verticalAnchor treats `y` as the first/last/middle line's CENTER, so the
  // half-line offsets keep the nearest line clear of the circle by `gap`.
  const placement = {
    bottom: {
      x: cx,
      y: cy + r + gap + halfLine,
      textAnchor: "middle",
      verticalAnchor: "top",
    },
    top: {
      x: cx,
      y: cy - r - gap - halfLine,
      textAnchor: "middle",
      verticalAnchor: "bottom",
    },
    left: {
      x: cx - r - gap,
      y: cy,
      textAnchor: "end",
      verticalAnchor: "middle",
    },
    right: {
      x: cx + r + gap,
      y: cy,
      textAnchor: "start",
      verticalAnchor: "middle",
    },
  }[side] as {
    x: number
    y: number
    textAnchor: "start" | "middle" | "end"
    verticalAnchor: "top" | "middle" | "bottom"
  }

  return (
    <MultilineText
      text={name}
      x={placement.x}
      y={placement.y}
      verticalAnchor={placement.verticalAnchor}
      textAnchor={placement.textAnchor}
      maxWidth={INTERFACE.SIZE * 4}
      maxLines={2}
      fontSize={LAYOUT.NAME_FONT_SIZE}
      lineHeight={LAYOUT.NAME_LINE_HEIGHT}
      fontWeight="bold"
      fill={fill}
    />
  )
}
