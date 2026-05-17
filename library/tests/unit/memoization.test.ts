import { describe, it, expect } from "vitest"
import { orthogonalEdgePropsAreEqual } from "@/store/memoization"
import type { EdgeProps } from "@xyflow/react"

function makeEdgeProps(overrides: Partial<EdgeProps> = {}): EdgeProps {
  return {
    id: "edge1",
    source: "node1",
    target: "node2",
    sourceX: 100,
    sourceY: 200,
    targetX: 300,
    targetY: 400,
    sourcePosition: "right" as any,
    targetPosition: "left" as any,
    sourceHandleId: "handle1",
    targetHandleId: "handle2",
    selected: false,
    data: {
      points: [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
        { x: 200, y: 400 },
        { x: 300, y: 400 },
      ],
      userWaypoints: [],
      routingMode: "auto",
    },
    ...overrides,
  } as EdgeProps
}

describe("orthogonalEdgePropsAreEqual", () => {
  it("returns true for identical props", () => {
    const props = makeEdgeProps()
    expect(orthogonalEdgePropsAreEqual(props, props)).toBe(true)
  })

  it("returns true for structurally equal props", () => {
    const a = makeEdgeProps()
    const b = makeEdgeProps()
    expect(orthogonalEdgePropsAreEqual(a, b)).toBe(true)
  })

  it("returns false when source changes", () => {
    const a = makeEdgeProps()
    const b = makeEdgeProps({ source: "node99" })
    expect(orthogonalEdgePropsAreEqual(a, b)).toBe(false)
  })

  it("returns false when sourceX changes (node moved)", () => {
    const a = makeEdgeProps()
    const b = makeEdgeProps({ sourceX: 999 })
    expect(orthogonalEdgePropsAreEqual(a, b)).toBe(false)
  })

  it("returns false when selection state toggles", () => {
    const a = makeEdgeProps({ selected: false })
    const b = makeEdgeProps({ selected: true })
    expect(orthogonalEdgePropsAreEqual(a, b)).toBe(false)
  })

  it("returns false when fallback points change", () => {
    const a = makeEdgeProps()
    const b = makeEdgeProps({
      data: {
        points: [
          { x: 100, y: 200 },
          { x: 250, y: 200 },
          { x: 250, y: 400 },
          { x: 300, y: 400 },
        ],
      },
    })
    expect(orthogonalEdgePropsAreEqual(a, b)).toBe(false)
  })

  it("returns true when data object reference differs but content is same", () => {
    const a = makeEdgeProps({
      data: {
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 20 },
        ],
        userWaypoints: [],
        routingMode: "auto",
      },
    })
    const b = makeEdgeProps({
      data: {
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 20 },
        ],
        userWaypoints: [],
        routingMode: "auto",
      },
    })
    expect(orthogonalEdgePropsAreEqual(a, b)).toBe(true)
  })
})
