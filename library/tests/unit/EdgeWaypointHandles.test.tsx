import { render } from "@testing-library/react"
import { ReactFlowProvider } from "@xyflow/react"
import { describe, expect, it, vi } from "vitest"
import * as Y from "yjs"
import { EdgeWaypointHandles } from "@/edges/GenericEdge"
import { MetadataStoreContext } from "@/store/context"
import { createMetadataStore } from "@/store/metadataStore"

const renderHandles = ({
  route,
  interior,
}: {
  route: { x: number; y: number }[]
  interior: { x: number; y: number }[]
}) =>
  render(
    <MetadataStoreContext value={createMetadataStore(new Y.Doc())}>
      <ReactFlowProvider>
        <svg>
          <EdgeWaypointHandles
            route={route}
            interior={interior}
            selectedWaypointIndex={null}
            onWaypointPointerDown={vi.fn()}
            onWaypointDoubleClick={vi.fn()}
            onWaypointKeyDown={vi.fn()}
            onGhostPointerDown={vi.fn()}
          />
        </svg>
      </ReactFlowProvider>
    </MetadataStoreContext>
  )

describe("EdgeWaypointHandles", () => {
  it("keeps pointer-only midpoint handles out of the keyboard tab order", () => {
    const { container } = renderHandles({
      route: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      interior: [],
    })
    const midpoint = container.querySelector(".edge-waypoint-hit-target")

    expect(midpoint).not.toHaveAttribute("tabindex")
    expect(midpoint).not.toHaveAttribute("role")
    expect(midpoint).not.toHaveAttribute("aria-label")
    expect(midpoint).toHaveStyle({ zIndex: 10001 })
  })

  it("keeps authored waypoints keyboard focusable and named", () => {
    const waypoint = { x: 50, y: 40 }
    const { container } = renderHandles({
      route: [{ x: 0, y: 0 }, waypoint, { x: 100, y: 0 }],
      interior: [waypoint],
    })
    const target = container.querySelector(
      '.edge-waypoint-hit-target[role="button"]'
    )

    expect(target).toHaveAttribute("tabindex", "0")
    expect(target).toHaveAttribute(
      "aria-label",
      "Waypoint: drag to move, double-click or press Delete to remove"
    )
  })
})
