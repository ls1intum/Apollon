import { fireEvent, render } from "@testing-library/react"
import { Position, ReactFlowProvider } from "@xyflow/react"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"
import { EdgeEndpointMarkers } from "@/edges/GenericEdge"
import { EDGES } from "@/constants"

// The markers counter-scale by 1/zoom; ReactFlowProvider's default transform is
// zoom = 1, so sizes resolve to their base ENDPOINT_HIT_TARGET_SIZE here.
const renderEndpointMarkers = ({
  isDiagramModifiable = true,
  canEditEndpoint = true,
  onEndpointPointerDown,
  sourcePoint = { x: 10, y: 20 },
  targetPoint = { x: 110, y: 120 },
}: {
  isDiagramModifiable?: boolean
  canEditEndpoint?: boolean
  onEndpointPointerDown?: ComponentProps<
    typeof EdgeEndpointMarkers
  >["onEndpointPointerDown"]
  sourcePoint?: { x: number; y: number }
  targetPoint?: { x: number; y: number }
} = {}) =>
  render(
    <ReactFlowProvider>
      <svg>
        <g className="react-flow__edge">
          <EdgeEndpointMarkers
            sourcePoint={sourcePoint}
            targetPoint={targetPoint}
            sourcePosition={Position.Right}
            targetPosition={Position.Left}
            isDiagramModifiable={isDiagramModifiable}
            canEditEndpoint={canEditEndpoint}
            onEndpointPointerDown={onEndpointPointerDown}
            diagramType="step"
          />
        </g>
      </svg>
    </ReactFlowProvider>
  )

describe("EdgeEndpointMarkers", () => {
  it("renders endpoint hit targets for unselected modifiable edges", () => {
    const { container } = renderEndpointMarkers()

    expect(container.querySelectorAll(".edge-endpoint-handle")).toHaveLength(2)
    expect(container.querySelectorAll(".edge-endpoint-grip")).toHaveLength(0)
  })

  it("keeps endpoint hit targets large and on the edge side of the heads", () => {
    const { container } = renderEndpointMarkers()
    const sourceHandle = container.querySelector(
      ".edge-endpoint-handle--source"
    )
    const targetHandle = container.querySelector(
      ".edge-endpoint-handle--target"
    )

    expect(sourceHandle).toHaveAttribute(
      "width",
      String(EDGES.ENDPOINT_HIT_TARGET_SIZE)
    )
    expect(sourceHandle).toHaveAttribute(
      "height",
      String(EDGES.ENDPOINT_HIT_TARGET_SIZE)
    )
    expect(sourceHandle).toHaveAttribute("x", "10")
    expect(sourceHandle).toHaveAttribute("y", "8")
    expect(targetHandle).toHaveAttribute("x", "86")
    expect(targetHandle).toHaveAttribute("y", "108")
  })

  it("splits a short edge between the two hit targets instead of overlapping them", () => {
    // A 30px edge cannot host two full 24px targets: at full size they would
    // cover each other, and a click near one end could grab the far endpoint.
    const { container } = renderEndpointMarkers({
      sourcePoint: { x: 0, y: 0 },
      targetPoint: { x: 30, y: 0 },
    })
    const sourceHandle = container.querySelector(
      ".edge-endpoint-handle--source"
    )
    const targetHandle = container.querySelector(
      ".edge-endpoint-handle--target"
    )

    // Each end owns its half of the run: 0..15 and 15..30, meeting at the middle.
    expect(sourceHandle).toHaveAttribute("width", "15")
    expect(sourceHandle).toHaveAttribute("x", "0")
    expect(targetHandle).toHaveAttribute("width", "15")
    expect(targetHandle).toHaveAttribute("x", "15")
  })

  it("keeps full-size hit targets when the endpoints face away from each other", () => {
    // Endpoints that grow apart never collide, so proximity must not shrink them.
    const { container } = renderEndpointMarkers({
      sourcePoint: { x: 30, y: 0 },
      targetPoint: { x: 0, y: 0 },
    })

    expect(
      container.querySelector(".edge-endpoint-handle--source")
    ).toHaveAttribute("width", String(EDGES.ENDPOINT_HIT_TARGET_SIZE))
  })

  it("keeps short-edge targets inert when the edge is below the edit threshold", () => {
    const { container } = renderEndpointMarkers({ canEditEndpoint: false })

    const sourceHandle = container.querySelector(
      ".edge-endpoint-handle--source"
    )
    expect(sourceHandle).toHaveClass("edge-endpoint-handle--disabled")
    expect(sourceHandle).toHaveAttribute("pointer-events", "none")
  })

  it("uses a larger invisible hit target for freeform endpoint dragging", () => {
    const { container } = renderEndpointMarkers({
      onEndpointPointerDown: vi.fn(),
    })
    const sourceHandle = container.querySelector(
      ".edge-endpoint-handle--source"
    )
    const targetHandle = container.querySelector(
      ".edge-endpoint-handle--target"
    )

    expect(sourceHandle).toHaveAttribute("width", "44")
    expect(sourceHandle).toHaveAttribute("height", "44")
    expect(sourceHandle).toHaveAttribute("x", "10")
    expect(sourceHandle).toHaveAttribute("y", "-2")
    expect(targetHandle).toHaveAttribute("x", "66")
    expect(targetHandle).toHaveAttribute("y", "98")
  })

  it("anchors the visible endpoint grips to the endpoints, just clear of the heads", () => {
    // The grip hugs the endpoint (offset by half its length + the marker
    // clearance), not the centre of the wide hit-target — so it never floats off
    // the tip when zoomed out. Source at (10,20) exits right, target at (110,120)
    // enters from the left; clearance = 18/2 + 4 = 13.
    const { container } = renderEndpointMarkers({
      onEndpointPointerDown: vi.fn(),
    })
    const sourceGrip = container.querySelector(".edge-endpoint-grip--source")
    const targetGrip = container.querySelector(".edge-endpoint-grip--target")

    expect(container.querySelectorAll(".edge-endpoint-grip")).toHaveLength(2)
    expect(sourceGrip).toHaveAttribute("width", "18")
    expect(sourceGrip).toHaveAttribute("height", "8")
    expect(sourceGrip).toHaveAttribute("x", "14") // 10 + 13 clearance − 9 half-width
    expect(sourceGrip).toHaveAttribute("y", "16")
    expect(sourceGrip).toHaveAttribute("rx", "4")
    expect(sourceGrip).toHaveAttribute("pointer-events", "none")
    expect(targetGrip).toHaveAttribute("width", "18")
    expect(targetGrip).toHaveAttribute("height", "8")
    expect(targetGrip).toHaveAttribute("x", "88") // 110 − 13 clearance − 9 half-width
    expect(targetGrip).toHaveAttribute("y", "116")
  })

  it("invokes the configured endpoint pointer handler", () => {
    const onEndpointPointerDown = vi.fn()
    const { container } = renderEndpointMarkers({ onEndpointPointerDown })

    fireEvent.pointerDown(
      container.querySelector(".edge-endpoint-handle--source")!,
      {
        button: 0,
        buttons: 1,
        clientX: 10,
        clientY: 20,
      }
    )

    expect(onEndpointPointerDown).toHaveBeenCalledTimes(1)
  })
})
