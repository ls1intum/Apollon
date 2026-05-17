import React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { OrthogonalEdge } from "@/edges/OrthogonalEdge"

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    screenToFlowPosition: vi.fn().mockImplementation((p) => p),
    deleteElements: vi.fn(),
    getIntersectingNodes: vi.fn().mockReturnValue([]),
    getInternalNode: vi.fn().mockReturnValue(null),
    getEdges: vi.fn().mockReturnValue([]),
  }),
}))

// Mock the actual store hook implementations rather than the re-exports.
vi.mock("@/store/context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store/context")>()
  const diagramState = {
    nodes: [],
    edges: [],
    assessments: {},
    setEdges: vi.fn(),
  }
  const popoverState = { setPopOverElementId: vi.fn() }
  const metadataState = {
    readonly: false,
    mode: "Modelling",
    diagramView: "edit",
    startConnectionGuidance: vi.fn(),
    setConnectionGuidanceTarget: vi.fn(),
    stopConnectionGuidance: vi.fn(),
  }
  return {
    ...actual,
    useDiagramStore: (selector?: any) =>
      typeof selector === "function" ? selector(diagramState) : diagramState,
    usePopoverStore: (selector?: any) =>
      typeof selector === "function" ? selector(popoverState) : popoverState,
    useMetadataStore: (selector?: any) =>
      typeof selector === "function" ? selector(metadataState) : metadataState,
  }
})

const routingMock = {
  calculateRoute: vi.fn(),
}

vi.mock("@/store/routingStore", () => ({
  useRoutingStore: (selector?: any) => {
    return typeof selector === "function" ? selector(routingMock) : routingMock
  },
}))

vi.mock("@/hooks/useHandleFinder", () => ({
  useHandleFinder: () => ({
    findBestHandleAtClientPosition: vi
      .fn()
      .mockReturnValue({ handle: null, node: null }),
  }),
}))

vi.mock("@/edges/GenericEdge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/edges/GenericEdge")>()
  return {
    ...actual,
    CommonEdgeElements: () => null,
  }
})

vi.mock("@/components/wrapper/AssessmentSelectableWrapper", () => ({
  AssessmentSelectableWrapper: ({
    children,
  }: {
    children: React.ReactNode
  }) => <g>{children}</g>,
}))

vi.mock("@/components/wrapper/FeedbackDropzone", () => ({
  FeedbackDropzone: ({ children }: { children: React.ReactNode }) => (
    <g>{children}</g>
  ),
}))

describe("OrthogonalEdge Component", () => {
  beforeEach(() => {
    routingMock.calculateRoute.mockReset().mockResolvedValue([])
  })

  const baseProps = {
    type: "OrthogonalRouted",
    source: "s1",
    target: "t1",
    sourceX: 0,
    sourceY: 0,
    targetX: 0,
    targetY: 0,
    sourcePosition: "right" as any,
    targetPosition: "left" as any,
  }

  it("returns null if less than 2 points are provided", () => {
    const { container } = render(
      <svg>
        <OrthogonalEdge
          {...baseProps}
          id="edge1"
          data={{ points: [{ x: 0, y: 0 }] }}
        />
      </svg>
    )
    expect(container.querySelector("g.orthogonal-edge")).toBeNull()
  })

  it("renders correctly with 3 points forming 2 segments", () => {
    const { container } = render(
      <svg>
        <OrthogonalEdge
          {...baseProps}
          id="edge2"
          data={{
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 }, // Segment 1: Horizontal
              { x: 100, y: 100 }, // Segment 2: Vertical
            ],
          }}
          markerStart="url(#start)"
          markerEnd="url(#end)"
        />
      </svg>
    )
    const edgeGroup = container.querySelector("g.orthogonal-edge")
    expect(edgeGroup).not.toBeNull()

    const segments = container.querySelectorAll("g.orthogonal-segment")
    expect(segments.length).toBe(2)

    const firstVisibleLine = segments[0].querySelectorAll("line")[0]
    expect(firstVisibleLine.getAttribute("marker-start")).toBe("url(#start)")
    expect(firstVisibleLine.getAttribute("marker-end")).toBeNull()

    const secondVisibleLine = segments[1].querySelectorAll("line")[0]
    expect(secondVisibleLine.getAttribute("marker-start")).toBeNull()
    expect(secondVisibleLine.getAttribute("marker-end")).toBe("url(#end)")
  })

  it("triggers an initial route when only legacy data.points is present", () => {
    render(
      <svg>
        <OrthogonalEdge
          {...baseProps}
          id="edge3"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          data={{
            // Legacy edge: render fallback is data.points.
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 100 },
            ],
          }}
        />
      </svg>
    )

    // useOrthogonalRoute computes presentation-local geometry instead of
    // treating legacy data.points as persisted routing output.
    expect(routingMock.calculateRoute).toHaveBeenCalledTimes(1)
  })

  it("triggers an initial route even when fallback points cover the endpoints", () => {
    render(
      <svg>
        <OrthogonalEdge
          {...baseProps}
          id="edge4"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          data={{
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 100 },
            ],
          }}
        />
      </svg>
    )

    expect(routingMock.calculateRoute).toHaveBeenCalledTimes(1)
  })
})
