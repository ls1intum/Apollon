import type { Rect } from "@xyflow/react"
import { describe, expect, it, vi } from "vitest"
import { selectEdgeAnchors } from "@/utils/geometry/edgeAnchoring"
import { getEdgeAnchorPoint } from "@/utils/connectionModes"
import type { FreeformEdgeAnchor } from "@/utils/edgeUtils"

describe("edge anchor candidate resolution", () => {
  it("resolves each endpoint candidate once instead of the Cartesian product", () => {
    const sourceRect: Rect = { x: 0, y: 0, width: 160, height: 100 }
    const targetRect: Rect = { x: 420, y: 190, width: 160, height: 100 }
    const resolve = vi.fn(
      ({
        sourceAnchor,
        targetAnchor,
      }: {
        sourceAnchor?: FreeformEdgeAnchor
        targetAnchor?: FreeformEdgeAnchor
      }) => {
        if (!sourceAnchor || !targetAnchor) return null
        const source = getEdgeAnchorPoint("class", sourceRect, sourceAnchor)
        const target = getEdgeAnchorPoint("class", targetRect, targetAnchor)
        return {
          adjustedSource: source.point,
          adjustedTarget: target.point,
          sourcePosition: source.position,
          targetPosition: target.position,
          rounded: {
            sourceX: Math.round(source.point.x),
            sourceY: Math.round(source.point.y),
            targetX: Math.round(target.point.x),
            targetY: Math.round(target.point.y),
          },
          sourceAbsolutePosition: { x: sourceRect.x, y: sourceRect.y },
          targetAbsolutePosition: { x: targetRect.x, y: targetRect.y },
          sourceSize: {
            width: sourceRect.width,
            height: sourceRect.height,
          },
          targetSize: {
            width: targetRect.width,
            height: targetRect.height,
          },
          padding: 0,
        }
      }
    )

    const selected = selectEdgeAnchors({
      sourceRect,
      targetRect,
      sourceType: "class",
      targetType: "class",
      resolve,
      obstacles: [],
      neighborEdges: [],
      enableStraightPath: true,
    })

    expect(selected).not.toBeNull()
    // Freeform nodes offer up to eight candidates per end. Linear resolution is
    // at most their sum; the former Cartesian matrix needed up to 64 calls.
    expect(resolve.mock.calls.length).toBeLessThanOrEqual(20)
  })
})
