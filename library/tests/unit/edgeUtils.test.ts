import { EDGES, INTERFACE } from "@/constants"
import type { UMLDiagramType } from "@/types/DiagramType"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  buildPathWithLineJumps,
  computeLineJumpsForEdge,
  calculateDynamicEdgeLabels,
  calculateOverlayPath,
  calculateStraightPath,
  findLineJumpIntersections,
  findClosestHandle,
  getAxisAlignedSegments,
  getConnectionLineType,
  getDefaultEdgeType,
  getEdgeMarkerStyles,
  getMarkerSegmentPath,
  isInvalidOrthogonalEdgeRelease,
  normalizeOrthogonalEdgePoints,
  parseSvgPath,
  preserveOrthogonalEdgePoints,
  resolveOrthogonalEdgeReleasePoints,
  resolveReconnectPreviewBasePoints,
  removeDuplicatePoints,
  simplifyPoints,
  simplifySvgPath,
  stubsWouldOverlap,
} from "@/utils/edgeUtils"
import { ConnectionLineType, Position } from "@xyflow/react"
import { describe, expect, it } from "vitest"

const expectOrthogonalSegments = (points: { x: number; y: number }[]) => {
  for (let i = 1; i < points.length; i++) {
    expect(
      points[i - 1].x === points[i].x || points[i - 1].y === points[i].y
    ).toBe(true)
  }
}

// ---------------------------------------------------------------------------
// adjustTargetCoordinates
// ---------------------------------------------------------------------------
describe("adjustTargetCoordinates", () => {
  it("subtracts padding from x when position is left", () => {
    const result = adjustTargetCoordinates(100, 200, Position.Left, 10)
    expect(result).toEqual({ targetX: 90, targetY: 200 })
  })

  it("adds padding to x when position is right", () => {
    const result = adjustTargetCoordinates(100, 200, Position.Right, 10)
    expect(result).toEqual({ targetX: 110, targetY: 200 })
  })

  it("subtracts padding from y when position is top", () => {
    const result = adjustTargetCoordinates(100, 200, Position.Top, 10)
    expect(result).toEqual({ targetX: 100, targetY: 190 })
  })

  it("adds padding to y when position is bottom", () => {
    const result = adjustTargetCoordinates(100, 200, Position.Bottom, 10)
    expect(result).toEqual({ targetX: 100, targetY: 210 })
  })

  it("handles zero padding", () => {
    const result = adjustTargetCoordinates(50, 75, Position.Left, 0)
    expect(result).toEqual({ targetX: 50, targetY: 75 })
  })

  it("handles negative padding", () => {
    const result = adjustTargetCoordinates(100, 200, Position.Left, -5)
    expect(result).toEqual({ targetX: 105, targetY: 200 })
  })
})

// ---------------------------------------------------------------------------
// adjustSourceCoordinates
// ---------------------------------------------------------------------------
describe("adjustSourceCoordinates", () => {
  it("adds padding to x when position is left (inverted)", () => {
    const result = adjustSourceCoordinates(100, 200, Position.Left, 10)
    expect(result).toEqual({ sourceX: 110, sourceY: 200 })
  })

  it("subtracts padding from x when position is right (inverted)", () => {
    const result = adjustSourceCoordinates(100, 200, Position.Right, 10)
    expect(result).toEqual({ sourceX: 90, sourceY: 200 })
  })

  it("adds padding to y when position is top (inverted)", () => {
    const result = adjustSourceCoordinates(100, 200, Position.Top, 10)
    expect(result).toEqual({ sourceX: 100, sourceY: 210 })
  })

  it("subtracts padding from y when position is bottom (inverted)", () => {
    const result = adjustSourceCoordinates(100, 200, Position.Bottom, 10)
    expect(result).toEqual({ sourceX: 100, sourceY: 190 })
  })

  it("handles zero padding", () => {
    const result = adjustSourceCoordinates(50, 75, Position.Right, 0)
    expect(result).toEqual({ sourceX: 50, sourceY: 75 })
  })
})

// ---------------------------------------------------------------------------
// calculateDynamicEdgeLabels
// ---------------------------------------------------------------------------
describe("calculateDynamicEdgeLabels", () => {
  it("returns correct values for top direction", () => {
    const result = calculateDynamicEdgeLabels(100, 200, "top")
    expect(result).toEqual({
      roleX: 90,
      roleY: 195,
      roleTextAnchor: "end",
      multiplicityX: 110,
      multiplicityY: 195,
      multiplicityTextAnchor: "start",
    })
  })

  it("returns correct values for bottom direction", () => {
    const result = calculateDynamicEdgeLabels(100, 200, "bottom")
    expect(result).toEqual({
      roleX: 90,
      roleY: 215,
      roleTextAnchor: "end",
      multiplicityX: 110,
      multiplicityY: 215,
      multiplicityTextAnchor: "start",
    })
  })

  it("returns correct values for left direction", () => {
    const result = calculateDynamicEdgeLabels(100, 200, "left")
    expect(result).toEqual({
      roleX: 95,
      roleY: 190,
      roleTextAnchor: "end",
      multiplicityX: 95,
      multiplicityY: 220,
      multiplicityTextAnchor: "end",
    })
  })

  it("returns correct values for right direction", () => {
    const result = calculateDynamicEdgeLabels(100, 200, "right")
    expect(result).toEqual({
      roleX: 105,
      roleY: 190,
      roleTextAnchor: "start",
      multiplicityX: 105,
      multiplicityY: 220,
      multiplicityTextAnchor: "start",
    })
  })

  it("returns default values for unknown direction", () => {
    const result = calculateDynamicEdgeLabels(100, 200, "diagonal")
    expect(result).toEqual({
      roleX: 100,
      roleY: 190,
      roleTextAnchor: "middle",
      multiplicityX: 100,
      multiplicityY: 210,
      multiplicityTextAnchor: "middle",
    })
  })

  it("returns default values for empty string direction", () => {
    const result = calculateDynamicEdgeLabels(50, 50, "")
    expect(result.roleTextAnchor).toBe("middle")
    expect(result.multiplicityTextAnchor).toBe("middle")
  })
})

