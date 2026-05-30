import { describe, it, expect } from "vitest"
import { calculateDraggedWaypoints } from "@/utils/geometry/waypointDrag"

describe("calculateDraggedWaypoints", () => {
  it("drags an intermediate horizontal segment correctly", () => {
    // path: (0,0) -> (0,100) -> (100,100) -> (100,200)
    // segments: V, H, V
    const path = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 200 },
    ]

    // drag segment 1 (the H segment from 0,100 to 100,100) down by 50px
    const result = calculateDraggedWaypoints(path, 1, { x: 0, y: 50 })

    // Expected waypoints (excluding fixed source/target):
    // The H segment moved to y=150.
    // So the new intermediate points are (0,150) and (100,150).
    expect(result).toEqual([
      { x: 0, y: 150 },
      { x: 100, y: 150 },
    ])
  })

  it("drags the first segment (horizontal) and creates a bridge", () => {
    // path: (0,0) -> (100,0) -> (100,100)
    // segments: H, V
    const path = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]

    // drag segment 0 (the H segment from 0,0 to 100,0) down by 20px
    const result = calculateDraggedWaypoints(path, 0, { x: 0, y: 20 })

    // Expected waypoints:
    // The H segment moved to y=20.
    // To connect back to source (0,0), we need a V line to (0,20).
    // To connect to target (100,100), the segment is at (100,20).
    expect(result).toEqual([
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ])
  })

  it("drags the last segment (vertical) and creates a bridge", () => {
    // path: (0,0) -> (100,0) -> (100,100)
    // segments: H, V
    const path = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]

    // drag segment 1 (the V segment from 100,0 to 100,100) right by 30px
    const result = calculateDraggedWaypoints(path, 1, { x: 30, y: 0 })

    // Expected waypoints:
    // The V segment moved to x=130.
    // The previous point was (100,0), so it stretched to (130,0).
    // The target is fixed at (100,100). We need an H bridge from (130,100) to (100,100).
    expect(result).toEqual([
      { x: 130, y: 0 },
      { x: 130, y: 100 },
    ])
  })
})
