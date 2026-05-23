import { fireEvent, render } from "@testing-library/react"
import { Position } from "@xyflow/react"
import { describe, expect, it, vi } from "vitest"
import { EdgeEndpointMarkers } from "@/edges/GenericEdge"
import { EDGES } from "@/constants"

const renderEndpointMarkers = ({
  isDiagramModifiable = true,
  canEditEndpoint = true,
}: {
  isDiagramModifiable?: boolean
  canEditEndpoint?: boolean
} = {}) =>
  render(
    <svg>
      <g className="react-flow__edge">
        <circle className="react-flow__edgeupdater react-flow__edgeupdater-source" />
        <circle className="react-flow__edgeupdater react-flow__edgeupdater-target" />
        <EdgeEndpointMarkers
          sourcePoint={{ x: 10, y: 20 }}
          targetPoint={{ x: 110, y: 120 }}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          isDiagramModifiable={isDiagramModifiable}
          canEditEndpoint={canEditEndpoint}
          diagramType="step"
        />
      </g>
    </svg>
  )

describe("EdgeEndpointMarkers", () => {
  it("renders endpoint hit targets for unselected modifiable edges", () => {
    const { container } = renderEndpointMarkers()

    expect(container.querySelectorAll(".edge-endpoint-handle")).toHaveLength(2)
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

  it("keeps short-edge targets inert when the edge is below the edit threshold", () => {
    const { container } = renderEndpointMarkers({ canEditEndpoint: false })

    const sourceHandle = container.querySelector(
      ".edge-endpoint-handle--source"
    )
    expect(sourceHandle).toHaveClass("edge-endpoint-handle--disabled")
    expect(sourceHandle).toHaveAttribute("pointer-events", "none")
  })

  it("disables native updater pointer events without relying on CSS selectors", () => {
    const { container } = renderEndpointMarkers()

    expect(
      container.querySelector<SVGElement>(".react-flow__edgeupdater-source")
    ).toHaveStyle({ pointerEvents: "none" })
    expect(
      container.querySelector<SVGElement>(".react-flow__edgeupdater-target")
    ).toHaveStyle({ pointerEvents: "none" })
  })

  it("disables native updater pointer events after editability is toggled on", () => {
    const { container, rerender } = renderEndpointMarkers({
      isDiagramModifiable: false,
    })

    rerender(
      <svg>
        <g className="react-flow__edge">
          <circle className="react-flow__edgeupdater react-flow__edgeupdater-source" />
          <circle className="react-flow__edgeupdater react-flow__edgeupdater-target" />
          <EdgeEndpointMarkers
            sourcePoint={{ x: 10, y: 20 }}
            targetPoint={{ x: 110, y: 120 }}
            sourcePosition={Position.Right}
            targetPosition={Position.Left}
            isDiagramModifiable
            diagramType="step"
          />
        </g>
      </svg>
    )

    expect(
      container.querySelector<SVGElement>(".react-flow__edgeupdater-source")
    ).toHaveStyle({ pointerEvents: "none" })
  })

  it("forwards source hit target mouse down to React Flow reconnection", () => {
    const { container } = renderEndpointMarkers()
    const nativeUpdater = container.querySelector(
      ".react-flow__edgeupdater-source"
    )
    const onNativeMouseDown = vi.fn()
    nativeUpdater?.addEventListener("mousedown", onNativeMouseDown)

    fireEvent.mouseDown(
      container.querySelector(".edge-endpoint-handle--source")!,
      {
        button: 0,
        buttons: 1,
        clientX: 10,
        clientY: 20,
      }
    )

    expect(onNativeMouseDown).toHaveBeenCalledTimes(1)
  })
})