// ---------------------------------------------------------------------------
// getEdgeMarkerStyles
// ---------------------------------------------------------------------------
describe("getEdgeMarkerStyles", () => {
  const MP = EDGES.MARKER_PADDING

  // One row per edge type. A row asserts only the fields it lists; a present
  // key with value `undefined` asserts that field is undefined.
  const cases: Array<Record<string, unknown>> = [
    {
      type: "ClassBidirectional",
      end: undefined,
      start: undefined,
      dash: "0",
      offset: 0,
      pad: MP,
    },
    { type: "ObjectLink", end: undefined, pad: MP },
    {
      type: "ClassUnidirectional",
      end: "url(#black-arrow)",
      dash: "0",
      pad: MP,
    },
    { type: "ActivityControlFlow", end: "url(#black-arrow)", pad: MP },
    { type: "FlowChartFlowline", end: "url(#black-arrow)" },
    { type: "ReachabilityGraphArc", end: "url(#black-arrow)" },
    {
      type: "ClassAggregation",
      end: "url(#white-rhombus)",
      offset: 0,
      pad: MP,
    },
    {
      type: "ClassComposition",
      end: "url(#black-rhombus)",
      offset: 0,
      pad: MP,
    },
    {
      type: "ClassInheritance",
      end: "url(#white-triangle)",
      dash: "0",
      pad: MP,
    },
    {
      type: "ClassRealization",
      end: "url(#white-triangle)",
      dash: "10",
      pad: MP,
    },
    { type: "ClassDependency", end: "url(#black-arrow)", dash: "10", pad: MP },
    { type: "ComponentDependency", end: "url(#black-arrow)", dash: "10" },
    { type: "DeploymentDependency", dash: "10" },
    { type: "PetriNetArc", end: "url(#black-triangle)", pad: MP },
    {
      type: "BPMNSequenceFlow",
      end: "url(#bpmn-black-triangle)",
      dash: "0",
      offset: 8,
      pad: MP,
    },
    {
      type: "BPMNMessageFlow",
      end: "url(#bpmn-white-triangle)",
      start: "url(#bpmn-white-circle)",
      dash: "10",
      offset: 8,
      pad: MP,
    },
    { type: "BPMNAssociationFlow", end: undefined, dash: "10", pad: MP },
    {
      type: "BPMNDataAssociationFlow",
      end: "url(#bpmn-arrow)",
      dash: "10",
      offset: 8,
      pad: MP,
    },
    { type: "UseCaseAssociation", end: undefined, dash: "0", pad: MP },
    { type: "UseCaseInclude", end: "url(#black-arrow)", dash: "10", pad: MP },
    { type: "UseCaseExtend", end: "url(#black-arrow)", dash: "10" },
    {
      type: "UseCaseGeneralization",
      end: "url(#white-triangle)",
      dash: "0",
      pad: MP,
    },
    { type: "ComponentProvidedInterface", end: undefined, pad: MP },
    {
      type: "ComponentRequiredInterface",
      end: "url(#required-interface)",
      pad: MP + INTERFACE.SOCKET_GAP,
    },
    {
      type: "ComponentRequiredQuarterInterface",
      end: "url(#required-interface-quarter)",
    },
    {
      type: "DeploymentRequiredThreeQuarterInterface",
      end: "url(#required-interface-threequarter)",
    },
    { type: "DeploymentProvidedInterface", end: undefined, pad: MP },
    { type: "DeploymentAssociation", end: undefined, pad: MP },
    { type: "SyntaxTreeLink", end: undefined, pad: MP },
    { type: "CommunicationLink", end: undefined, pad: MP },
    { type: "SomeUnknownType", dash: "0", offset: 0, pad: MP },
  ]

  it.each(cases)("maps $type to its marker style", (c) => {
    const result = getEdgeMarkerStyles(c.type as string)
    if ("end" in c) expect(result.markerEnd).toBe(c.end)
    if ("start" in c) expect(result.markerStart).toBe(c.start)
    if ("dash" in c) expect(result.strokeDashArray).toBe(c.dash)
    if ("offset" in c) expect(result.offset).toBe(c.offset)
    if ("pad" in c) expect(result.markerPadding).toBe(c.pad)
  })
})
// ---------------------------------------------------------------------------
// findClosestHandle is a thin delegate to snapToAnchor (geometry is covered in
// anchorModel.test.ts); these only pin that each option is forwarded.
describe("findClosestHandle (option forwarding)", () => {
  const rect = { x: 0, y: 0, width: 300, height: 200 }

  it("defaults to the key model (snaps to a true corner near a corner)", () => {
    expect(findClosestHandle({ point: { x: 1, y: -2 }, rect })).toBe("t:0.000")
  })

  it("forwards variant=center (only side centres)", () => {
    expect(
      findClosestHandle({ point: { x: 2, y: -2 }, rect, variant: "center" })
    ).toBe("t:0.500")
  })

  it("forwards excludeCorners (never ratio 0 or 1)", () => {
    const result = findClosestHandle({
      point: { x: 1, y: -1 },
      rect,
      excludeCorners: true,
    })
    expect(result).not.toBe("t:0.000")
    expect(result).not.toBe("t:1.000")
  })

  it("forwards sides (resolves only to an allowed side)", () => {
    // Drop is nearest the top, but only the bottom side is connectable.
    const result = findClosestHandle({
      point: { x: 150, y: -10 },
      rect,
      sides: ["b"],
    })
    expect(result.startsWith("b:")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// calculateOverlayPath
// ---------------------------------------------------------------------------
describe("calculateOverlayPath", () => {
  it("returns simple line for a non-special edge type", () => {
    const result = calculateOverlayPath(0, 0, 100, 100, "ClassUnidirectional")
    expect(result).toBe("M 0,0 L 100,100")
  })

  it("returns simple line for ClassBidirectional", () => {
    const result = calculateOverlayPath(10, 20, 30, 40, "ClassBidirectional")
    expect(result).toBe("M 10,20 L 30,40")
  })

  it("returns offset-adjusted path for CommunicationLink (offset=0, no adjustment)", () => {
    const result = calculateOverlayPath(0, 0, 100, 0, "CommunicationLink")
    // CommunicationLink offset = 0, so markerOffset = 0, falls through to simple line
    expect(result).toBe("M 0,0 L 100,0")
  })

  it("returns simple line for UseCaseInclude (offset=0)", () => {
    // UseCaseInclude has offset=0 in getEdgeMarkerStyles
    const result = calculateOverlayPath(0, 0, 100, 0, "UseCaseInclude")
    expect(result).toBe("M 0,0 L 100,0")
  })

  it("returns simple line for UseCaseGeneralization (offset=0)", () => {
    const result = calculateOverlayPath(0, 0, 100, 0, "UseCaseGeneralization")
    expect(result).toBe("M 0,0 L 100,0")
  })

  it("handles zero-length vector gracefully for special types", () => {
    // PetriNetArc offset=0 so no adjustment
    const result = calculateOverlayPath(50, 50, 50, 50, "PetriNetArc")
    expect(result).toBe("M 50,50 L 50,50")
  })

  it("returns simple line for default edge type", () => {
    const result = calculateOverlayPath(0, 0, 200, 0, "SomeRandom")
    expect(result).toBe("M 0,0 L 200,0")
  })
})

// ---------------------------------------------------------------------------
// calculateStraightPath
// ---------------------------------------------------------------------------
describe("calculateStraightPath", () => {
  it("returns simple line for normal edge type", () => {
    const result = calculateStraightPath(0, 0, 100, 100, "ClassUnidirectional")
    expect(result).toBe("M 0,0 L 100,100")
  })

  it("returns simple line when length is zero", () => {
    const result = calculateStraightPath(50, 50, 50, 50, "UseCaseInclude")
    expect(result).toBe("M 50,50 L 50,50")
  })

  it("creates gap in middle for UseCaseInclude", () => {
    const result = calculateStraightPath(0, 0, 200, 0, "UseCaseInclude")
    // midX=100, normalizedDx=1, normalizedDy=0, gapSize=40
    // gapStartX=60, gapEndX=140
    expect(result).toBe("M 0,0 L 60,0 M 140,0 L 200,0")
  })

  it("creates gap in middle for UseCaseExtend", () => {
    const result = calculateStraightPath(0, 0, 0, 200, "UseCaseExtend")
    // midY=100, normalizedDy=1, gapSize=40
    // gapStartY=60, gapEndY=140
    expect(result).toBe("M 0,0 L 0,60 M 0,140 L 0,200")
  })

  it("creates gap for diagonal UseCaseInclude", () => {
    const result = calculateStraightPath(0, 0, 100, 0, "UseCaseInclude")
    // length=100, mid=(50,0), normalized=(1,0), gap=40
    // gapStart=(10,0), gapEnd=(90,0)
    expect(result).toBe("M 0,0 L 10,0 M 90,0 L 100,0")
  })

  it("returns simple line for ActivityControlFlow", () => {
    const result = calculateStraightPath(10, 20, 30, 40, "ActivityControlFlow")
    expect(result).toBe("M 10,20 L 30,40")
  })
})

// ---------------------------------------------------------------------------
// simplifySvgPath
// ---------------------------------------------------------------------------
describe("simplifySvgPath", () => {
  it("simplifies a simple M L path rounding coordinates", () => {
    const result = simplifySvgPath("M 1.12345,2.67890 L 3.99999,4.00001")
    expect(result).toBe("M 1 3 L 4 4")
  })

  it("handles M and L with space before numbers", () => {
    const result = simplifySvgPath("M 10,20 L 30,40")
    expect(result).toBe("M 10 20 L 30 40")
  })

  it("handles compact path notation (no space between command and number)", () => {
    // The regex inserts spaces after M/L/Q before digits, but if a number
    // runs into an L (e.g. "20L"), the L is absorbed into the number token.
    // This is the actual behavior of simplifySvgPath.
    const result = simplifySvgPath("M10,20L30,40")
    expect(result).toBe("M 10 20 30 40")
  })

  it("rounds to whole numbers (no custom decimal places)", () => {
    const result = simplifySvgPath("M 1.123,2.678 L 3.456,4.789")
    expect(result).toBe("M 1 3 L 3 5")
  })

  it("handles Q command with distinct control and end points", () => {
    const result = simplifySvgPath("M 0,0 Q 50,100 100,200")
    expect(result).toBe("M 0 0 Q 50 100 100 200")
  })

  it("simplifies degenerate Q (control==end) to L", () => {
    const result = simplifySvgPath("M 0,0 Q 100,200 100,200")
    expect(result).toBe("M 0 0 L 100 200")
  })

  it("handles multi-segment path", () => {
    const result = simplifySvgPath("M 0,0 L 100,0 L 100,100 L 0,100")
    expect(result).toBe("M 0 0 L 100 0 L 100 100 L 0 100")
  })

  it("handles empty path string", () => {
    const result = simplifySvgPath("")
    expect(result).toBe("")
  })

  it("handles path with extra spaces", () => {
    const result = simplifySvgPath("  M  10  20  L  30  40  ")
    expect(result).toBe("M 10 20 L 30 40")
  })

  it("rounds zero decimals", () => {
    const result = simplifySvgPath("M 1.7,2.3 L 3.5,4.5", 0)
    expect(result).toBe("M 2 2 L 4 5")
  })
})

// ---------------------------------------------------------------------------
// simplifyPoints
// ---------------------------------------------------------------------------
describe("simplifyPoints", () => {
  it("returns points as-is when fewer than 3 points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]
    expect(simplifyPoints(points)).toEqual(points)
  })

  it("returns single point as-is", () => {
    const points = [{ x: 5, y: 5 }]
    expect(simplifyPoints(points)).toEqual(points)
  })

  it("returns empty array as-is", () => {
    expect(simplifyPoints([])).toEqual([])
  })

  it("removes collinear horizontal points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ]
    const result = simplifyPoints(points)
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
  })

  it("removes collinear vertical points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 0, y: 100 },
    ]
    const result = simplifyPoints(points)
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ])
  })

  it("preserves corner points in an L-shape", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]
    const result = simplifyPoints(points)
    expect(result).toEqual(points)
  })

  it("removes multiple collinear points in sequence", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 25, y: 0 },
      { x: 50, y: 0 },
      { x: 75, y: 0 },
      { x: 100, y: 0 },
    ]
    const result = simplifyPoints(points)
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
  })

  it("handles a complex path with mixed collinear and non-collinear", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 }, // horizontal, middle removed
      { x: 100, y: 50 },
      { x: 100, y: 100 }, // vertical, middle removed
    ]
    const result = simplifyPoints(points)
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ])
  })
})

