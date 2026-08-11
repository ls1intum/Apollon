import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { ReactFlowProvider, useStoreApi } from "@xyflow/react"
import type { ReactNode } from "react"

/**
 * A node mounts only the handles it needs. Getting that wrong is data-visible:
 * React Flow derives an edge's endpoint from its handle's measured geometry, so
 * dropping a handle an edge is anchored to strands the edge in a saved diagram.
 */
vi.mock("@/components/wrapper/AssessmentSelectableWrapper", () => ({
  AssessmentSelectableWrapper: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}))
vi.mock("@/components/wrapper/FeedbackDropzone", () => ({
  FeedbackDropzone: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock("@/hooks/useDiagramModifiable", () => ({
  useDiagramModifiable: () => true,
}))
vi.mock("@/store/context", () => ({
  useMetadataStore: (select: (state: unknown) => unknown) =>
    select({
      connectionGuidanceActive: false,
      connectionGuidanceSourceNodeId: null,
      connectionGuidanceSourceHandleId: null,
    }),
}))

import { DefaultNodeWrapper } from "@/nodes/wrappers/DefaultNodeWrapper"

const NODE_ID = "node-1"

/** Seeds the React Flow store so the wrapper has a real node and edge set to read. */
const Seed = ({
  edges,
}: {
  edges: { id: string; source: string; target: string; sourceHandle?: string }[]
}) => {
  const store = useStoreApi()
  store.getState().setNodes([
    {
      id: NODE_ID,
      type: "Class",
      position: { x: 0, y: 0 },
      width: 200,
      height: 120,
      data: {},
    },
  ])
  store.getState().setEdges(edges)
  return null
}

const mountedHandleIds = (container: HTMLElement): string[] =>
  [...container.querySelectorAll("[data-handleid]")].map(
    (element) => element.getAttribute("data-handleid") ?? ""
  )

const renderNode = (
  edges: {
    id: string
    source: string
    target: string
    sourceHandle?: string
  }[] = []
) =>
  render(
    <ReactFlowProvider>
      <Seed edges={edges} />
      <DefaultNodeWrapper elementId={NODE_ID}>
        <div />
      </DefaultNodeWrapper>
    </ReactFlowProvider>
  )

describe("handle mounting", () => {
  it("mounts a handle an edge is anchored to", () => {
    const anchored = "top-between-left-mid-left" // a hidden slot, never drawn
    const { container } = renderNode([
      { id: "e1", source: NODE_ID, target: "other", sourceHandle: anchored },
    ])

    expect(mountedHandleIds(container)).toContain(anchored)
  })

  it("drops that same handle once no edge uses it", () => {
    const { container } = renderNode([])

    expect(mountedHandleIds(container)).not.toContain(
      "top-between-left-mid-left"
    )
  })

  it("still mounts the handles it draws", () => {
    const { container } = renderNode([])

    expect(mountedHandleIds(container).length).toBeGreaterThan(0)
  })
})
