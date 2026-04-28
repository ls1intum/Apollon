import { EDGES, INTERFACE } from "@/constants"
import type { UMLDiagramType } from "@/types/DiagramType"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  calculateDynamicEdgeLabels,
  calculateInnerMidpoints,
  calculateOverlayPath,
  calculateStraightPath,
  alignCustomPathEndpointSegments,
  calculateStraightPathDetourRange,
  calculateStraightPathBreakpoints,
  createStraightPathDetour,
  calculateTextPlacement,
  findClosestHandle,
  getConnectionLineType,
  getDefaultEdgeType,
  getEdgeMarkerStyles,
  getMarkerSegmentPath,
  getStraightPathOrientation,
  orthogonalizePoints,
  parseSvgPath,
  removeDuplicatePoints,
  simplifyPoints,
  simplifySvgPath,
} from "@/utils/edgeUtils"
import { ConnectionLineType, Position } from "@xyflow/react"
import { describe, expect, it } from "vitest"

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
// calculateTextPlacement
// ---------------------------------------------------------------------------
describe("calculateTextPlacement", () => {
  it("returns correct offsets for top position", () => {
    const result = calculateTextPlacement(100, 200, Position.Top)
    expect(result).toEqual({
      roleX: 90,
      roleY: 185,
      multiplicityX: 110,
      multiplicityY: 185,
    })
  })

  it("returns correct offsets for right position", () => {
    const result = calculateTextPlacement(100, 200, Position.Right)
    expect(result).toEqual({
      roleX: 115,
      roleY: 190,
      multiplicityX: 115,
      multiplicityY: 215,
    })
  })

  it("returns correct offsets for bottom position", () => {
    const result = calculateTextPlacement(100, 200, Position.Bottom)
    expect(result).toEqual({
      roleX: 90,
      roleY: 215,
      multiplicityX: 110,
      multiplicityY: 215,
    })
  })

  it("returns correct offsets for left position", () => {
    const result = calculateTextPlacement(100, 200, Position.Left)
    expect(result).toEqual({
      roleX: 85,
      roleY: 190,
      multiplicityX: 85,
      multiplicityY: 215,
    })
  })

  it("works with zero coordinates", () => {
    const result = calculateTextPlacement(0, 0, Position.Top)
    expect(result).toEqual({
      roleX: -10,
      roleY: -15,
      multiplicityX: 10,
      multiplicityY: -15,
    })
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
  // No marker, plain line group
  it("returns plain style for ClassBidirectional", () => {
    const result = getEdgeMarkerStyles("ClassBidirectional")
    expect(result.markerEnd).toBeUndefined()
    expect(result.markerStart).toBeUndefined()
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("0")
    expect(result.offset).toBe(0)
  })

  it("returns plain style for ObjectLink", () => {
    const result = getEdgeMarkerStyles("ObjectLink")
    expect(result.markerEnd).toBeUndefined()
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
  })

  // Arrow marker group
  it("returns black-arrow for ClassUnidirectional", () => {
    const result = getEdgeMarkerStyles("ClassUnidirectional")
    expect(result.markerEnd).toBe("url(#black-arrow)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("0")
  })

  it("returns black-arrow for ActivityControlFlow", () => {
    const result = getEdgeMarkerStyles("ActivityControlFlow")
    expect(result.markerEnd).toBe("url(#black-arrow)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
  })

  it("returns black-arrow for FlowChartFlowline", () => {
    const result = getEdgeMarkerStyles("FlowChartFlowline")
    expect(result.markerEnd).toBe("url(#black-arrow)")
  })

  it("returns black-arrow for ReachabilityGraphArc", () => {
    const result = getEdgeMarkerStyles("ReachabilityGraphArc")
    expect(result.markerEnd).toBe("url(#black-arrow)")
  })

  // Rhombus marker group
  it("returns white-rhombus for ClassAggregation", () => {
    const result = getEdgeMarkerStyles("ClassAggregation")
    expect(result.markerEnd).toBe("url(#white-rhombus)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.offset).toBe(0)
  })

  it("returns black-rhombus for ClassComposition", () => {
    const result = getEdgeMarkerStyles("ClassComposition")
    expect(result.markerEnd).toBe("url(#black-rhombus)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.offset).toBe(0)
  })

  // Triangle marker group
  it("returns white-triangle for ClassInheritance", () => {
    const result = getEdgeMarkerStyles("ClassInheritance")
    expect(result.markerEnd).toBe("url(#white-triangle)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("0")
  })

  it("returns white-triangle with dashed for ClassRealization", () => {
    const result = getEdgeMarkerStyles("ClassRealization")
    expect(result.markerEnd).toBe("url(#white-triangle)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("10")
  })

  // Dashed arrow group (dependency)
  it("returns dashed black-arrow for ClassDependency", () => {
    const result = getEdgeMarkerStyles("ClassDependency")
    expect(result.markerEnd).toBe("url(#black-arrow)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("10")
  })

  it("returns dashed for ComponentDependency", () => {
    const result = getEdgeMarkerStyles("ComponentDependency")
    expect(result.strokeDashArray).toBe("10")
    expect(result.markerEnd).toBe("url(#black-arrow)")
  })

  it("returns dashed for DeploymentDependency", () => {
    const result = getEdgeMarkerStyles("DeploymentDependency")
    expect(result.strokeDashArray).toBe("10")
  })

  // PetriNet black-triangle
  it("returns black-triangle for PetriNetArc", () => {
    const result = getEdgeMarkerStyles("PetriNetArc")
    expect(result.markerEnd).toBe("url(#black-triangle)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
  })

  // BPMN markers
  it("returns bpmn-black-triangle for BPMNSequenceFlow", () => {
    const result = getEdgeMarkerStyles("BPMNSequenceFlow")
    expect(result.markerEnd).toBe("url(#bpmn-black-triangle)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("0")
    expect(result.offset).toBe(8)
  })

  it("returns bpmn markers for BPMNMessageFlow (markerStart + markerEnd)", () => {
    const result = getEdgeMarkerStyles("BPMNMessageFlow")
    expect(result.markerEnd).toBe("url(#bpmn-white-triangle)")
    expect(result.markerStart).toBe("url(#bpmn-white-circle)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("10")
    expect(result.offset).toBe(8)
  })

  it("returns dashed style for BPMNAssociationFlow", () => {
    const result = getEdgeMarkerStyles("BPMNAssociationFlow")
    expect(result.markerEnd).toBeUndefined()
    expect(result.strokeDashArray).toBe("10")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
  })

  it("returns bpmn-arrow for BPMNDataAssociationFlow", () => {
    const result = getEdgeMarkerStyles("BPMNDataAssociationFlow")
    expect(result.markerEnd).toBe("url(#bpmn-arrow)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("10")
    expect(result.offset).toBe(8)
  })

  // UseCase group
  it("returns no marker for UseCaseAssociation", () => {
    const result = getEdgeMarkerStyles("UseCaseAssociation")
    expect(result.markerEnd).toBeUndefined()
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("0")
  })

  it("returns black-arrow dashed for UseCaseInclude", () => {
    const result = getEdgeMarkerStyles("UseCaseInclude")
    expect(result.markerEnd).toBe("url(#black-arrow)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("10")
  })

  it("returns black-arrow dashed for UseCaseExtend", () => {
    const result = getEdgeMarkerStyles("UseCaseExtend")
    expect(result.markerEnd).toBe("url(#black-arrow)")
    expect(result.strokeDashArray).toBe("10")
  })

  it("returns white-triangle for UseCaseGeneralization", () => {
    const result = getEdgeMarkerStyles("UseCaseGeneralization")
    expect(result.markerEnd).toBe("url(#white-triangle)")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("0")
  })

  // Provided/Required interface group
  it("returns no marker for ComponentProvidedInterface", () => {
    const result = getEdgeMarkerStyles("ComponentProvidedInterface")
    expect(result.markerEnd).toBeUndefined()
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
  })

  it("returns required-interface marker for ComponentRequiredInterface", () => {
    const result = getEdgeMarkerStyles("ComponentRequiredInterface")
    expect(result.markerEnd).toBe("url(#required-interface)")
    expect(result.markerPadding).toBe(
      EDGES.MARKER_PADDING + INTERFACE.SOCKET_GAP
    )
  })

  it("returns required-interface-quarter for ComponentRequiredQuarterInterface", () => {
    const result = getEdgeMarkerStyles("ComponentRequiredQuarterInterface")
    expect(result.markerEnd).toBe("url(#required-interface-quarter)")
  })

  it("returns required-interface-threequarter for DeploymentRequiredThreeQuarterInterface", () => {
    const result = getEdgeMarkerStyles(
      "DeploymentRequiredThreeQuarterInterface"
    )
    expect(result.markerEnd).toBe("url(#required-interface-threequarter)")
  })

  // Deployment mirrors
  it("returns same style for DeploymentProvidedInterface as ComponentProvidedInterface", () => {
    const result = getEdgeMarkerStyles("DeploymentProvidedInterface")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.markerEnd).toBeUndefined()
  })

  // Default case
  it("returns default style for unknown edge type", () => {
    const result = getEdgeMarkerStyles("SomeUnknownType")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.strokeDashArray).toBe("0")
    expect(result.offset).toBe(0)
  })

  // Shared bucket edge types
  it("returns plain style for DeploymentAssociation", () => {
    const result = getEdgeMarkerStyles("DeploymentAssociation")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.markerEnd).toBeUndefined()
  })

  it("returns plain style for SyntaxTreeLink", () => {
    const result = getEdgeMarkerStyles("SyntaxTreeLink")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.markerEnd).toBeUndefined()
  })

  it("returns plain style for CommunicationLink", () => {
    const result = getEdgeMarkerStyles("CommunicationLink")
    expect(result.markerPadding).toBe(EDGES.MARKER_PADDING)
    expect(result.markerEnd).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// findClosestHandle
// ---------------------------------------------------------------------------
describe("findClosestHandle", () => {
  const rect = { x: 0, y: 0, width: 300, height: 200 }

  describe("with useFourHandles=true", () => {
    it("returns top when point is directly above center", () => {
      const result = findClosestHandle({
        point: { x: 150, y: -10 },
        rect,
        useFourHandles: true,
      })
      expect(result).toBe("top")
    })

    it("returns bottom when point is directly below center", () => {
      const result = findClosestHandle({
        point: { x: 150, y: 210 },
        rect,
        useFourHandles: true,
      })
      expect(result).toBe("bottom")
    })

    it("returns left when point is to the left", () => {
      const result = findClosestHandle({
        point: { x: -10, y: 100 },
        rect,
        useFourHandles: true,
      })
      expect(result).toBe("left")
    })

    it("returns right when point is to the right", () => {
      const result = findClosestHandle({
        point: { x: 310, y: 100 },
        rect,
        useFourHandles: true,
      })
      expect(result).toBe("right")
    })

    it("returns top for a point near the top edge midpoint", () => {
      const result = findClosestHandle({
        point: { x: 150, y: 5 },
        rect,
        useFourHandles: true,
      })
      expect(result).toBe("top")
    })
  })

  describe("with useFourHandles=false (12 handles)", () => {
    it("returns top-left when point is near left-third of top edge", () => {
      // top-left handle is at (100, 0) for rect 300 wide
      const result = findClosestHandle({
        point: { x: 100, y: -5 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("top-left")
    })

    it("returns top-right when point is near right-third of top edge", () => {
      // top-right handle at (200, 0)
      const result = findClosestHandle({
        point: { x: 200, y: -5 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("top-right")
    })

    it("returns bottom-left when point is near left-third of bottom edge", () => {
      const result = findClosestHandle({
        point: { x: 100, y: 205 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("bottom-left")
    })

    it("returns bottom-right when point is near right-third of bottom edge", () => {
      const result = findClosestHandle({
        point: { x: 200, y: 205 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("bottom-right")
    })

    it("returns left-top when point is near top-third of left edge", () => {
      // left-top handle at (0, 200/3 ≈ 66.67)
      const result = findClosestHandle({
        point: { x: -5, y: 66.67 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("left-top")
    })

    it("returns left-bottom when point is near bottom-third of left edge", () => {
      // left-bottom handle at (0, 2/3*200 ≈ 133.33)
      const result = findClosestHandle({
        point: { x: -5, y: 133.33 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("left-bottom")
    })

    it("returns right-top when point is near top-third of right edge", () => {
      const result = findClosestHandle({
        point: { x: 305, y: 66.67 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("right-top")
    })

    it("returns right-bottom when point is near bottom-third of right edge", () => {
      const result = findClosestHandle({
        point: { x: 305, y: 133.33 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("right-bottom")
    })

    it("still returns basic handles when point is nearest", () => {
      const result = findClosestHandle({
        point: { x: 150, y: -20 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("top")
    })
  })

  it("defaults useFourHandles to false", () => {
    const result = findClosestHandle({
      point: { x: 100, y: -5 },
      rect,
    })
    expect(result).toBe("top-left")
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
// calculateInnerMidpoints
// ---------------------------------------------------------------------------
describe("calculateInnerMidpoints", () => {
  it("returns empty for fewer than 3 points", () => {
    expect(
      calculateInnerMidpoints([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ])
    ).toEqual([])
  })

  it("returns empty for empty array", () => {
    expect(calculateInnerMidpoints([])).toEqual([])
  })

  it("returns midpoint of inner segment for U-shaped path", () => {
    // 3 segments: first (horiz), middle (vert), last (horiz)
    // Only inner segments (excluding first and last) should produce midpoints
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ]
    const result = calculateInnerMidpoints(points)
    // Segments: [0→100,0] horiz, [100,0→100,100] vert, [100,100→200,100] horiz
    // Inner = index 1 only: midpoint of (100,0)→(100,100) = (100, 50)
    expect(result).toEqual([{ x: 100, y: 50 }])
  })

  it("rounds midpoints to specified decimals", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 77 },
      { x: 200, y: 77 },
    ]
    const result = calculateInnerMidpoints(points, 1)
    expect(result).toEqual([{ x: 100, y: 38.5 }])
  })

  it("returns multiple midpoints for longer path", () => {
    // 5 segments path: horiz, vert, horiz, vert, horiz
    // Inner segments: index 1, 2, 3
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 200 },
    ]
    const result = calculateInnerMidpoints(points)
    // Segments: [0,0→100,0] H, [100,0→100,100] V, [100,100→200,100] H, [200,100→200,200] V, [200,200→300,200] H
    // Inner (excl first and last): index 1,2,3
    expect(result.length).toBe(3)
    expect(result[0]).toEqual({ x: 100, y: 50 })
    expect(result[1]).toEqual({ x: 150, y: 100 })
    expect(result[2]).toEqual({ x: 200, y: 150 })
  })
})

// ---------------------------------------------------------------------------
// straight path breakpoint helpers
// ---------------------------------------------------------------------------
describe("straight path breakpoint helpers", () => {
  describe("getStraightPathOrientation", () => {
    it("detects vertical two-point paths", () => {
      expect(
        getStraightPathOrientation([
          { x: 10, y: 0 },
          { x: 10, y: 200 },
        ])
      ).toBe("vertical")
    })

    it("detects horizontal two-point paths", () => {
      expect(
        getStraightPathOrientation([
          { x: 0, y: 20 },
          { x: 200, y: 20 },
        ])
      ).toBe("horizontal")
    })

    it("rejects diagonal, zero-length, and multi-point paths", () => {
      expect(
        getStraightPathOrientation([
          { x: 0, y: 0 },
          { x: 100, y: 50 },
        ])
      ).toBeNull()
      expect(
        getStraightPathOrientation([
          { x: 5, y: 5 },
          { x: 5, y: 5 },
        ])
      ).toBeNull()
      expect(
        getStraightPathOrientation([
          { x: 0, y: 0 },
          { x: 0, y: 50 },
          { x: 50, y: 50 },
        ])
      ).toBeNull()
    })
  })

  describe("calculateStraightPathBreakpoints", () => {
    it("creates one centered handle for a long vertical path", () => {
      const result = calculateStraightPathBreakpoints([
        { x: 10, y: 0 },
        { x: 10, y: 200 },
      ])

      expect(result).toEqual([{ x: 10, y: 100 }])
    })

    it("creates one handle for a medium horizontal path", () => {
      const result = calculateStraightPathBreakpoints([
        { x: 0, y: 20 },
        { x: 100, y: 20 },
      ])

      expect(result).toEqual([{ x: 50, y: 20 }])
    })

    it("centers reversed paths", () => {
      const result = calculateStraightPathBreakpoints([
        { x: 10, y: 200 },
        { x: 10, y: 0 },
      ])

      expect(result).toEqual([{ x: 10, y: 100 }])
    })

    it("returns no handles for short or non-orthogonal paths", () => {
      expect(
        calculateStraightPathBreakpoints([
          { x: 0, y: 0 },
          { x: 0, y: 70 },
        ])
      ).toEqual([])
      expect(
        calculateStraightPathBreakpoints([
          { x: 0, y: 0 },
          { x: 100, y: 50 },
        ])
      ).toEqual([])
    })
  })

  describe("orthogonalizePoints", () => {
    it("turns a diagonal segment into orthogonal elbow segments", () => {
      const result = orthogonalizePoints([
        { x: 0, y: 0 },
        { x: 100, y: 80 },
      ])

      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 80 },
        { x: 100, y: 80 },
      ])
    })

    it("alternates after an existing vertical segment to avoid diagonal tilt", () => {
      const result = orthogonalizePoints([
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 100, y: 80 },
      ])

      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 100, y: 50 },
        { x: 100, y: 80 },
      ])
    })

    it("leaves already orthogonal paths unchanged", () => {
      const points = [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ]

      expect(orthogonalizePoints(points)).toEqual(points)
    })
  })

  describe("calculateStraightPathDetourRange", () => {
    const straightPath = [
      { x: 10, y: 0 },
      { x: 10, y: 200 },
    ]
    const breakpoints = [
      { x: 10, y: 50 },
      { x: 10, y: 100 },
      { x: 10, y: 150 },
    ]

    it("maps the first handle to the source-side span", () => {
      expect(
        calculateStraightPathDetourRange(straightPath, breakpoints, 0)
      ).toEqual({
        start: { x: 10, y: 25 },
        end: { x: 10, y: 100 },
      })
    })

    it("maps the middle handle to the neighboring handles", () => {
      expect(
        calculateStraightPathDetourRange(straightPath, breakpoints, 1)
      ).toEqual({
        start: { x: 10, y: 50 },
        end: { x: 10, y: 150 },
      })
    })

    it("maps the last handle to the target-side span", () => {
      expect(
        calculateStraightPathDetourRange(straightPath, breakpoints, 2)
      ).toEqual({
        start: { x: 10, y: 100 },
        end: { x: 10, y: 175 },
      })
    })
  })

  describe("createStraightPathDetour", () => {
    it("creates an orthogonal detour from the middle vertical handle", () => {
      const straightPath = [
        { x: 10, y: 0 },
        { x: 10, y: 200 },
      ]
      const breakpoints = [
        { x: 10, y: 50 },
        { x: 10, y: 100 },
        { x: 10, y: 150 },
      ]
      const result = createStraightPathDetour(
        straightPath,
        breakpoints[1],
        { x: 70, y: 100 },
        4,
        breakpoints,
        1
      )

      expect(result).toEqual([
        { x: 10, y: 0 },
        { x: 10, y: 50 },
        { x: 70, y: 50 },
        { x: 70, y: 150 },
        { x: 10, y: 150 },
        { x: 10, y: 200 },
      ])
    })

    it("creates an orthogonal detour from the target-side vertical handle", () => {
      const straightPath = [
        { x: 10, y: 0 },
        { x: 10, y: 200 },
      ]
      const breakpoints = [
        { x: 10, y: 50 },
        { x: 10, y: 100 },
        { x: 10, y: 150 },
      ]
      const result = createStraightPathDetour(
        straightPath,
        breakpoints[2],
        { x: 70, y: 150 },
        4,
        breakpoints,
        2
      )

      expect(result).toEqual([
        { x: 10, y: 0 },
        { x: 10, y: 100 },
        { x: 70, y: 100 },
        { x: 70, y: 175 },
        { x: 10, y: 175 },
        { x: 10, y: 200 },
      ])
    })

    it("creates an orthogonal detour from the source-side vertical handle", () => {
      const straightPath = [
        { x: 10, y: 0 },
        { x: 10, y: 200 },
      ]
      const breakpoints = [
        { x: 10, y: 50 },
        { x: 10, y: 100 },
        { x: 10, y: 150 },
      ]
      const result = createStraightPathDetour(
        straightPath,
        breakpoints[0],
        { x: 70, y: 50 },
        4,
        breakpoints,
        0
      )

      expect(result).toEqual([
        { x: 10, y: 0 },
        { x: 10, y: 25 },
        { x: 70, y: 25 },
        { x: 70, y: 100 },
        { x: 10, y: 100 },
        { x: 10, y: 200 },
      ])
    })

    it("creates an orthogonal detour from the middle horizontal handle", () => {
      const straightPath = [
        { x: 0, y: 20 },
        { x: 200, y: 20 },
      ]
      const breakpoints = [
        { x: 50, y: 20 },
        { x: 100, y: 20 },
        { x: 150, y: 20 },
      ]
      const result = createStraightPathDetour(
        straightPath,
        breakpoints[1],
        { x: 100, y: 80 },
        4,
        breakpoints,
        1
      )

      expect(result).toEqual([
        { x: 0, y: 20 },
        { x: 50, y: 20 },
        { x: 50, y: 80 },
        { x: 150, y: 80 },
        { x: 150, y: 20 },
        { x: 200, y: 20 },
      ])
    })

    it("does not persist tiny detours or diagonal paths", () => {
      const verticalPath = [
        { x: 10, y: 0 },
        { x: 10, y: 200 },
      ]

      expect(
        createStraightPathDetour(
          verticalPath,
          { x: 10, y: 50 },
          { x: 12, y: 50 }
        )
      ).toEqual(verticalPath)

      const diagonalPath = [
        { x: 0, y: 0 },
        { x: 100, y: 50 },
      ]

      expect(
        createStraightPathDetour(
          diagonalPath,
          { x: 50, y: 25 },
          { x: 70, y: 50 }
        )
      ).toEqual(diagonalPath)
    })
  })

  describe("alignCustomPathEndpointSegments", () => {
    it("preserves a custom route while updating vertical endpoint approaches", () => {
      const result = alignCustomPathEndpointSegments(
        [
          { x: 10, y: 0 },
          { x: 10, y: 50 },
          { x: 70, y: 50 },
          { x: 70, y: 125 },
          { x: 10, y: 125 },
          { x: 10, y: 200 },
        ],
        { x: 30, y: 20 },
        { x: 10, y: 240 },
        Position.Bottom,
        Position.Top
      )

      expect(result).toEqual([
        { x: 30, y: 20 },
        { x: 30, y: 50 },
        { x: 70, y: 50 },
        { x: 70, y: 125 },
        { x: 10, y: 125 },
        { x: 10, y: 240 },
      ])
    })

    it("preserves a custom route while updating horizontal endpoint approaches", () => {
      const result = alignCustomPathEndpointSegments(
        [
          { x: 0, y: 20 },
          { x: 50, y: 20 },
          { x: 50, y: 80 },
          { x: 125, y: 80 },
          { x: 125, y: 20 },
          { x: 200, y: 20 },
        ],
        { x: -20, y: 40 },
        { x: 240, y: 10 },
        Position.Right,
        Position.Left
      )

      expect(result).toEqual([
        { x: -20, y: 40 },
        { x: 50, y: 40 },
        { x: 50, y: 80 },
        { x: 125, y: 80 },
        { x: 125, y: 10 },
        { x: 240, y: 10 },
      ])
    })

    it("forces the target approach to respect the attached top side", () => {
      const result = alignCustomPathEndpointSegments(
        [
          { x: 0, y: 0 },
          { x: 0, y: 80 },
          { x: 100, y: 80 },
          { x: 100, y: 140 },
          { x: 50, y: 140 },
        ],
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        Position.Bottom,
        Position.Top
      )

      expect(result[result.length - 2]).toEqual({ x: 50, y: 80 })
      expect(result[result.length - 1]).toEqual({ x: 50, y: 100 })
    })

    it("forces the target approach to respect the attached left side", () => {
      const result = alignCustomPathEndpointSegments(
        [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
          { x: 80, y: 100 },
          { x: 140, y: 100 },
          { x: 100, y: 50 },
        ],
        { x: 0, y: 0 },
        { x: 100, y: 50 },
        Position.Right,
        Position.Left
      )

      expect(result[result.length - 2]).toEqual({ x: 80, y: 50 })
      expect(result[result.length - 1]).toEqual({ x: 100, y: 50 })
    })
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