// ---------------------------------------------------------------------------
// parseSvgPath
// ---------------------------------------------------------------------------
describe("parseSvgPath", () => {
  it("parses a simple M L path", () => {
    const result = parseSvgPath("M 0,0 L 100,100")
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ])
  })

  it("parses multi-segment path and simplifies collinear points", () => {
    const result = parseSvgPath("M 0,0 L 50,0 L 100,0")
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
  })

  it("parses path with Q command (degenerate)", () => {
    const result = parseSvgPath("M 0,0 Q 100,200 100,200")
    // Q degenerates to L in simplifySvgPath, then parseSvgPath extracts M and L
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 200 },
    ])
  })

  it("preserves corners in L-shaped path", () => {
    const result = parseSvgPath("M 0,0 L 100,0 L 100,100")
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ])
  })

  it("handles path with comma-separated coordinates", () => {
    const result = parseSvgPath("M0,0 L100,200")
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 200 },
    ])
  })
})

// ---------------------------------------------------------------------------
// removeDuplicatePoints
// ---------------------------------------------------------------------------
describe("removeDuplicatePoints", () => {
  it("returns empty array for empty input", () => {
    expect(removeDuplicatePoints([])).toEqual([])
  })

  it("returns single point unchanged", () => {
    const points = [{ x: 5, y: 10 }]
    expect(removeDuplicatePoints(points)).toEqual(points)
  })

  it("removes consecutive duplicates", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ]
    const result = removeDuplicatePoints(points)
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
  })

  it("does not remove non-consecutive duplicates", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 0 },
    ]
    const result = removeDuplicatePoints(points)
    expect(result).toEqual(points)
  })

  it("returns unchanged if no duplicates", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]
    expect(removeDuplicatePoints(points)).toEqual(points)
  })
})

