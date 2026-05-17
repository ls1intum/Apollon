import { describe, it, expect } from "vitest"
import { SpatialIndex } from "@/utils/geometry/SpatialIndex"
import type { BBox } from "@/utils/geometry/OrthogonalVisibilityGraph"

describe("SpatialIndex (R-Tree)", () => {
  it("loads obstacles and returns correct search results", () => {
    const index = new SpatialIndex()
    const obstacles: BBox[] = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 200, y: 200, width: 50, height: 50 },
      { x: 500, y: 500, width: 80, height: 80 },
    ]
    index.load(obstacles)
    expect(index.size).toBe(3)

    // Search a region that overlaps only the first obstacle
    const result = index.search({ x: 10, y: 10, width: 50, height: 50 })
    expect(result.length).toBe(1)
    expect(result[0]).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })

  it("returns empty array for non-overlapping query", () => {
    const index = new SpatialIndex()
    index.load([{ x: 0, y: 0, width: 10, height: 10 }])

    const result = index.search({ x: 100, y: 100, width: 10, height: 10 })
    expect(result.length).toBe(0)
  })

  it("searchSegment returns obstacles intersecting axis-aligned segment", () => {
    const index = new SpatialIndex()
    index.load([
      { x: 50, y: 0, width: 20, height: 100 }, // blocks segment at x ∈ [50,70]
      { x: 200, y: 200, width: 50, height: 50 }, // far away
    ])

    // Horizontal segment from (0,50) to (100,50) - should intersect obstacle #1
    const result = index.searchSegment({ x: 0, y: 50 }, { x: 100, y: 50 })
    expect(result.length).toBe(1)
    expect(result[0].x).toBe(50)
  })

  it("clear empties the tree", () => {
    const index = new SpatialIndex()
    index.load([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10 },
    ])
    expect(index.size).toBe(2)
    index.clear()
    expect(index.size).toBe(0)
  })

  it("handles bulk load of 1000 obstacles efficiently", () => {
    const index = new SpatialIndex()
    const obstacles: BBox[] = Array.from({ length: 1000 }, (_, i) => ({
      x: i * 20,
      y: i * 20,
      width: 15,
      height: 15,
    }))

    const start = performance.now()
    index.load(obstacles)
    const loadTime = performance.now() - start

    expect(index.size).toBe(1000)
    // Bulk load of 1000 items should be well under 100ms
    expect(loadTime).toBeLessThan(100)

    // Query a small region
    const searchStart = performance.now()
    const result = index.search({ x: 100, y: 100, width: 50, height: 50 })
    const searchTime = performance.now() - searchStart

    // Should find a handful of items
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThan(10)
    // O(log n) search should be sub-millisecond
    expect(searchTime).toBeLessThan(5)
  })
})
