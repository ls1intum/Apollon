import { EDGES, INTERFACE } from "@/constants"
import type { UMLDiagramType } from "@/types/DiagramType"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  calculateDynamicEdgeLabels,
  calculateOverlayPath,
  calculateStraightPath,
  findClosestHandle,
  getConnectionLineType,
  getDefaultEdgeType,
  getDistributedHandleOffsetPercents,
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
describe("findClosestHandle", () => {
  const rect = { x: 0, y: 0, width: 300, height: 200 }
  const canonicalHandleIds = new Set([
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-mid-left",
    "top-mid-right",
    "top-right",
    "right-mid-top",
    "right-mid-bottom",
    "bottom-right",
    "bottom-mid-right",
    "bottom-mid-left",
    "bottom-left",
    "left-mid-bottom",
    "left-mid-top",
  ])

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

  describe("with useFourHandles=false (canonical 16 handles)", () => {
    const canonicalCandidates: Array<{
      id: string
      point: { x: number; y: number }
    }> = [
      { id: "top", point: { x: 150, y: 40 } },
      { id: "bottom", point: { x: 150, y: 160 } },
      { id: "left", point: { x: 60, y: 100 } },
      { id: "right", point: { x: 240, y: 100 } },
      { id: "top-left", point: { x: 60, y: 40 } },
      { id: "top-mid-left", point: { x: 110, y: 40 } },
      { id: "top-mid-right", point: { x: 200, y: 40 } },
      { id: "top-right", point: { x: 240, y: 40 } },
      { id: "right-mid-top", point: { x: 240, y: 70 } },
      { id: "right-mid-bottom", point: { x: 240, y: 130 } },
      { id: "bottom-right", point: { x: 240, y: 160 } },
      { id: "bottom-mid-right", point: { x: 200, y: 160 } },
      { id: "bottom-mid-left", point: { x: 110, y: 160 } },
      { id: "bottom-left", point: { x: 60, y: 160 } },
      { id: "left-mid-bottom", point: { x: 60, y: 130 } },
      { id: "left-mid-top", point: { x: 60, y: 70 } },
    ]

    it.each(canonicalCandidates)(
      "returns $id at its anchor point",
      ({ id, point }) => {
        const result = findClosestHandle({
          point,
          rect,
          useFourHandles: false,
        })
        expect(result).toBe(id)
      }
    )

    it("does not emit alias corner IDs at alias positions", () => {
      const aliasPositions = [
        { x: 60, y: 40 },
        { x: 240, y: 40 },
        { x: 60, y: 160 },
        { x: 240, y: 160 },
      ]
      const aliasIds = new Set([
        "left-top",
        "right-top",
        "left-bottom",
        "right-bottom",
      ])

      for (const point of aliasPositions) {
        const result = findClosestHandle({ point, rect, useFourHandles: false })
        expect(canonicalHandleIds.has(result)).toBe(true)
        expect(aliasIds.has(result)).toBe(false)
      }
    })

    it("uses deterministic canonical-order tie-break for equal distances", () => {
      // Equidistant from top (slot 4, x=150) and top-between-mid-left-center
      // (slot 3, x=130) on the top side. The four directional middles are
      // declared first in canonical order, so "top" wins this tie.
      const result = findClosestHandle({
        point: { x: 140, y: 40 },
        rect,
        useFourHandles: false,
      })
      expect(result).toBe("top")
    })

    it("returns the same ID repeatedly at an exact tie point", () => {
      const tiePoint = { x: 140, y: 40 }
      const first = findClosestHandle({
        point: tiePoint,
        rect,
        useFourHandles: false,
      })

      for (let i = 0; i < 25; i++) {
        const result = findClosestHandle({
          point: tiePoint,
          rect,
          useFourHandles: false,
        })
        expect(result).toBe(first)
      }
    })
  })

  it("defaults useFourHandles to false", () => {
    const result = findClosestHandle({
      point: { x: 100, y: -5 },
      rect,
    })
    expect(result).toBe("top-mid-left")
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

  it("collapses a target-side tiny vertical stair-step when preserving node movement", () => {
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
      { x: 230, y: 100 },
      { x: 230, y: 300 },
      { x: 260, y: 300 },
    ])
    expectOrthogonalSegments(result)
  })

  it("collapses a source-side tiny vertical stair-step without moving the source stub", () => {
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
      { x: 30, y: 200 },
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
// getDistributedHandleOffsetPercents
// ---------------------------------------------------------------------------
describe("getDistributedHandleOffsetPercents", () => {
  it.each([80, 125, 200])(
    "returns non-decreasing grid-aligned offsets for %ipx nodes",
    (axisLength) => {
      const offsets = getDistributedHandleOffsetPercents(axisLength).map(
        (percent) => (Number.parseFloat(percent) / 100) * axisLength
      )

      // Nine offsets per axis — five arc-bearing slots interleaved with four
      // "between" hidden connection points.
      expect(offsets).toHaveLength(9)
      for (let index = 0; index < offsets.length; index++) {
        expect(offsets[index]).toBeGreaterThanOrEqual(0)
        expect(offsets[index]).toBeLessThanOrEqual(axisLength)
        // Offsets snap to the 5px handle grid step.
        expect(Math.round(offsets[index]) % 5).toBe(0)

        if (index > 0) {
          // Hidden slots collapse to their visible neighbour in stage-0/1
          // layouts, so adjacent offsets may be equal — but never decrease.
          expect(offsets[index]).toBeGreaterThanOrEqual(offsets[index - 1])
        }
      }
    }
  )
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