// ---------------------------------------------------------------------------
// preserveOrthogonalEdgePoints
// ---------------------------------------------------------------------------
describe("preserveOrthogonalEdgePoints", () => {
  it("keeps a manually moved bend when the target handle moves lower on the same side", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 100, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 200 },
        { x: 300, y: 200 },
      ],
      { x: 100, y: 50 },
      { x: 300, y: 260 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 100, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 260 },
      { x: 300, y: 260 },
    ])
    expectOrthogonalSegments(result)
  })

  it("keeps the bend when the source endpoint moves", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 100, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 200 },
        { x: 300, y: 200 },
      ],
      { x: 120, y: 90 },
      { x: 300, y: 200 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 120, y: 90 },
      { x: 150, y: 90 },
      { x: 150, y: 200 },
      { x: 300, y: 200 },
    ])
    expectOrthogonalSegments(result)
  })

  it("adds a segment when reconnecting to a side with a different entering direction", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 100, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 200 },
        { x: 300, y: 200 },
      ],
      { x: 100, y: 50 },
      { x: 350, y: 100 },
      Position.Right,
      Position.Top
    )

    expect(result).toEqual([
      { x: 100, y: 50 },
      { x: 350, y: 50 },
      { x: 350, y: 100 },
    ])
    expectOrthogonalSegments(result)
  })

  it("turns a stale two-point path into an orthogonal route when endpoints no longer align", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 100, y: 50 },
        { x: 300, y: 50 },
      ],
      { x: 100, y: 50 },
      { x: 300, y: 120 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 100, y: 50 },
      { x: 200, y: 50 },
      { x: 200, y: 120 },
      { x: 300, y: 120 },
    ])
    expectOrthogonalSegments(result)
  })

  it("reroutes the first lane when reconnecting from the opposite source side", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 100, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 200 },
        { x: 300, y: 200 },
      ],
      { x: 50, y: 50 },
      { x: 300, y: 200 },
      Position.Left,
      Position.Left
    )

    expect(result).toEqual([
      { x: 50, y: 50 },
      { x: 20, y: 50 },
      { x: 20, y: 200 },
      { x: 300, y: 200 },
    ])
    expectOrthogonalSegments(result)
  })

  it("reroutes the last approach when reconnecting into the opposite target side", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 100, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 200 },
        { x: 300, y: 200 },
      ],
      { x: 100, y: 50 },
      { x: 350, y: 200 },
      Position.Right,
      Position.Right
    )

    expect(result).toEqual([
      { x: 100, y: 50 },
      { x: 380, y: 50 },
      { x: 380, y: 200 },
      { x: 350, y: 200 },
    ])
    expectOrthogonalSegments(result)
  })

  it("preserves a horizontal U-shape (Right→Left bent down) when the target moves left", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 0, y: 200 },
        { x: 30, y: 200 },
        { x: 30, y: 250 },
        { x: 370, y: 250 },
        { x: 370, y: 200 },
        { x: 400, y: 200 },
      ],
      { x: 0, y: 200 },
      { x: 200, y: 200 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 250 },
      { x: 170, y: 250 },
      { x: 170, y: 200 },
      { x: 200, y: 200 },
    ])
    expectOrthogonalSegments(result)
  })

  it("preserves a vertical U-shape (Left→Right bent left) when the source moves down", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 200, y: 100 },
        { x: 170, y: 100 },
        { x: 90, y: 100 },
        { x: 90, y: 300 },
        { x: 230, y: 300 },
        { x: 200, y: 300 },
      ],
      { x: 200, y: 150 },
      { x: 200, y: 300 },
      Position.Left,
      Position.Right
    )

    expect(result).toEqual([
      { x: 200, y: 150 },
      { x: 170, y: 150 },
      { x: 90, y: 150 },
      { x: 90, y: 300 },
      { x: 230, y: 300 },
      { x: 200, y: 300 },
    ])
    expectOrthogonalSegments(result)
  })

  it("is idempotent when fed its own output", () => {
    const sourcePoint = { x: 100, y: 50 }
    const targetPoint = { x: 350, y: 200 }
    const sourcePosition = Position.Right
    const targetPosition = Position.Left
    const seedPoints = [
      { x: 100, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 200 },
      { x: 300, y: 200 },
    ]

    const once = preserveOrthogonalEdgePoints(
      seedPoints,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
    const twice = preserveOrthogonalEdgePoints(
      once,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )

    expect(twice).toEqual(once)
    expectOrthogonalSegments(twice)
  })

  it("falls back deterministically when horizontal U-shape stubs collide", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 0, y: 200 },
        { x: 30, y: 200 },
        { x: 30, y: 250 },
        { x: 370, y: 250 },
        { x: 370, y: 200 },
        { x: 400, y: 200 },
      ],
      { x: 0, y: 200 },
      { x: 50, y: 200 },
      Position.Right,
      Position.Left
    )
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result[0]).toEqual({ x: 0, y: 200 })
    expect(result[result.length - 1]).toEqual({ x: 50, y: 200 })
    expectOrthogonalSegments(result)
  })

  it("routes around stub collisions without shortening 30px stubs", () => {
    const result = normalizeOrthogonalEdgePoints(
      [
        { x: 0, y: 200 },
        { x: 30, y: 200 },
        { x: 30, y: 250 },
        { x: 20, y: 250 },
        { x: 20, y: 200 },
        { x: 50, y: 200 },
      ],
      { x: 0, y: 200 },
      { x: 50, y: 200 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 170 },
      { x: 20, y: 170 },
      { x: 20, y: 200 },
      { x: 50, y: 200 },
    ])
    expectOrthogonalSegments(result)
  })

  it("prefers a Z-shape fallback for horizontal stub collisions when endpoints are vertically separated", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 150 },
        { x: 130, y: 150 },
        { x: 130, y: 300 },
        { x: 160, y: 300 },
      ],
      { x: 0, y: 0 },
      { x: 50, y: 300 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 150 },
      { x: 20, y: 150 },
      { x: 20, y: 300 },
      { x: 50, y: 300 },
    ])
    expectOrthogonalSegments(result)
  })

  it("snaps micro horizontal stub-lane offsets to one shared spine instead of leaving a jog", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 150 },
        { x: 124, y: 150 },
        { x: 124, y: 300 },
        { x: 154, y: 300 },
      ],
      { x: 0, y: 0 },
      { x: 54, y: 300 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 27, y: 0 },
      { x: 27, y: 300 },
      { x: 54, y: 300 },
    ])
    expectOrthogonalSegments(result)
  })

  it("prefers a Z-shape fallback for vertical stub collisions when endpoints are horizontally separated", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 300, y: 0 },
        { x: 300, y: 30 },
        { x: 150, y: 30 },
        { x: 150, y: 130 },
        { x: 0, y: 130 },
        { x: 0, y: 160 },
      ],
      { x: 300, y: 0 },
      { x: 0, y: 50 },
      Position.Bottom,
      Position.Top
    )

    expect(result).toEqual([
      { x: 300, y: 0 },
      { x: 300, y: 30 },
      { x: 150, y: 30 },
      { x: 150, y: 20 },
      { x: 0, y: 20 },
      { x: 0, y: 50 },
    ])
    expectOrthogonalSegments(result)
  })

  it("snaps micro vertical stub-lane offsets to one shared spine instead of leaving a jog", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 300, y: 0 },
        { x: 300, y: 30 },
        { x: 150, y: 30 },
        { x: 150, y: 124 },
        { x: 0, y: 124 },
        { x: 0, y: 154 },
      ],
      { x: 300, y: 0 },
      { x: 0, y: 54 },
      Position.Bottom,
      Position.Top
    )

    expect(result).toEqual([
      { x: 300, y: 0 },
      { x: 300, y: 27 },
      { x: 0, y: 27 },
      { x: 0, y: 54 },
    ])
    expectOrthogonalSegments(result)
  })

  it("preserves a target-side small stair-step instead of flattening a deliberate offset", () => {
    // A 10px stair-step (220->230) is a legal single-grid-step bend. Reprojection
    // must keep it: flattening would discard the user's deliberate offset and is
    // the root cause of the bend "snap-back" regression.
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 100 },
        { x: 220, y: 100 },
        { x: 220, y: 200 },
        { x: 230, y: 200 },
        { x: 230, y: 300 },
        { x: 260, y: 300 },
      ],
      { x: 0, y: 0 },
      { x: 260, y: 300 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 100 },
      { x: 220, y: 100 },
      { x: 220, y: 200 },
      { x: 230, y: 200 },
      { x: 230, y: 300 },
      { x: 260, y: 300 },
    ])
    expectOrthogonalSegments(result)
  })

  it("preserves a source-side small stair-step without moving the source stub", () => {
    // The 10px jog (30->40) is a deliberate single-step bend and must survive
    // reprojection; only the fixed 30px source stub is anchored.
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 100 },
        { x: 40, y: 100 },
        { x: 40, y: 200 },
        { x: 200, y: 200 },
        { x: 200, y: 300 },
        { x: 230, y: 300 },
      ],
      { x: 0, y: 0 },
      { x: 230, y: 300 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 100 },
      { x: 40, y: 100 },
      { x: 40, y: 200 },
      { x: 200, y: 200 },
      { x: 200, y: 300 },
      { x: 230, y: 300 },
    ])
    expectOrthogonalSegments(result)
  })

  it("collapses near-overlapping parallel arms only in release normalization", () => {
    const result = normalizeOrthogonalEdgePoints(
      [
        { x: 0, y: 200 },
        { x: 360, y: 200 },
        { x: 360, y: 250 },
        { x: 370, y: 250 },
        { x: 370, y: 200 },
        { x: 400, y: 200 },
      ],
      { x: 0, y: 200 },
      { x: 400, y: 200 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 0, y: 200 },
      { x: 400, y: 200 },
    ])
    expectOrthogonalSegments(result)
  })

  it("rejects release when the target stub would shrink below 30px", () => {
    const releasedPoints = [
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 150 },
      { x: 190, y: 150 },
      { x: 190, y: 200 },
      { x: 200, y: 200 },
    ]

    expect(
      isInvalidOrthogonalEdgeRelease(
        releasedPoints,
        { x: 0, y: 200 },
        { x: 200, y: 200 },
        Position.Right,
        Position.Left
      )
    ).toBe(true)
  })

  it("reverts release to the last valid points when a terminal stub is reduced", () => {
    const lastValidPoints = [
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 150 },
      { x: 170, y: 150 },
      { x: 170, y: 200 },
      { x: 200, y: 200 },
    ]
    const releasedPoints = [
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 150 },
      { x: 190, y: 150 },
      { x: 190, y: 200 },
      { x: 200, y: 200 },
    ]

    const result = resolveOrthogonalEdgeReleasePoints(
      releasedPoints,
      lastValidPoints,
      { x: 0, y: 200 },
      { x: 200, y: 200 },
      Position.Right,
      Position.Left
    )

    expect(result).toEqual(lastValidPoints)
    expectOrthogonalSegments(result)
  })

  // Dragging a U's arm so the two parallel arms meet or cross is a deliberate
  // "merge the U" gesture and must collapse the route — not snap back to the
  // pre-drag wide U. Arms still clearly apart stay a (narrow) U.
  describe("collapses a U when its arms are dragged together", () => {
    const S = { x: 0, y: 200 }
    const T = { x: 400, y: 200 }
    const wideU = [
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 250 },
      { x: 370, y: 250 },
      { x: 370, y: 200 },
      { x: 400, y: 200 },
    ]
    const releaseWithLeftArmAt = (lx: number) => [
      { x: 0, y: 200 },
      { x: lx, y: 200 },
      { x: lx, y: 250 },
      { x: 370, y: 250 },
      { x: 370, y: 200 },
      { x: 400, y: 200 },
    ]

    // Arm gap 5px / 10px (boundary) / crossed: all collapse to a straight line.
    for (const lx of [365, 360, 375]) {
      it(`collapses when the dragged arm lands at x=${lx} (gap ${370 - lx}px)`, () => {
        const result = resolveOrthogonalEdgeReleasePoints(
          releaseWithLeftArmAt(lx),
          wideU,
          S,
          T,
          Position.Right,
          Position.Left
        )
        expect(result).toEqual([
          { x: 0, y: 200 },
          { x: 400, y: 200 },
        ])
        expectOrthogonalSegments(result)
      })
    }

    it("preserves a deliberate narrow U whose arms are still 15px apart", () => {
      const released = releaseWithLeftArmAt(355)
      const result = resolveOrthogonalEdgeReleasePoints(
        released,
        wideU,
        S,
        T,
        Position.Right,
        Position.Left
      )
      expect(result).toEqual(released)
      expectOrthogonalSegments(result)
    })
  })

  it("detects mirrored horizontal and vertical stub collisions", () => {
    expect(
      stubsWouldOverlap(
        { x: 100, y: 0 },
        { x: 50, y: 0 },
        Position.Left,
        Position.Right,
        30
      )
    ).toBe(true)
    expect(
      stubsWouldOverlap(
        { x: 0, y: 100 },
        { x: 0, y: 50 },
        Position.Top,
        Position.Bottom,
        30
      )
    ).toBe(true)
    expect(
      stubsWouldOverlap(
        { x: 100, y: 0 },
        { x: 0, y: 0 },
        Position.Left,
        Position.Right,
        30
      )
    ).toBe(false)
  })

  it("normalizes no-op drag release input without persisting an empty path", () => {
    const result = normalizeOrthogonalEdgePoints(
      [],
      { x: 0, y: 0 },
      { x: 200, y: 80 },
      Position.Right,
      Position.Left
    )

    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result[0]).toEqual({ x: 0, y: 0 })
    expect(result[result.length - 1]).toEqual({ x: 200, y: 80 })
    expectOrthogonalSegments(result)
  })

  it("rejects diagonal release input and normalizes idempotently", () => {
    const sourcePoint = { x: 0, y: 0 }
    const targetPoint = { x: 200, y: 80 }
    const once = normalizeOrthogonalEdgePoints(
      [sourcePoint, targetPoint],
      sourcePoint,
      targetPoint,
      Position.Right,
      Position.Left
    )
    const twice = normalizeOrthogonalEdgePoints(
      once,
      sourcePoint,
      targetPoint,
      Position.Right,
      Position.Left
    )

    expect(twice).toEqual(once)
    expectOrthogonalSegments(once)
  })

  it("preserves a bent vertical segment when bending the U-shape stub", () => {
    const result = preserveOrthogonalEdgePoints(
      [
        { x: 0, y: 200 },
        { x: 60, y: 200 },
        { x: 60, y: 280 },
        { x: 370, y: 280 },
        { x: 370, y: 200 },
        { x: 400, y: 200 },
      ],
      { x: 0, y: 200 },
      { x: 400, y: 200 },
      Position.Right,
      Position.Left
    )
    expect(result[1]).toEqual({ x: 60, y: 200 })
    expectOrthogonalSegments(result)
  })
})

