import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import { resolveRequiredInterfaceEdgeType } from "@/utils/requiredInterfaceUtils"

const requiredTypes = [
  "ComponentRequiredInterface",
  "ComponentRequiredQuarterInterface",
  "ComponentRequiredThreeQuarterInterface",
] as const

const edge = (
  id: string,
  targetHandle: string,
  type = "ComponentRequiredInterface"
) => ({
  id,
  target: "interface",
  targetHandle,
  type,
})

const resolve = (
  id: string,
  edges: ReturnType<typeof edge>[],
  targetPositionByEdgeId?: ReadonlyMap<string, Position>
) =>
  resolveRequiredInterfaceEdgeType({
    type: edges.find((candidate) => candidate.id === id)!.type,
    id,
    target: "interface",
    targetHandleId: edges.find((candidate) => candidate.id === id)!
      .targetHandle,
    edges,
    requiredTypes,
    defaultType: "ComponentRequiredInterface",
    reducedType: "ComponentRequiredQuarterInterface",
    targetPositionByEdgeId,
  })

describe("resolveRequiredInterfaceEdgeType", () => {
  it("uses the embracing socket for one required edge", () => {
    const edges = [edge("one", "left", "ComponentRequiredQuarterInterface")]
    expect(resolve("one", edges)).toBe("ComponentRequiredInterface")
  })

  it("keeps adjacent sockets reduced so their arcs stay distinct", () => {
    const edges = [edge("left", "left"), edge("top", "top")]
    expect(resolve("left", edges)).toBe("ComponentRequiredQuarterInterface")
    expect(resolve("top", edges)).toBe("ComponentRequiredQuarterInterface")
  })

  it("uses embracing sockets on opposite sides", () => {
    const edges = [edge("left", "left"), edge("right", "right")]
    expect(resolve("left", edges)).toBe("ComponentRequiredInterface")
    expect(resolve("right", edges)).toBe("ComponentRequiredInterface")
  })

  it("uses actual holistic route sides instead of stale stored handles", () => {
    const edges = [edge("first", "left"), edge("second", "top")]
    const routedSides = new Map([
      ["first", Position.Top],
      ["second", Position.Bottom],
    ])

    expect(resolve("first", edges, routedSides)).toBe(
      "ComponentRequiredInterface"
    )
    expect(resolve("second", edges, routedSides)).toBe(
      "ComponentRequiredInterface"
    )
  })

  it("reduces sockets when more than two share an interface", () => {
    const edges = [
      edge("left", "left"),
      edge("top", "top"),
      edge("right", "right"),
    ]
    expect(resolve("left", edges)).toBe("ComponentRequiredQuarterInterface")
  })
})
