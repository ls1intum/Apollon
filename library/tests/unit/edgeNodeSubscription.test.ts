import { describe, expect, it, vi } from "vitest"
import type { Node } from "@xyflow/react"
import {
  createNearbySettledNodeGeometrySelector,
  resolveEdgeGeometryNodes,
  selectEdgeNodeSubscription,
} from "@/utils/geometry/edgeNodeSubscription"

const node = (id: string): Node =>
  ({
    id,
    position: { x: 0, y: 0 },
    data: {},
  }) as Node

describe("step-edge node subscriptions", () => {
  it("keeps unpinned edges on one stable non-subscribing value", () => {
    const first = selectEdgeNodeSubscription([node("a")], false)
    const second = selectEdgeNodeSubscription([node("b")], false)

    expect(first).toBe(second)
    expect(first).toEqual([])
  })

  it("memoizes settled label obstacles across preview-only writes", () => {
    const bounds = { minX: 0, minY: 0, maxX: 400, maxY: 100 }
    const select = createNearbySettledNodeGeometrySelector(bounds, 220)
    const settled = new Map([
      ["near", { x: 200, y: 120, width: 100, height: 80, type: "class" }],
      ["far", { x: 2000, y: 2000, width: 100, height: 80, type: "class" }],
      ["container", { x: 100, y: 20, width: 100, height: 80, type: "package" }],
    ])

    const first = select(settled)
    expect(first).toEqual([200, 120, 100, 80])
    expect(select(settled)).toBe(first)

    const moved = new Map(settled)
    moved.set("near", {
      x: 250,
      y: 120,
      width: 100,
      height: 80,
      type: "class",
    })
    expect(select(moved)).toEqual([250, 120, 100, 80])
  })

  it("subscribes freeform endpoints to the live node array", () => {
    const nodes = [node("source"), node("target")]

    expect(selectEdgeNodeSubscription(nodes, true)).toBe(nodes)
  })

  it("retains unrelated nodes for label avoidance without subscribing to them", () => {
    const current = [node("source"), node("target"), node("label-obstacle")]
    const getNodes = vi.fn(() => current)
    const subscribed = selectEdgeNodeSubscription([node("old")], false)

    const resolved = resolveEdgeGeometryNodes(subscribed, getNodes, false)

    expect(getNodes).toHaveBeenCalledOnce()
    expect(resolved).toBe(current)
    expect(resolved.map(({ id }) => id)).toContain("label-obstacle")
  })

  it("reuses the subscribed snapshot for freeform endpoints", () => {
    const subscribed = [node("source"), node("parent")]
    const getNodes = vi.fn(() => [node("should-not-be-read")])

    expect(resolveEdgeGeometryNodes(subscribed, getNodes, true)).toBe(
      subscribed
    )
    expect(getNodes).not.toHaveBeenCalled()
  })
})