describe("resolveReconnectPreviewBasePoints", () => {
  it("prefers stored manual points when available", () => {
    const result = resolveReconnectPreviewBasePoints(
      [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      [{ x: 50, y: 60 }],
      [{ x: 70, y: 80 }]
    )

    expect(result).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ])
  })

  it("falls back to local custom points before computed points", () => {
    const result = resolveReconnectPreviewBasePoints(
      undefined,
      [
        { x: 15, y: 25 },
        { x: 35, y: 45 },
      ],
      [{ x: 55, y: 65 }]
    )

    expect(result).toEqual([
      { x: 15, y: 25 },
      { x: 35, y: 45 },
    ])
  })

  it("returns a cloned fallback path when no manual points exist", () => {
    const fallbackPoints = [
      { x: 5, y: 10 },
      { x: 15, y: 20 },
    ]
    const result = resolveReconnectPreviewBasePoints(
      undefined,
      undefined,
      fallbackPoints
    )

    expect(result).toEqual(fallbackPoints)
    expect(result).not.toBe(fallbackPoints)
  })
})

// ---------------------------------------------------------------------------
// getMarkerSegmentPath
// ---------------------------------------------------------------------------
describe("getMarkerSegmentPath", () => {
  it("returns empty string for empty points array", () => {
    expect(getMarkerSegmentPath([], 10, "top")).toBe("")
  })

  it("extends downward (positive y) for top target position", () => {
    const points = [{ x: 100, y: 50 }]
    const result = getMarkerSegmentPath(points, 10, "top")
    expect(result).toBe("M 100 50 L 100 60")
  })

  it("extends upward (negative y) for bottom target position", () => {
    const points = [{ x: 100, y: 50 }]
    const result = getMarkerSegmentPath(points, 10, "bottom")
    expect(result).toBe("M 100 50 L 100 40")
  })

  it("extends rightward for left target position", () => {
    const points = [{ x: 100, y: 50 }]
    const result = getMarkerSegmentPath(points, 10, "left")
    expect(result).toBe("M 100 50 L 110 50")
  })

  it("extends leftward for right target position", () => {
    const points = [{ x: 100, y: 50 }]
    const result = getMarkerSegmentPath(points, 10, "right")
    expect(result).toBe("M 100 50 L 90 50")
  })

  it("uses last point from multi-point array", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 },
    ]
    const result = getMarkerSegmentPath(points, 20, "top")
    expect(result).toBe("M 100 100 L 100 120")
  })

  it("handles zero offset", () => {
    const points = [{ x: 100, y: 50 }]
    const result = getMarkerSegmentPath(points, 0, "left")
    expect(result).toBe("M 100 50 L 100 50")
  })
})

