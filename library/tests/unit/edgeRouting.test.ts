import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import { computeAutoEdgeRoute } from "@/utils/edgeRouting"
import {
  resolveEdgeMode,
  toAutoEdgeData,
  toManualEdgeData,
} from "@/edges/edgeMode"
import { EDGES, MARKER_BASE_SIZE } from "@/constants"

describe("resolveEdgeMode", () => {
  it("defaults to AUTO for edges without explicit mode", () => {
    expect(resolveEdgeMode(undefined)).toBe("AUTO")
    expect(resolveEdgeMode({ points: [] })).toBe("AUTO")
  })

  it("infers MANUAL for legacy edges with routed points", () => {
    expect(
      resolveEdgeMode({
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 100 },
          { x: 100, y: 100 },
        ],
      })
    ).toBe("MANUAL")
  })
})

describe("edgeMode data helpers", () => {
  it("sets AUTO mode and drops routed points while preserving custom data", () => {
    const data = toAutoEdgeData({
      edgeMode: "MANUAL",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      customFlag: true,
    })

    expect(data).toEqual({
      edgeMode: "AUTO",
      points: undefined,
      customFlag: true,
    })
  })

  it("sets MANUAL mode and stores points while preserving custom data", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
    ]

    const data = toManualEdgeData(points, {
      edgeMode: "AUTO",
      customFlag: true,
    })

    expect(data).toEqual({
      edgeMode: "MANUAL",
      points,
      customFlag: true,
    })
  })
})

describe("computeAutoEdgeRoute", () => {
  it("prefers a straight right-to-left route when nodes overlap on y-axis", () => {
    const route = computeAutoEdgeRoute({
      sourceRect: { x: 0, y: 0, width: 100, height: 100 },
      targetRect: { x: 300, y: 20, width: 100, height: 100 },
      markerPadding: EDGES.MARKER_PADDING,
      preferStraight: true,
    })

    expect(route.pathType).toBe("straight")
    expect(route.sourcePosition).toBe(Position.Right)
    expect(route.targetPosition).toBe(Position.Left)
    expect(route.points).toHaveLength(2)
    expect(route.points[0]).toEqual({ x: 97, y: 60 })
    expect(route.points[1]).toEqual({ x: 303, y: 60 })
  })

  it("can keep AUTO straight endpoints on the boundary with explicit endpoint padding", () => {
    const route = computeAutoEdgeRoute({
      sourceRect: { x: 0, y: 0, width: 100, height: 100 },
      targetRect: { x: 300, y: 20, width: 100, height: 100 },
      markerPadding: EDGES.MARKER_PADDING,
      sourcePadding: 0,
      targetEndpointPadding: 0,
      preferStraight: true,
    })

    expect(route.pathType).toBe("straight")
    expect(route.points[0]).toEqual({ x: 100, y: 60 })
    expect(route.points[1]).toEqual({ x: 300, y: 60 })
  })

  it("falls back to orthogonal step routing when straight path is not possible", () => {
    const route = computeAutoEdgeRoute({
      sourceRect: { x: 0, y: 0, width: 100, height: 100 },
      targetRect: { x: 130, y: 130, width: 100, height: 100 },
      markerPadding: EDGES.MARKER_PADDING,
      preferStraight: true,
    })

    expect(route.pathType).toBe("step")
    expect(route.sourcePosition).toBe(Position.Right)
    expect(route.targetPosition).toBe(Position.Left)
    expect(route.points.length).toBeGreaterThanOrEqual(2)
    expect(route.points[0]).toEqual({ x: 97, y: 100 })
    expect(route.points[route.points.length - 1]).toEqual({ x: 133, y: 130 })
  })

  it("returns no AUTO optimization when straight routing is impossible and fallback is disabled", () => {
    const route = computeAutoEdgeRoute({
      sourceRect: { x: 0, y: 0, width: 100, height: 100 },
      targetRect: { x: 130, y: 130, width: 100, height: 100 },
      markerPadding: EDGES.MARKER_PADDING,
      preferStraight: true,
      allowOrthogonalFallback: false,
    })

    expect(route).toBeNull()
  })

  it("keeps AUTO endpoints away from node corners when side insets are configured", () => {
    const route = computeAutoEdgeRoute({
      sourceRect: { x: 0, y: 0, width: 100, height: 100 },
      targetRect: { x: 130, y: 130, width: 100, height: 100 },
      markerPadding: EDGES.MARKER_PADDING,
      sourceSideInset: MARKER_BASE_SIZE,
      targetSideInset: MARKER_BASE_SIZE,
      preferStraight: true,
    })

    expect(route.pathType).toBe("step")
    expect(route.sourcePosition).toBe(Position.Right)
    expect(route.targetPosition).toBe(Position.Left)
    expect(route.points[0]).toEqual({ x: 97, y: 82 })
    expect(route.points[route.points.length - 1]).toEqual({ x: 133, y: 148 })
  })
})
