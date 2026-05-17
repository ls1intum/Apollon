import { describe, it, expect, vi } from "vitest"
import { resolveEndpointDragState } from "@/edges/interactions/resolveEndpointDragState"

const baseNodes = [
  {
    id: "src",
    position: { x: 0, y: 0 },
    measured: { width: 100, height: 60 },
  },
  {
    id: "tgt",
    position: { x: 400, y: 0 },
    measured: { width: 100, height: 60 },
  },
  {
    id: "blocker",
    position: { x: 200, y: 0 },
    measured: { width: 80, height: 60 },
  },
]

describe("resolveEndpointDragState", () => {
  it("returns null handle and uses the raw pointer when no handle is found", () => {
    const result = resolveEndpointDragState({
      draggedEnd: "source",
      flowPoint: { x: 250, y: 100 },
      clientX: 250,
      clientY: 100,
      nodes: baseNodes,
      sourceNodeId: "src",
      targetNodeId: "tgt",
      findBestHandleAtClientPosition: () => ({ handle: null, node: null }),
    })

    expect(result.foundHandle).toBeNull()
    expect(result.snappedPoint).toEqual({ x: 250, y: 100 })
  })

  it("snaps to a handle anchor when one is found", () => {
    const result = resolveEndpointDragState({
      draggedEnd: "target",
      flowPoint: { x: 410, y: 30 },
      clientX: 410,
      clientY: 30,
      nodes: baseNodes,
      sourceNodeId: "src",
      targetNodeId: "tgt",
      findBestHandleAtClientPosition: () => ({
        handle: "left",
        node: { id: "tgt" } as any,
      }),
    })

    expect(result.foundHandle).toEqual({ nodeId: "tgt", handleId: "left" })
    // The snapped point is the anchor returned by getHandleAnchor; the exact
    // pixel offset depends on canonical handle ratios. We only assert that
    // it sits on the y-mid of the target (snapped to the 10px grid) and
    // somewhere along its width.
    expect(result.snappedPoint.y).toBe(30)
    expect(result.snappedPoint.x).toBeGreaterThanOrEqual(400)
    expect(result.snappedPoint.x).toBeLessThanOrEqual(500)
  })

  it("excludes the PROSPECTIVE source node from obstacles when source is being dragged", () => {
    const result = resolveEndpointDragState({
      draggedEnd: "source",
      flowPoint: { x: 200, y: 30 },
      clientX: 200,
      clientY: 30,
      nodes: baseNodes,
      // Pretend the edge was previously anchored to src; now the user is
      // dropping the source endpoint on `blocker`. `blocker` should NOT
      // appear in the obstacle list because it's the prospective new source.
      sourceNodeId: "src",
      targetNodeId: "tgt",
      findBestHandleAtClientPosition: () => ({
        handle: "right",
        node: { id: "blocker" } as any,
      }),
    })

    expect(result.foundHandle).toEqual({
      nodeId: "blocker",
      handleId: "right",
    })
    // The previous source ("src") is no longer the anchor and reverts to a
    // regular obstacle. The prospective new source ("blocker") and the
    // unchanged target ("tgt") are excluded. So only src (x=0) remains.
    const obstacleIds = result.obstacles
      .map((b) => b.x)
      .filter((x) => x !== undefined)
      .sort((a, b) => a - b)
    expect(obstacleIds).toEqual([0])
  })

  it("calls the handle finder exactly once with the supplied client coords", () => {
    const finder = vi.fn().mockReturnValue({ handle: null, node: null })

    resolveEndpointDragState({
      draggedEnd: "source",
      flowPoint: { x: 12, y: 34 },
      clientX: 56,
      clientY: 78,
      nodes: baseNodes,
      sourceNodeId: "src",
      targetNodeId: "tgt",
      findBestHandleAtClientPosition: finder,
    })

    expect(finder).toHaveBeenCalledTimes(1)
    expect(finder).toHaveBeenCalledWith(56, 78)
  })
})
