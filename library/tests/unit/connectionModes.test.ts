import { describe, it, expect } from "vitest"
import { Position, type Rect, type XYPosition } from "@xyflow/react"
import {
  getConnectionMode,
  getEdgeAnchorFromPoint,
  getEdgeAnchorPoint,
} from "@/utils/connectionModes"

// center (180, 150), rx 80, ry 50
const rect: Rect = { x: 100, y: 100, width: 160, height: 100 }
const cx = rect.x + rect.width / 2
const cy = rect.y + rect.height / 2

const onEllipse = (p: XYPosition) =>
  ((p.x - cx) / (rect.width / 2)) ** 2 + ((p.y - cy) / (rect.height / 2)) ** 2

describe("getConnectionMode", () => {
  it("defaults box shapes (and unknowns) to freeform-rect", () => {
    expect(getConnectionMode("class")).toBe("freeform-rect")
    expect(getConnectionMode("bpmnTask")).toBe("freeform-rect")
    expect(getConnectionMode(undefined)).toBe("freeform-rect")
    expect(getConnectionMode("")).toBe("freeform-rect")
  })

  it("classifies each non-rect shape by its real geometry", () => {
    expect(getConnectionMode("useCase")).toBe("ellipse") // the one full-handle oval
    expect(getConnectionMode("bpmnStartEvent")).toBe("four-center") // circle, 4 handles
    expect(getConnectionMode("petriNetPlace")).toBe("four-center") // circle, 4 handles
    expect(getConnectionMode("flowchartDecision")).toBe("four-center")
    expect(getConnectionMode("bpmnGateway")).toBe("four-center")
    expect(getConnectionMode("componentInterface")).toBe("four-center")
    expect(getConnectionMode("deploymentInterface")).toBe("four-center")
    expect(getConnectionMode("activitySwimlane")).toBe("none")
    expect(getConnectionMode("bpmnAnnotation")).toBe("none")
  })

  it("gives every FOUR_WAY-handle node exactly four points (mode matches handles)", () => {
    for (const t of [
      "activityInitialNode",
      "activityFinalNode",
      "bpmnStartEvent",
      "petriNetPlace",
      "petriNetTransition",
      "componentInterface",
      "sfcTransitionBranch",
    ]) {
      expect(getConnectionMode(t)).toBe("four-center")
    }
  })
})

describe("ellipse mode", () => {
  it("projects a bbox-corner drop onto the oval curve, in the aimed quadrant", () => {
    const anchor = getEdgeAnchorFromPoint(
      "useCase",
      { x: rect.x + rect.width, y: rect.y }, // top-right bbox corner
      rect
    )!
    const { point } = getEdgeAnchorPoint("useCase", rect, anchor)
    expect(onEllipse(point)).toBeCloseTo(1, 1) // on the curve, not the corner
    expect(point.x).toBeGreaterThan(cx) // top-right quadrant, near the aim
    expect(point.y).toBeLessThan(cy)
  })

  it("keeps a side-midpoint drop at the midpoint (curve meets the box there)", () => {
    const anchor = getEdgeAnchorFromPoint(
      "useCase",
      { x: cx, y: rect.y },
      rect
    )!
    const { point } = getEdgeAnchorPoint("useCase", rect, anchor)
    expect(point.x).toBeCloseTo(cx, 0)
    expect(point.y).toBeCloseTo(rect.y, 0)
  })
})

describe("parallelogram mode", () => {
  // 20px slant: left edge runs x+20 (top) → x (bottom); right edge x+w (top) →
  // x+w-20 (bottom). rect here is 160 wide, 100 tall, top-left (100,100).
  it("shears a left-side anchor onto the slanted edge (top vs bottom differ)", () => {
    const io = "flowchartInputOutput"
    const top = getEdgeAnchorPoint(io, rect, { side: Position.Left, ratio: 0 })
    const bottom = getEdgeAnchorPoint(io, rect, {
      side: Position.Left,
      ratio: 1,
    })
    expect(top.point.x).toBeCloseTo(rect.x + 20, 5) // inset at the top
    expect(bottom.point.x).toBeCloseTo(rect.x, 5) // flush at the bottom
  })

  it("shears the right side the opposite way", () => {
    const io = "flowchartInputOutput"
    const top = getEdgeAnchorPoint(io, rect, { side: Position.Right, ratio: 0 })
    const bottom = getEdgeAnchorPoint(io, rect, {
      side: Position.Right,
      ratio: 1,
    })
    expect(top.point.x).toBeCloseTo(rect.x + rect.width, 5) // flush at the top
    expect(bottom.point.x).toBeCloseTo(rect.x + rect.width - 20, 5) // inset below
  })

  it("stays continuous (a mid-height drop is not snapped to a fixed point)", () => {
    const io = "flowchartInputOutput"
    const a = getEdgeAnchorFromPoint(io, { x: rect.x, y: rect.y + 20 }, rect)!
    const b = getEdgeAnchorFromPoint(io, { x: rect.x, y: rect.y + 70 }, rect)!
    expect(getEdgeAnchorPoint(io, rect, a).point.y).not.toBeCloseTo(
      getEdgeAnchorPoint(io, rect, b).point.y,
      1
    )
  })
})

describe("four-center mode", () => {
  it("snaps to the nearest side midpoint", () => {
    const anchor = getEdgeAnchorFromPoint(
      "flowchartDecision",
      { x: rect.x + rect.width, y: cy - 10 }, // near the right vertex
      rect
    )!
    const resolved = getEdgeAnchorPoint("flowchartDecision", rect, anchor)
    expect(resolved.position).toBe(Position.Right)
    expect(resolved.point).toEqual({ x: rect.x + rect.width, y: cy })
  })
})

describe("four-center interface", () => {
  it("snaps an interface drop to a side midpoint (N/E/S/W), like its handles", () => {
    const anchor = getEdgeAnchorFromPoint(
      "componentInterface",
      { x: rect.x + 4, y: cy + 4 }, // near the left edge
      rect
    )!
    const resolved = getEdgeAnchorPoint("componentInterface", rect, anchor)
    expect(resolved.position).toBe(Position.Left)
    expect(resolved.point).toEqual({ x: rect.x, y: cy })
  })
})

describe("none mode", () => {
  it("is not a connection target", () => {
    const at = { x: rect.x, y: rect.y }
    expect(getEdgeAnchorFromPoint("activitySwimlane", at, rect)).toBeNull()
    expect(getEdgeAnchorFromPoint("colorDescription", at, rect)).toBeNull()
    expect(getEdgeAnchorFromPoint("titleAndDesctiption", at, rect)).toBeNull()
    expect(getEdgeAnchorFromPoint("bpmnAnnotation", at, rect)).toBeNull()
  })
})
