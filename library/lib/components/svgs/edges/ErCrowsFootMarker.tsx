import { ErCfCardinality } from "@/types/nodes/enums/EntityRelationshipType"
import { STROKE_COLOR } from "@/constants"

// Geometry of a crow's-foot end marker, in canvas units. A marker is composed of
// a "max" symbol at the entity (a bar for one, a three-pronged foot for many) and
// a "min" symbol set back along the line (a bar for mandatory, a circle for
// optional). All drawn as plain <line>/<circle> so they survive SVG/PNG/PDF export.
const BAR_HALF = 6 // half-length of a perpendicular "one" bar
const FOOT_HALF = 7 // half-spread of the crow's-foot prongs at the entity
const FOOT_LEN = 13 // how far the foot apex sits back from the entity
const CIRCLE_R = 4 // radius of the "optional" circle
// Distance the min symbol sits back from the entity. With a "one" max symbol it
// sits close so the two bars read as a tight pair (||); with a crow's foot it
// clears the apex so the ring/bar doesn't collide with the prongs.
const MIN_OFFSET_NEAR = 9
const MIN_OFFSET_PAST_FOOT = FOOT_LEN + 6
const STROKE_W = 1.5

// Decompose a cardinality into its (min, max) symbols.
const isOptional = (c: ErCfCardinality) =>
  c === "ZeroOrOne" || c === "ZeroOrMany"
const isMany = (c: ErCfCardinality) => c === "ZeroOrMany" || c === "OneOrMany"

interface Props {
  // Connection point on the entity edge.
  point: { x: number; y: number }
  // Angle (radians) pointing INTO the entity (toward `point`).
  direction: number
  cardinality: ErCfCardinality
  strokeColor?: string
}

export const ErCrowsFootMarker = ({
  point,
  direction,
  cardinality,
  strokeColor = STROKE_COLOR,
}: Props) => {
  const cos = Math.cos(direction)
  const sin = Math.sin(direction)
  // Point `t` units back from the entity along the line.
  const back = (t: number) => ({ x: point.x - t * cos, y: point.y - t * sin })
  // Perpendicular offset of `d` units from a base point.
  const perp = (base: { x: number; y: number }, d: number) => ({
    x: base.x - d * sin,
    y: base.y + d * cos,
  })

  const many = isMany(cardinality)
  const optional = isOptional(cardinality)
  const line = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    key: string
  ) => (
    <line
      key={key}
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={strokeColor}
      strokeWidth={STROKE_W}
    />
  )

  const els: React.ReactNode[] = []

  // Max symbol at the entity.
  if (many) {
    const apex = back(FOOT_LEN)
    els.push(
      line(apex, point, "foot-mid"),
      line(apex, perp(point, FOOT_HALF), "foot-a"),
      line(apex, perp(point, -FOOT_HALF), "foot-b")
    )
  } else {
    const bar = point
    els.push(line(perp(bar, BAR_HALF), perp(bar, -BAR_HALF), "max-bar"))
  }

  // Min symbol set back along the line — clear of the foot when there is one.
  const minBase = back(many ? MIN_OFFSET_PAST_FOOT : MIN_OFFSET_NEAR)
  if (optional) {
    els.push(
      <circle
        key="min-circle"
        cx={minBase.x}
        cy={minBase.y}
        r={CIRCLE_R}
        fill="var(--apollon-background, #ffffff)"
        stroke={strokeColor}
        strokeWidth={STROKE_W}
      />
    )
  } else {
    els.push(line(perp(minBase, BAR_HALF), perp(minBase, -BAR_HALF), "min-bar"))
  }

  return <g pointerEvents="none">{els}</g>
}
