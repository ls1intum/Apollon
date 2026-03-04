import { describe, it, expect } from "vitest"
import {
  calculateDirection,
  getPathEndInfo,
  getPathStartInfo,
  extractMarkerId,
} from "@/utils/pathParsing"

// ---------------------------------------------------------------------------
// calculateDirection
// ---------------------------------------------------------------------------
describe("calculateDirection", () => {
  it("returns 0 for rightward direction", () => {
    expect(calculateDirection({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0)
  })

  it("returns π/2 for downward direction", () => {
    expect(calculateDirection({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(
      Math.PI / 2
    )
  })

  it("returns π for leftward direction", () => {
    expect(calculateDirection({ x: 10, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(
      Math.PI
    )
  })

  it("returns -π/2 for upward direction", () => {
    expect(calculateDirection({ x: 0, y: 10 }, { x: 0, y: 0 })).toBeCloseTo(
      -Math.PI / 2
    )
  })

  it("returns π/4 for 45° diagonal", () => {
    expect(calculateDirection({ x: 0, y: 0 }, { x: 10, y: 10 })).toBeCloseTo(
      Math.PI / 4
    )
  })

  it("returns 0 when from and to are same point", () => {
    expect(calculateDirection({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getPathEndInfo — absolute commands
// ---------------------------------------------------------------------------
describe("getPathEndInfo", () => {
  it("returns null for empty string", () => {
    expect(getPathEndInfo("")).toBeNull()
  })

  it("returns null for whitespace-only string", () => {
    expect(getPathEndInfo("   ")).toBeNull()
  })

  // --- MoveTo ---
  it("handles a single M command", () => {
    const result = getPathEndInfo("M10,20")!
    expect(result.endPoint).toEqual({ x: 10, y: 20 })
  })

  it("handles implicit LineTo after M", () => {
    const result = getPathEndInfo("M0,0 50,100")!
    expect(result.endPoint).toEqual({ x: 50, y: 100 })
    // Direction from (0,0) to (50,100)
    expect(result.direction).toBeCloseTo(Math.atan2(100, 50))
  })

  // --- LineTo ---
  it("handles M then L", () => {
    const result = getPathEndInfo("M0,0 L100,0")!
    expect(result.endPoint).toEqual({ x: 100, y: 0 })
    expect(result.direction).toBe(0) // rightward
  })

  it("handles multiple L parameters (polyline)", () => {
    const result = getPathEndInfo("M0,0 L50,0 100,50")!
    expect(result.endPoint).toEqual({ x: 100, y: 50 })
    // Direction from (50,0) to (100,50)
    expect(result.direction).toBeCloseTo(Math.atan2(50, 50))
  })

  // --- Horizontal LineTo ---
  it("handles H command", () => {
    const result = getPathEndInfo("M0,10 H200")!
    expect(result.endPoint).toEqual({ x: 200, y: 10 })
    expect(result.direction).toBe(0) // rightward
  })

  it("handles multiple H parameters", () => {
    const result = getPathEndInfo("M0,0 H50 100")!
    // Second H param: prevX=50, currentX=100
    expect(result.endPoint).toEqual({ x: 100, y: 0 })
  })

  // --- Vertical LineTo ---
  it("handles V command", () => {
    const result = getPathEndInfo("M10,0 V150")!
    expect(result.endPoint).toEqual({ x: 10, y: 150 })
    expect(result.direction).toBeCloseTo(Math.PI / 2) // downward
  })

  // --- Cubic Bezier ---
  it("handles C command (cubic bezier)", () => {
    // C x1 y1 x2 y2 x y
    const result = getPathEndInfo("M0,0 C10,20 80,80 100,100")!
    expect(result.endPoint).toEqual({ x: 100, y: 100 })
    // Direction from control point (80,80) to endpoint (100,100)
    expect(result.direction).toBeCloseTo(Math.atan2(20, 20))
  })

  // --- Smooth Cubic Bezier ---
  it("handles S command (smooth cubic)", () => {
    // S x2 y2 x y
    const result = getPathEndInfo("M0,0 C10,0 40,0 50,0 S90,0 100,0")!
    expect(result.endPoint).toEqual({ x: 100, y: 0 })
    // Direction from control (90,0) to (100,0)
    expect(result.direction).toBe(0)
  })

  // --- Quadratic Bezier ---
  it("handles Q command (quadratic bezier)", () => {
    // Q x1 y1 x y
    const result = getPathEndInfo("M0,0 Q50,100 100,0")!
    expect(result.endPoint).toEqual({ x: 100, y: 0 })
    // Direction from control (50,100) to (100,0)
    expect(result.direction).toBeCloseTo(Math.atan2(-100, 50))
  })

  // --- Smooth Quadratic ---
  it("handles T command (smooth quadratic)", () => {
    const result = getPathEndInfo("M0,0 Q25,50 50,0 T100,0")!
    expect(result.endPoint).toEqual({ x: 100, y: 0 })
  })

  it("handles T without prior Q (control = current)", () => {
    const result = getPathEndInfo("M0,0 L50,50 T100,0")!
    expect(result.endPoint).toEqual({ x: 100, y: 0 })
    // lastCommandType is "L" not "Q"/"T", so control = current = (50,50)
    // direction from (50,50) to (100,0)
    expect(result.direction).toBeCloseTo(Math.atan2(-50, 50))
  })

  // --- Arc ---
  it("handles A command (arc)", () => {
    // A rx ry x-rotation large-arc sweep x y
    const result = getPathEndInfo("M0,0 A25 25 0 0 1 50,50")!
    expect(result.endPoint).toEqual({ x: 50, y: 50 })
    // Direction from (0,0) to (50,50) — prev is current before arc
    expect(result.direction).toBeCloseTo(Math.PI / 4)
  })

  // --- Close Path ---
  it("handles Z command (close path returns to start)", () => {
    const result = getPathEndInfo("M10,20 L100,200 Z")!
    expect(result.endPoint).toEqual({ x: 10, y: 20 }) // back to start
  })

  // --- Relative Commands ---
  it("handles relative m and l commands", () => {
    const result = getPathEndInfo("m10,20 l30,40")!
    // m10,20 → current=(10,20); l30,40 → current=(40,60)
    expect(result.endPoint).toEqual({ x: 40, y: 60 })
  })

  it("handles relative h command", () => {
    const result = getPathEndInfo("M50,50 h-20")!
    expect(result.endPoint).toEqual({ x: 30, y: 50 })
    expect(result.direction).toBeCloseTo(Math.PI) // leftward
  })

  it("handles relative v command", () => {
    const result = getPathEndInfo("M50,50 v30")!
    expect(result.endPoint).toEqual({ x: 50, y: 80 })
    expect(result.direction).toBeCloseTo(Math.PI / 2) // downward
  })

  it("handles relative c command", () => {
    // c dx1 dy1 dx2 dy2 dx dy (all relative to current)
    const result = getPathEndInfo("M10,10 c10,0 40,0 50,0")!
    // endpoint = (10+50, 10+0) = (60, 10)
    expect(result.endPoint).toEqual({ x: 60, y: 10 })
  })

  it("handles relative q command", () => {
    const result = getPathEndInfo("M10,10 q20,40 40,0")!
    // endpoint = (10+40, 10+0) = (50, 10)
    expect(result.endPoint).toEqual({ x: 50, y: 10 })
  })

  it("handles relative s command", () => {
    const result = getPathEndInfo("M0,0 c10,0 40,0 50,0 s40,0 50,0")!
    // After c: current=(50,0). s is relative: endpoint=(50+50, 0+0)=(100,0)
    expect(result.endPoint).toEqual({ x: 100, y: 0 })
  })

  it("handles relative a command", () => {
    const result = getPathEndInfo("M0,0 a25 25 0 0 1 50,50")!
    // endpoint = (0+50, 0+50) = (50, 50)
    expect(result.endPoint).toEqual({ x: 50, y: 50 })
  })

  // --- Complex Paths ---
  it("handles a complex multi-command path", () => {
    const result = getPathEndInfo("M0,0 L50,0 V100 H0 Z")!
    expect(result.endPoint).toEqual({ x: 0, y: 0 }) // closed path
  })

  it("handles scientific notation in params", () => {
    const result = getPathEndInfo("M1e2,2e1")!
    expect(result.endPoint).toEqual({ x: 100, y: 20 })
  })

  it("handles negative coordinates", () => {
    const result = getPathEndInfo("M-50,-100 L-25,-50")!
    expect(result.endPoint).toEqual({ x: -25, y: -50 })
  })
})

// ---------------------------------------------------------------------------
// getPathStartInfo
// ---------------------------------------------------------------------------
describe("getPathStartInfo", () => {
  it("returns null for empty string", () => {
    expect(getPathStartInfo("")).toBeNull()
  })

  it("returns null for path with only M (no second point)", () => {
    expect(getPathStartInfo("M10,20")).toBeNull()
  })

  it("returns start info for M then L", () => {
    const result = getPathStartInfo("M0,0 L100,0")!
    expect(result.startPoint).toEqual({ x: 0, y: 0 })
    // Direction INTO the start = from (100,0) to (0,0) = leftward = π
    expect(result.direction).toBeCloseTo(Math.PI)
  })

  it("returns start info with implicit LineTo after M", () => {
    const result = getPathStartInfo("M10,20 50,60")!
    expect(result.startPoint).toEqual({ x: 10, y: 20 })
    // second point = (50,60), direction into start from (50,60) to (10,20)
    expect(result.direction).toBeCloseTo(Math.atan2(20 - 60, 10 - 50))
  })

  it("handles H as second command", () => {
    const result = getPathStartInfo("M0,50 H100")!
    expect(result.startPoint).toEqual({ x: 0, y: 50 })
    // Direction from (100,50) to (0,50) = leftward
    expect(result.direction).toBeCloseTo(Math.PI)
  })

  it("handles V as second command", () => {
    const result = getPathStartInfo("M50,0 V100")!
    expect(result.startPoint).toEqual({ x: 50, y: 0 })
    // Direction from (50,100) to (50,0) = upward
    expect(result.direction).toBeCloseTo(-Math.PI / 2)
  })

  it("handles C as second command (uses first control point)", () => {
    const result = getPathStartInfo("M0,0 C50,100 80,80 100,100")!
    expect(result.startPoint).toEqual({ x: 0, y: 0 })
    // Second point = first control point (50,100)
    // Direction INTO start: from (50,100) to (0,0)
    expect(result.direction).toBeCloseTo(Math.atan2(-100, -50))
  })

  it("handles Q as second command (uses control point)", () => {
    const result = getPathStartInfo("M0,0 Q50,100 100,0")!
    expect(result.startPoint).toEqual({ x: 0, y: 0 })
    // Second point = control (50,100), direction from (50,100) to (0,0)
    expect(result.direction).toBeCloseTo(Math.atan2(-100, -50))
  })

  it("handles A as second command", () => {
    const result = getPathStartInfo("M0,0 A25 25 0 0 1 50,50")!
    expect(result.startPoint).toEqual({ x: 0, y: 0 })
    // Second point = arc endpoint (50,50), direction from (50,50) to (0,0)
    expect(result.direction).toBeCloseTo(Math.atan2(-50, -50))
  })

  it("handles relative l as second command", () => {
    const result = getPathStartInfo("M10,10 l20,30")!
    expect(result.startPoint).toEqual({ x: 10, y: 10 })
    // Second point = (10+20, 10+30) = (30,40)
    // Direction from (30,40) to (10,10)
    expect(result.direction).toBeCloseTo(Math.atan2(10 - 40, 10 - 30))
  })
})

// ---------------------------------------------------------------------------
// extractMarkerId
// ---------------------------------------------------------------------------
describe("extractMarkerId", () => {
  it("returns null for undefined", () => {
    expect(extractMarkerId(undefined)).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(extractMarkerId("")).toBeNull()
  })

  it("extracts ID from url(#id)", () => {
    expect(extractMarkerId("url(#black-arrow)")).toBe("black-arrow")
  })

  it("extracts ID from url('#id') with single quotes", () => {
    expect(extractMarkerId("url('#my-marker')")).toBe("my-marker")
  })

  it('extracts ID from url("#id") with double quotes', () => {
    expect(extractMarkerId('url("#my-marker")')).toBe("my-marker")
  })

  it("extracts ID without # prefix", () => {
    expect(extractMarkerId("url(marker-id)")).toBe("marker-id")
  })

  it("returns null for malformed url()", () => {
    expect(extractMarkerId("not-a-url")).toBeNull()
  })

  it("returns null for empty url()", () => {
    expect(extractMarkerId("url()")).toBeNull()
  })
})
