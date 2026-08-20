import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { ApollonMode } from "@/typings"

const setPopOverElementId = vi.fn()
const nodes = [{ id: "node", data: {} }]
const assessments: Record<string, { score?: number; feedback?: string }> = {}

vi.mock("@/store", () => ({
  useMetadataStore: (select: (state: unknown) => unknown) =>
    select({ mode: ApollonMode.Assessment, readonly: true }),
  useDiagramStore: (select: (state: unknown) => unknown) =>
    select({
      nodes,
      getAssessment: (id: string) => assessments[id],
    }),
}))

vi.mock("@/store/context", () => ({
  usePopoverStore: (select: (state: unknown) => unknown) =>
    select({ setPopOverElementId }),
}))

vi.mock("@/hooks/useDiagramModifiable", () => ({
  useDiagramModifiable: () => false,
}))

import { useElementInteractions } from "@/hooks/useElementInteractions"

describe("read-only assessment element interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const id of Object.keys(assessments)) delete assessments[id]
  })

  it("opens only nodes and edges that have feedback to show", () => {
    const { result } = renderHook(() => useElementInteractions())
    const node = { id: "node" }
    const edge = { id: "edge" }

    act(() => {
      result.current.onNodeClick(undefined as never, node as never)
      result.current.onEdgeClick(undefined as never, edge as never)
    })
    expect(setPopOverElementId).not.toHaveBeenCalled()

    assessments.node = { score: 1 }
    assessments.edge = { feedback: "Useful feedback" }
    act(() => {
      result.current.onNodeClick(undefined as never, node as never)
      result.current.onEdgeClick(undefined as never, edge as never)
    })
    expect(setPopOverElementId).toHaveBeenNthCalledWith(1, "node")
    expect(setPopOverElementId).toHaveBeenNthCalledWith(2, "edge")
  })
})
