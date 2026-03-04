import { describe, it, expect } from "vitest"
import {
  getNodeBounds,
  calculateAlignmentGuides,
  snapNodeToGuides,
} from "@/utils/alignmentUtils"
import type { Node } from "@xyflow/react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(
  id: string,
  x: number,
  y: number,
  width?: number,
  height?: number
): Node {
  return {
    id,
    position: { x, y },
    data: {},
    measured:
      width !== undefined ? { width, height: height ?? width } : undefined,
  } as Node
}

// ---------------------------------------------------------------------------
// getNodeBounds
// ---------------------------------------------------------------------------

describe("getNodeBounds", () => {
  it("computes bounds from measured dimensions", () => {
    const node = makeNode("a", 10, 20, 200, 100)
    const bounds = getNodeBounds(node)
    expect(bounds).toEqual({
      left: 10,
      right: 210,
      top: 20,
      bottom: 120,
      centerX: 110,
      centerY: 70,
    })
  })

  it("falls back to 100 when measured is undefined", () => {
    const node: Node = {
      id: "a",
      position: { x: 0, y: 0 },
      data: {},
    } as Node
    const bounds = getNodeBounds(node)
    expect(bounds.right).toBe(100)
    expect(bounds.bottom).toBe(100)
    expect(bounds.centerX).toBe(50)
    expect(bounds.centerY).toBe(50)
  })

  it("handles zero-dimension measured values (falsy → fallback)", () => {
    const node: Node = {
      id: "a",
      position: { x: 5, y: 5 },
      data: {},
      measured: { width: 0, height: 0 },
    } as Node
    // 0 is falsy → fallback to 100
    const bounds = getNodeBounds(node)
    expect(bounds.right).toBe(105)
    expect(bounds.bottom).toBe(105)
  })
})

// ---------------------------------------------------------------------------
// calculateAlignmentGuides
// ---------------------------------------------------------------------------

describe("calculateAlignmentGuides", () => {
  it("returns empty array when there are no other nodes", () => {
    const dragged = makeNode("d", 50, 50, 100, 100)
    const guides = calculateAlignmentGuides(dragged, [dragged])
    expect(guides).toEqual([])
  })

  it("finds vertical guide when left edges align", () => {
    const dragged = makeNode("d", 100, 50, 100, 100)
    const other = makeNode("o", 100, 200, 80, 80)
    const guides = calculateAlignmentGuides(dragged, [dragged, other])
    const verticals = guides.filter((g) => g.type === "vertical")
    expect(verticals.length).toBeGreaterThan(0)
    expect(verticals.some((g) => g.position === 100)).toBe(true)
  })

  it("finds horizontal guide when top edges align", () => {
    const dragged = makeNode("d", 50, 100, 100, 100)
    const other = makeNode("o", 200, 100, 80, 80)
    const guides = calculateAlignmentGuides(dragged, [dragged, other])
    const horizontals = guides.filter((g) => g.type === "horizontal")
    expect(horizontals.length).toBeGreaterThan(0)
    expect(horizontals.some((g) => g.position === 100)).toBe(true)
  })

  it("returns no guides when nodes are far apart", () => {
    const dragged = makeNode("d", 0, 0, 100, 100)
    const other = makeNode("o", 500, 500, 100, 100)
    const guides = calculateAlignmentGuides(dragged, [dragged, other])
    expect(guides).toEqual([])
  })

  it("uses custom threshold", () => {
    // left edges differ by 15: 100 vs 115
    const dragged = makeNode("d", 100, 0, 50, 50)
    const other = makeNode("o", 115, 200, 50, 50)

    // default threshold=10 → no guide
    expect(
      calculateAlignmentGuides(dragged, [dragged, other], 10)
    ).toHaveLength(0)

    // threshold=20 → should find guide
    const guides = calculateAlignmentGuides(dragged, [dragged, other], 20)
    expect(guides.length).toBeGreaterThan(0)
  })

  it("deduplicates guides at the same position", () => {
    // Two other nodes both at left=100
    const dragged = makeNode("d", 100, 0, 50, 50)
    const o1 = makeNode("o1", 100, 200, 50, 50)
    const o2 = makeNode("o2", 100, 400, 50, 50)
    const guides = calculateAlignmentGuides(dragged, [dragged, o1, o2])
    const leftGuides = guides.filter(
      (g) => g.type === "vertical" && g.position === 100
    )
    expect(leftGuides).toHaveLength(1)
  })

  it("detects center alignment between nodes", () => {
    // dragged: center at 50+50=100, other: center at 60+40=100
    const dragged = makeNode("d", 50, 50, 100, 100)
    const other = makeNode("o", 60, 200, 80, 80)
    const guides = calculateAlignmentGuides(dragged, [dragged, other])
    const verticals = guides.filter((g) => g.type === "vertical")
    expect(verticals.some((g) => g.position === 100)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// snapNodeToGuides
// ---------------------------------------------------------------------------

describe("snapNodeToGuides", () => {
  it("returns empty object when no guides match", () => {
    const node = makeNode("d", 100, 100, 50, 50)
    const result = snapNodeToGuides(node, [
      { id: "v", type: "vertical", position: 500 },
    ])
    expect(result).toEqual({})
  })

  it("snaps x for left-edge vertical guide within threshold", () => {
    const node = makeNode("d", 98, 100, 50, 50)
    const result = snapNodeToGuides(node, [
      { id: "v", type: "vertical", position: 100 },
    ])
    expect(result.x).toBeDefined()
  })

  it("snaps y for top-edge horizontal guide within threshold", () => {
    const node = makeNode("d", 100, 98, 50, 50)
    const result = snapNodeToGuides(node, [
      { id: "h", type: "horizontal", position: 100 },
    ])
    expect(result.y).toBeDefined()
  })

  it("snaps x based on right edge", () => {
    // node right = 100 + 50 = 150, guide at 152 → within threshold
    const node = makeNode("d", 100, 0, 50, 50)
    const result = snapNodeToGuides(node, [
      { id: "v", type: "vertical", position: 152 },
    ])
    expect(result.x).toBeDefined()
  })

  it("snaps y based on bottom edge", () => {
    // node bottom = 100 + 50 = 150, guide at 148 → within threshold
    const node = makeNode("d", 0, 100, 50, 50)
    const result = snapNodeToGuides(node, [
      { id: "h", type: "horizontal", position: 148 },
    ])
    expect(result.y).toBeDefined()
  })

  it("handles multiple guides, last matching wins", () => {
    const node = makeNode("d", 100, 100, 50, 50)
    const result = snapNodeToGuides(node, [
      { id: "v1", type: "vertical", position: 100 },
      { id: "v2", type: "vertical", position: 102 },
    ])
    // both left-edge matches (100-100=0, 100-102=-2 both <10)
    expect(result.x).toBeDefined()
  })
})
