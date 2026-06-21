import { FC } from "react"
import { LAYOUT } from "@/constants"
import { MultilineText } from "./MultilineText"
import type { InterfaceLabelSide } from "@/utils/geometry/interfaceLabelLayout"

interface Props {
  name?: string | null
  /** Interface circle bounds (always square — INTERFACE.SIZE). */
  width: number
  height: number
  fill?: string
  /** Which side of the circle the name sits on. Defaults to "bottom"; the node
   * component flips it away from sides a connecting edge attaches to (including
   * a diagonal corner when every side is taken). */
  side?: InterfaceLabelSide
}

// Effectively unbounded width: the name is NOT auto-wrapped by width (that
// produces ugly mid-word breaks). It stays on one line, or on the lines the
// user typed (literal "\n" are honoured by MultilineText's pre-wrap default).
const NO_WRAP_WIDTH = 100_000

type Placement = {
  x: number
  y: number
  textAnchor: "start" | "middle" | "end"
  verticalAnchor: "top" | "middle" | "bottom"
}

/**
 * The provided/required interface name. Sits centered below the ball/socket by
 * default; the node component moves it to whichever side — or, when all four
 * sides have an edge, whichever diagonal corner — is clear of connecting edges.
 * The name is rendered as real multi-line text (honouring line breaks) and is
 * never auto-wrapped.
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

  // Read tokens at runtime, not at module top-level: this file is part of the
  // @/components → nodes → @/constants import cycle, so a top-level read can hit
  // the constant before it is initialised (TDZ). See edgeUtils.ts.
  const gap = LAYOUT.DEFAULT_PADDING / 2
  const halfLine = LAYOUT.NAME_LINE_HEIGHT / 2
  const cx = width / 2
  const cy = height / 2
  const r = width / 2 // interface circles are square (INTERFACE.SIZE)
  // Adjacent edge of the circle's bounding box, plus the gap, on each axis.
  const outX = r + gap
  const outY = r + gap

  // verticalAnchor treats `y` as the first ("top") / last ("bottom") / middle
  // line's CENTER, so the half-line offsets keep the nearest line clear of the
  // circle by `gap`. Diagonal corners anchor at the bounding-box corner and grow
  // outward into the empty quadrant, clearing both adjacent cardinal edges.
  const placements: Record<InterfaceLabelSide, Placement> = {
    bottom: {
      x: cx,
      y: cy + outY + halfLine,
      textAnchor: "middle",
      verticalAnchor: "top",
    },
    top: {
      x: cx,
      y: cy - outY - halfLine,
      textAnchor: "middle",
      verticalAnchor: "bottom",
    },
    left: { x: cx - outX, y: cy, textAnchor: "end", verticalAnchor: "middle" },
    right: {
      x: cx + outX,
      y: cy,
      textAnchor: "start",
      verticalAnchor: "middle",
    },
    "bottom-right": {
      x: cx + outX,
      y: cy + outY + halfLine,
      textAnchor: "start",
      verticalAnchor: "top",
    },
    "bottom-left": {
      x: cx - outX,
      y: cy + outY + halfLine,
      textAnchor: "end",
      verticalAnchor: "top",
    },
    "top-right": {
      x: cx + outX,
      y: cy - outY - halfLine,
      textAnchor: "start",
      verticalAnchor: "bottom",
    },
    "top-left": {
      x: cx - outX,
      y: cy - outY - halfLine,
      textAnchor: "end",
      verticalAnchor: "bottom",
    },
  }
  const placement = placements[side]

  return (
    <MultilineText
      text={name}
      x={placement.x}
      y={placement.y}
      verticalAnchor={placement.verticalAnchor}
      textAnchor={placement.textAnchor}
      maxWidth={NO_WRAP_WIDTH}
      fontSize={LAYOUT.NAME_FONT_SIZE}
      lineHeight={LAYOUT.NAME_LINE_HEIGHT}
      fontWeight="bold"
      fill={fill}
    />
  )
}
