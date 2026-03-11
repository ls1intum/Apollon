import { describe, it, expect } from "vitest"
import { Position } from "@xyflow/react"
import {
  tryFindStraightPath,
  computeOverlap,
  pointsToSvgPath,
  getPortsForElement,
} from "@/edges/Connection"
import { EDGES } from "@/constants"

// ---------------------------------------------------------------------------
// computeOverlap
// ---------------------------------------------------------------------------
describe("computeOverlap", () => {
  it("returns the overlap region when ranges overlap", () => {
    expect(computeOverlap([0, 100], [50, 150])).toEqual([50, 100])
  })

  it("returns null when ranges do not overlap", () => {
    expect(computeOverlap([0, 40], [50, 100])).toBeNull()
  })

  it("returns a single point when ranges touch at exactly one point", () => {
    expect(computeOverlap([0, 50], [50, 100])).toEqual([50, 50])
  })

  it("handles identical ranges", () => {
    expect(computeOverlap([10, 90], [10, 90])).toEqual([10, 90])
  })

  it("handles one range fully inside the other", () => {
    expect(computeOverlap([0, 200], [50, 100])).toEqual([50, 100])
  })
})

// ---------------------------------------------------------------------------
// pointsToSvgPath
// ---------------------------------------------------------------------------
describe("pointsToSvgPath", () => {
  it("returns empty string for no points", () => {
    expect(pointsToSvgPath([])).toBe("")
  })

  it("creates a simple M L path for two points", () => {
    expect(
      pointsToSvgPath([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ])
    ).toBe("M 10 20 L 30 40")
  })

  it("rounds coordinates to whole pixels", () => {
    expect(
      pointsToSvgPath([
        { x: 10.7, y: 20.3 },
        { x: 30.5, y: 40.9 },
      ])
    ).toBe("M 11 20 L 31 41")
  })
})

// ---------------------------------------------------------------------------
// getPortsForElement
// ---------------------------------------------------------------------------
describe("getPortsForElement", () => {
  it("computes center-of-edge port positions", () => {
    const ports = getPortsForElement({ x: 0, y: 0, width: 200, height: 100 })
    expect(ports[Position.Top]).toEqual({ x: 100, y: 0 })
    expect(ports[Position.Right]).toEqual({ x: 200, y: 50 })
    expect(ports[Position.Bottom]).toEqual({ x: 100, y: 100 })
    expect(ports[Position.Left]).toEqual({ x: 0, y: 50 })
  })
})