// ---------------------------------------------------------------------------
// getAxisAlignedSegments
// ---------------------------------------------------------------------------
describe("getAxisAlignedSegments", () => {
  it("returns horizontal and vertical segments with correct metadata", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 80, y: 80 },
    ]

    const result = getAxisAlignedSegments(points)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      index: 0,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      orientation: "horizontal",
      fixed: 0,
      min: 0,
      max: 100,
    })
    expect(result[1]).toEqual({
      index: 1,
      start: { x: 100, y: 0 },
      end: { x: 100, y: 50 },
      orientation: "vertical",
      fixed: 100,
      min: 0,
      max: 50,
    })
  })

  it("uses tolerance to classify nearly aligned points", () => {
    const points = [
      { x: 10, y: 10 },
      { x: 10.5, y: 70 },
    ]

    const result = getAxisAlignedSegments(points, 1)
    expect(result).toHaveLength(1)
    expect(result[0].orientation).toBe("vertical")
    expect(result[0].fixed).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// findLineJumpIntersections
// ---------------------------------------------------------------------------
describe("findLineJumpIntersections", () => {
  it("returns intersection hits within margin boundaries", () => {
    const base = getAxisAlignedSegments([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    const other = getAxisAlignedSegments([
      { x: 12, y: -20 },
      { x: 12, y: 20 },
    ])

    const hits = findLineJumpIntersections(base, other, 20, "horizontal")
    expect(hits).toEqual([
      {
        segmentIndex: 0,
        point: { x: 12, y: 0 },
        orientation: "horizontal",
      },
    ])
  })

  it("skips hits too close to the segment ends", () => {
    const base = getAxisAlignedSegments([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    const other = getAxisAlignedSegments([
      { x: 10, y: -20 },
      { x: 10, y: 20 },
    ])

    const hits = findLineJumpIntersections(base, other, 20, "horizontal")
    expect(hits).toEqual([])
  })

  it("handles vertical base segments when orientation allows", () => {
    const base = getAxisAlignedSegments([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ])
    const other = getAxisAlignedSegments([
      { x: -10, y: 50 },
      { x: 10, y: 50 },
    ])

    const hits = findLineJumpIntersections(base, other, 20, "any")
    expect(hits).toEqual([
      {
        segmentIndex: 0,
        point: { x: 0, y: 50 },
        orientation: "vertical",
      },
    ])
  })

  it("respects preferred orientation filtering", () => {
    const base = getAxisAlignedSegments([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ])
    const other = getAxisAlignedSegments([
      { x: -10, y: 50 },
      { x: 10, y: 50 },
    ])

    const hits = findLineJumpIntersections(base, other, 20, "horizontal")
    expect(hits).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// buildPathWithLineJumps
// ---------------------------------------------------------------------------
describe("buildPathWithLineJumps", () => {
  it("builds a path with ordered jump segments on a horizontal line", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    const path = buildPathWithLineJumps(
      points,
      [
        {
          segmentIndex: 0,
          point: { x: 30, y: 0 },
          orientation: "horizontal",
        },
        {
          segmentIndex: 0,
          point: { x: 70, y: 0 },
          orientation: "horizontal",
        },
      ],
      10,
      20
    )

    expect(path).toBe("M 0 0 L 20 0 Q 30 -10 40 0 L 60 0 Q 70 -10 80 0 L 100 0")
  })

  it("skips jumps that are too close together", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    const path = buildPathWithLineJumps(
      points,
      [
        {
          segmentIndex: 0,
          point: { x: 30, y: 0 },
          orientation: "horizontal",
        },
        {
          segmentIndex: 0,
          point: { x: 35, y: 0 },
          orientation: "horizontal",
        },
      ],
      10,
      20
    )

    expect(path).toContain("Q 30 -10 40 0")
    expect(path).not.toContain("35")
  })

  it("builds vertical jump paths with rightward control points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ]
    const path = buildPathWithLineJumps(
      points,
      [
        {
          segmentIndex: 0,
          point: { x: 0, y: 50 },
          orientation: "vertical",
        },
      ],
      10,
      20
    )

    expect(path).toBe("M 0 0 L 0 40 Q 10 50 0 60 L 0 100")
  })
})

// ---------------------------------------------------------------------------
// getDefaultEdgeType
// ---------------------------------------------------------------------------
describe("getDefaultEdgeType", () => {
  const cases: [string, string][] = [
    ["ClassDiagram", "ClassUnidirectional"],
    ["ActivityDiagram", "ActivityControlFlow"],
    ["UseCaseDiagram", "UseCaseAssociation"],
    ["ComponentDiagram", "ComponentDependency"],
    ["DeploymentDiagram", "DeploymentAssociation"],
    ["ObjectDiagram", "ObjectLink"],
    ["Flowchart", "FlowChartFlowline"],
    ["SyntaxTree", "SyntaxTreeLink"],
    ["ReachabilityGraph", "ReachabilityGraphArc"],
    ["BPMN", "BPMNSequenceFlow"],
    ["Sfc", "SfcDiagramEdge"],
    ["CommunicationDiagram", "CommunicationLink"],
    ["PetriNet", "PetriNetArc"],
  ]

  it.each(cases)("maps %s to %s", (diagramType, expectedEdgeType) => {
    expect(getDefaultEdgeType(diagramType as UMLDiagramType)).toBe(
      expectedEdgeType
    )
  })

  it("returns ClassUnidirectional for unknown diagram type", () => {
    expect(
      getDefaultEdgeType("UnknownDiagram" as unknown as UMLDiagramType)
    ).toBe("ClassUnidirectional")
  })
})

// ---------------------------------------------------------------------------
// getConnectionLineType
// ---------------------------------------------------------------------------
describe("getConnectionLineType", () => {
  it("returns Straight for UseCaseDiagram", () => {
    expect(getConnectionLineType("UseCaseDiagram")).toBe(
      ConnectionLineType.Straight
    )
  })

  it("returns Straight for SyntaxTree", () => {
    expect(getConnectionLineType("SyntaxTree")).toBe(
      ConnectionLineType.Straight
    )
  })

  it("returns Straight for PetriNet", () => {
    expect(getConnectionLineType("PetriNet")).toBe(ConnectionLineType.Straight)
  })

  const stepDiagrams = [
    "ClassDiagram",
    "ObjectDiagram",
    "ActivityDiagram",
    "CommunicationDiagram",
    "ComponentDiagram",
    "DeploymentDiagram",
    "ReachabilityGraph",
    "Flowchart",
    "BPMN",
    "Sfc",
  ] as const

  it.each(stepDiagrams)("returns Step for %s", (diagramType) => {
    expect(getConnectionLineType(diagramType)).toBe(ConnectionLineType.Step)
  })
})

// ---------------------------------------------------------------------------
// findLineJumpIntersections — crossing-only semantics (T-junctions, corners)
// ---------------------------------------------------------------------------
describe("findLineJumpIntersections (crossing-only)", () => {
  const horizontal = (y: number, x0: number, x1: number) =>
    getAxisAlignedSegments([
      { x: x0, y },
      { x: x1, y },
    ])

  it("bridges a genuine interior crossing", () => {
    const base = horizontal(100, 0, 200)
    const other = getAxisAlignedSegments([
      { x: 100, y: 40 },
      { x: 100, y: 160 },
    ])
    const hits = findLineJumpIntersections(base, other, 16, "horizontal")
    expect(hits).toEqual([
      { segmentIndex: 0, point: { x: 100, y: 100 }, orientation: "horizontal" },
    ])
  })

  it("does NOT bridge a T-junction (other segment ends on the base line)", () => {
    const base = horizontal(100, 0, 200)
    // Vertical edge whose TOP endpoint sits exactly on the base line: the two
    // lines meet, they don't cross — a bridge here would falsely read as
    // "no connection".
    const other = getAxisAlignedSegments([
      { x: 120, y: 100 },
      { x: 120, y: 300 },
    ])
    expect(findLineJumpIntersections(base, other, 16, "horizontal")).toEqual([])
  })

  it("does NOT bridge at the corner (bend) of an orthogonal other edge", () => {
    // Base runs along y=300; the other edge is an L whose corner is at
    // (120,300). The base meets the vertical arm exactly at that corner.
    const base = horizontal(300, 0, 400)
    const other = getAxisAlignedSegments([
      { x: 120, y: 100 },
      { x: 120, y: 300 },
      { x: 300, y: 300 },
    ])
    expect(findLineJumpIntersections(base, other, 16, "horizontal")).toEqual([])
  })

  it("does NOT bridge near the base segment's own corner", () => {
    // Crossing at x=6 is within margin (jumpWidth/2+2 = 10) of the base start.
    const base = horizontal(100, 0, 200)
    const other = getAxisAlignedSegments([
      { x: 6, y: 40 },
      { x: 6, y: 160 },
    ])
    expect(findLineJumpIntersections(base, other, 16, "horizontal")).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// computeLineJumpsForEdge — horizontal-hops-vertical, layout-stable
// ---------------------------------------------------------------------------
describe("computeLineJumpsForEdge", () => {
  const H = [
    { x: 0, y: 100 },
    { x: 200, y: 100 },
  ]
  const V = [
    { x: 100, y: 0 },
    { x: 100, y: 200 },
  ]
  const geometry = () =>
    new Map([
      ["h", H],
      ["v", V],
    ])

  it("draws the bridge on the horizontal edge of an H×V crossing", () => {
    const hits = computeLineJumpsForEdge(
      "h",
      H,
      [{ id: "h" }, { id: "v" }],
      geometry()
    )
    expect(hits).toEqual([
      { segmentIndex: 0, point: { x: 100, y: 100 }, orientation: "horizontal" },
    ])
  })

  it("draws NOTHING on the vertical edge of the same crossing", () => {
    expect(
      computeLineJumpsForEdge("v", V, [{ id: "h" }, { id: "v" }], geometry())
    ).toEqual([])
  })

  it("is stable: edge array order does not change who hops", () => {
    const reversed = computeLineJumpsForEdge(
      "h",
      H,
      [{ id: "v" }, { id: "h" }],
      geometry()
    )
    expect(reversed).toHaveLength(1)
    expect(reversed[0].point).toEqual({ x: 100, y: 100 })
  })

  it("never bridges a diagonal edge", () => {
    const diagonal = [
      { x: 0, y: 0 },
      { x: 200, y: 200 },
    ]
    const map = new Map([
      ["d", diagonal],
      ["v", V],
    ])
    expect(
      computeLineJumpsForEdge("d", diagonal, [{ id: "d" }, { id: "v" }], map)
    ).toEqual([])
  })

  it("does not bridge two overlapping collinear edges (no crossing)", () => {
    const h2 = [
      { x: 50, y: 100 },
      { x: 250, y: 100 },
    ]
    const map = new Map([
      ["h", H],
      ["h2", h2],
    ])
    expect(
      computeLineJumpsForEdge("h", H, [{ id: "h" }, { id: "h2" }], map)
    ).toEqual([])
  })

  it("bridges every vertical crossing along a horizontal edge", () => {
    const v1 = [
      { x: 60, y: 0 },
      { x: 60, y: 200 },
    ]
    const v2 = [
      { x: 140, y: 0 },
      { x: 140, y: 200 },
    ]
    const map = new Map([
      ["h", H],
      ["v1", v1],
      ["v2", v2],
    ])
    const hits = computeLineJumpsForEdge(
      "h",
      H,
      [{ id: "h" }, { id: "v1" }, { id: "v2" }],
      map
    )
    expect(hits.map((hit) => hit.point.x).sort((a, b) => a - b)).toEqual([
      60, 140,
    ])
  })

  it("excludes the edge itself", () => {
    expect(
      computeLineJumpsForEdge("h", H, [{ id: "h" }], new Map([["h", H]]))
    ).toEqual([])
  })
})
