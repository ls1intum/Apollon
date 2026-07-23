import { describe, expect, it } from "vitest"
import {
  getInterfaceSocketGeometry,
  getMarkerHalfHeight,
} from "@/components/svgs/edges"
import { EDGES, INTERFACE, MARKER_CONFIGS } from "@/constants"
import { adjustTargetCoordinates, getEdgeMarkerStyles } from "@/utils/edgeUtils"
import { Position } from "@xyflow/system"

// The aggregation/composition diamond and the inheritance triangle sit side by
// side in a class diagram, so what a reader perceives is their proportions, not
// their absolute sizes. These pin the relationships that set the diamond's size.

// Both shapes are inscribed in their bounding box, so width * height / 2 is
// their exact area — a proxy for visual weight.
const inkArea = (id: keyof typeof MARKER_CONFIGS) => {
  const { size, widthFactor, heightFactor } = MARKER_CONFIGS[id]
  return (size * widthFactor * (size * heightFactor)) / 2
}

const height = (id: keyof typeof MARKER_CONFIGS) => getMarkerHalfHeight(id) * 2

describe("class diagram marker geometry", () => {
  it("draws both diamonds identically apart from the fill", () => {
    const { filled: _b, ...black } = MARKER_CONFIGS["black-rhombus"]
    const { filled: _w, ...white } = MARKER_CONFIGS["white-rhombus"]
    expect(black).toEqual(white)
    expect(MARKER_CONFIGS["black-rhombus"].filled).toBe(true)
    expect(MARKER_CONFIGS["white-rhombus"].filled).toBe(false)
  })

  it("gives the diamond at least the inheritance triangle's visual weight", () => {
    // draw.io puts the diamond at ~1.32x the triangle's area, Mermaid at 1.0x.
    expect(inkArea("black-rhombus")).toBeGreaterThanOrEqual(
      inkArea("white-triangle")
    )
  })

  it("keeps the diamond no taller than the inheritance triangle", () => {
    // Height is the extent perpendicular to the edge: how far a marker overhangs
    // the node border it points at.
    expect(height("black-rhombus")).toBeLessThanOrEqual(
      height("white-triangle")
    )
  })

  it("keeps the diamond's thickness in the band used by reference tools", () => {
    // draw.io 0.588 (diamondThin), PlantUML 0.667, Mermaid 0.706.
    const { widthFactor, heightFactor } = MARKER_CONFIGS["black-rhombus"]
    const aspect = heightFactor / widthFactor
    expect(aspect).toBeGreaterThanOrEqual(0.588)
    expect(aspect).toBeLessThanOrEqual(0.706)
  })

  it("keeps the diamond small enough to render unscaled in the edge-type dropdown", () => {
    // EdgeTypePreviewIcon shrinks markers whose half-height exceeds 11; only the
    // node-scale interface socket should need that.
    expect(getMarkerHalfHeight("black-rhombus")).toBeLessThanOrEqual(11)
  })
})

describe("required interface marker geometry", () => {
  it("leaves a stroke-safe seam between opposing standard sockets", () => {
    const span = MARKER_CONFIGS["required-interface"].arcSpanDegrees
    expect(span).toBe(172)
    expect(180 - span).toBeGreaterThanOrEqual(5)
  })

  it("leaves a five-degree seam between adjacent reduced sockets", () => {
    const span = MARKER_CONFIGS["required-interface-quarter"].arcSpanDegrees
    expect(span).toBe(85)
    expect(90 - span).toBe(5)
  })

  it.each([
    { radius: 10, direction: 0 },
    { radius: 15, direction: Math.PI / 2 },
    { radius: 18, direction: Math.PI },
    { radius: 12, direction: -Math.PI / 2 },
  ])(
    "stays concentric with a $radius px interface at direction $direction",
    ({ radius, direction }) => {
      const interfaceCenter = { x: 137.25, y: -42.75 }
      const geometry = getInterfaceSocketGeometry({
        endPoint: { x: -999, y: 999 },
        direction,
        interfaceGeometry: {
          center: interfaceCenter,
          radius,
        },
        arcSpanDegrees: 180,
      })
      const distanceFromCenter = (point: { x: number; y: number }) =>
        Math.hypot(point.x - interfaceCenter.x, point.y - interfaceCenter.y)

      expect(geometry.center).toEqual(interfaceCenter)
      expect(geometry.radius).toBe(radius + INTERFACE.SOCKET_GAP)
      expect(distanceFromCenter(geometry.top)).toBeCloseTo(geometry.radius, 10)
      expect(distanceFromCenter(geometry.bottom)).toBeCloseTo(
        geometry.radius,
        10
      )
    }
  )

  it("scales its bounds with imported interface sizes", () => {
    expect(getMarkerHalfHeight("required-interface", 10)).toBeCloseTo(13, 1)
    expect(getMarkerHalfHeight("required-interface", 15)).toBeCloseTo(18, 1)
  })

  it.each([
    { position: Position.Left, direction: 0 },
    { position: Position.Top, direction: Math.PI / 2 },
    { position: Position.Right, direction: Math.PI },
    { position: Position.Bottom, direction: -Math.PI / 2 },
  ])(
    "joins the line to the socket when entering from $position",
    ({ position, direction }) => {
      const center = { x: 100, y: 100 }
      const towardTarget = {
        x: Math.cos(direction),
        y: Math.sin(direction),
      }
      // React Flow's handle center is three pixels outside the circle. The
      // shared MARKER_PADDING compensates for this before marker-specific
      // spacing is applied.
      const rawHandle = {
        x:
          center.x - towardTarget.x * (INTERFACE.RADIUS - EDGES.MARKER_PADDING),
        y:
          center.y - towardTarget.y * (INTERFACE.RADIUS - EDGES.MARKER_PADDING),
      }
      const markerPadding = getEdgeMarkerStyles(
        "ComponentRequiredInterface"
      ).markerPadding!
      const adjustedTarget = adjustTargetCoordinates(
        rawHandle.x,
        rawHandle.y,
        position,
        markerPadding
      )
      const edgeEnd = {
        x: adjustedTarget.targetX,
        y: adjustedTarget.targetY,
      }
      const socketPoint = {
        x:
          center.x - towardTarget.x * (INTERFACE.RADIUS + INTERFACE.SOCKET_GAP),
        y:
          center.y - towardTarget.y * (INTERFACE.RADIUS + INTERFACE.SOCKET_GAP),
      }

      expect(
        Math.hypot(edgeEnd.x - socketPoint.x, edgeEnd.y - socketPoint.y)
      ).toBeCloseTo(0, 10)
    }
  )
})