// ---------------------------------------------------------------------------
// tryFindStraightPath – basic behavior (without handleCoords)
// ---------------------------------------------------------------------------
describe("tryFindStraightPath", () => {
  const padding = EDGES.MARKER_PADDING // -3

  // Helper to create a source/target node spec
  const makeNode = (
    x: number,
    y: number,
    width: number,
    height: number,
    direction: Position
  ) => ({
    position: { x, y },
    width,
    height,
    direction,
  })

  describe("Right → Left", () => {
    it("returns a horizontal straight path when nodes have sufficient vertical overlap", () => {
      const source = makeNode(0, 0, 100, 100, Position.Right)
      const target = makeNode(200, 0, 100, 100, Position.Left)

      const result = tryFindStraightPath(source, target, padding)
      expect(result).not.toBeNull()
      expect(result).toHaveLength(2)
      // Both points should share the same Y (horizontal path)
      expect(result![0].y).toBe(result![1].y)
    })

    it("returns null when there is no vertical overlap", () => {
      const source = makeNode(0, 0, 100, 30, Position.Right)
      const target = makeNode(200, 200, 100, 30, Position.Left)

      expect(tryFindStraightPath(source, target, padding)).toBeNull()
    })
  })

  describe("Left → Right", () => {
    it("returns a horizontal straight path for overlapping nodes", () => {
      const source = makeNode(300, 0, 100, 100, Position.Left)
      const target = makeNode(0, 0, 100, 100, Position.Right)

      const result = tryFindStraightPath(source, target, padding)
      expect(result).not.toBeNull()
      expect(result![0].y).toBe(result![1].y)
    })
  })

  describe("Bottom → Top", () => {
    it("returns a vertical straight path when nodes have sufficient horizontal overlap", () => {
      const source = makeNode(0, 0, 100, 100, Position.Bottom)
      const target = makeNode(0, 200, 100, 100, Position.Top)

      const result = tryFindStraightPath(source, target, padding)
      expect(result).not.toBeNull()
      expect(result).toHaveLength(2)
      // Both points should share the same X (vertical path)
      expect(result![0].x).toBe(result![1].x)
    })

    it("returns null when there is no horizontal overlap", () => {
      const source = makeNode(0, 0, 30, 100, Position.Bottom)
      const target = makeNode(200, 200, 30, 100, Position.Top)

      expect(tryFindStraightPath(source, target, padding)).toBeNull()
    })
  })

  describe("Top → Bottom", () => {
    it("returns a vertical straight path for overlapping nodes", () => {
      const source = makeNode(0, 300, 100, 100, Position.Top)
      const target = makeNode(0, 0, 100, 100, Position.Bottom)

      const result = tryFindStraightPath(source, target, padding)
      expect(result).not.toBeNull()
      expect(result![0].x).toBe(result![1].x)
    })
  })

  // -------------------------------------------------------------------------
  // handleCoords alignment rejection – the core fix for diagonal edges
  // -------------------------------------------------------------------------
  describe("handleCoords alignment rejection", () => {
    describe("Right → Left with misaligned Y handles", () => {
      it("returns null when handle Y-coords differ by more than 1px", () => {
        // Nodes overlap vertically, so without handleCoords this would succeed
        const source = makeNode(0, 0, 100, 100, Position.Right)
        const target = makeNode(200, 0, 100, 100, Position.Left)

        // Verify it works without handleCoords
        expect(tryFindStraightPath(source, target, padding)).not.toBeNull()

        // Now with misaligned handles (e.g. right-top → left-bottom)
        const result = tryFindStraightPath(source, target, padding, {
          sourceX: 100,
          sourceY: 25, // right-top handle
          targetX: 200,
          targetY: 75, // left-bottom handle
        })
        expect(result).toBeNull()
      })

      it("returns straight path when handle Y-coords are within 1px tolerance", () => {
        const source = makeNode(0, 0, 100, 100, Position.Right)
        const target = makeNode(200, 0, 100, 100, Position.Left)

        const result = tryFindStraightPath(source, target, padding, {
          sourceX: 100,
          sourceY: 50,
          targetX: 200,
          targetY: 50.5, // within 1px tolerance
        })
        expect(result).not.toBeNull()
        expect(result![0].y).toBe(result![1].y)
      })

      it("returns straight path when handle Y-coords are exactly equal", () => {
        const source = makeNode(0, 0, 100, 100, Position.Right)
        const target = makeNode(200, 0, 100, 100, Position.Left)

        const result = tryFindStraightPath(source, target, padding, {
          sourceX: 100,
          sourceY: 50,
          targetX: 200,
          targetY: 50,
        })
        expect(result).not.toBeNull()
      })
    })

    describe("Left → Right with misaligned Y handles", () => {
      it("returns null when handle Y-coords are misaligned", () => {
        const source = makeNode(300, 0, 100, 100, Position.Left)
        const target = makeNode(0, 0, 100, 100, Position.Right)

        // Verify baseline
        expect(tryFindStraightPath(source, target, padding)).not.toBeNull()

        const result = tryFindStraightPath(source, target, padding, {
          sourceX: 300,
          sourceY: 25,
          targetX: 100,
          targetY: 75,
        })
        expect(result).toBeNull()
      })
    })

    describe("Bottom → Top with misaligned X handles", () => {
      it("returns null when handle X-coords are misaligned", () => {
        const source = makeNode(0, 0, 100, 100, Position.Bottom)
        const target = makeNode(0, 200, 100, 100, Position.Top)

        // Verify baseline
        expect(tryFindStraightPath(source, target, padding)).not.toBeNull()

        const result = tryFindStraightPath(source, target, padding, {
          sourceX: 25, // bottom-left handle
          sourceY: 100,
          targetX: 75, // top-right handle
          targetY: 200,
        })
        expect(result).toBeNull()
      })

      it("returns straight path when handle X-coords are within tolerance", () => {
        const source = makeNode(0, 0, 100, 100, Position.Bottom)
        const target = makeNode(0, 200, 100, 100, Position.Top)

        const result = tryFindStraightPath(source, target, padding, {
          sourceX: 50,
          sourceY: 100,
          targetX: 50.8,
          targetY: 200,
        })
        expect(result).not.toBeNull()
      })
    })

    describe("Top → Bottom with misaligned X handles", () => {
      it("returns null when handle X-coords are misaligned", () => {
        const source = makeNode(0, 300, 100, 100, Position.Top)
        const target = makeNode(0, 0, 100, 100, Position.Bottom)

        // Verify baseline
        expect(tryFindStraightPath(source, target, padding)).not.toBeNull()

        const result = tryFindStraightPath(source, target, padding, {
          sourceX: 25,
          sourceY: 300,
          targetX: 75,
          targetY: 100,
        })
        expect(result).toBeNull()
      })
    })

    describe("Observer diagram scenario (right-top → left-top)", () => {
      // Real-world scenario: Publisher (160x90) at (0, 0), Subscriber (160x50) at (270, 0)
      // Source handle: right-top (x=160, y≈23), Target handle: left-top (x=270, y≈13)
      it("rejects straight path for Publisher→Subscriber with misaligned sub-handles", () => {
        const source = makeNode(0, 0, 160, 90, Position.Right)
        const target = makeNode(270, 0, 160, 50, Position.Left)

        // Without handleCoords, nodes overlap vertically => straight path found
        const baseline = tryFindStraightPath(source, target, padding)
        expect(baseline).not.toBeNull()

        // With actual handle positions (right-top vs left-top, different Y)
        const result = tryFindStraightPath(source, target, padding, {
          sourceX: 160,
          sourceY: 23,
          targetX: 270,
          targetY: 13,
        })
        expect(result).toBeNull()
      })
    })
  })
})
