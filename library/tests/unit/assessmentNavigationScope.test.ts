import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { ApollonMode } from "@/typings"

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ setCenter: vi.fn(), getZoom: () => 1 }),
}))

type Assessment = { score?: number; feedback?: string }

const nodes = [
  { id: "graded", position: { x: 0, y: 0 }, width: 10, height: 10 },
  { id: "ungraded-a", position: { x: 50, y: 0 }, width: 10, height: 10 },
  { id: "ungraded-b", position: { x: 100, y: 0 }, width: 10, height: 10 },
]
const edges = [{ id: "relationship", source: "graded", target: "ungraded-a" }]
const assessments: Record<string, Assessment> = { graded: { score: 1 } }
const onNodesChange = vi.fn()
const onEdgesChange = vi.fn()
const setSelectedElementsId = vi.fn()

let mode: ApollonMode = ApollonMode.Assessment
let readonly = false

vi.mock("@/store", () => ({
  useDiagramStore: (select: (state: unknown) => unknown) =>
    select({
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      setSelectedElementsId,
      getAssessment: (id: string) => assessments[id],
    }),
}))

vi.mock("@/store/context", () => ({
  usePopoverStore: (select: (state: unknown) => unknown) =>
    select({ setPopOverElementId: vi.fn() }),
  useAssessmentSelectionStore: (select: (state: unknown) => unknown) =>
    select({ selectMultipleElements: vi.fn() }),
  useMetadataStore: (select: (state: unknown) => unknown) =>
    select({ mode, readonly }),
}))

import { useAssessmentNavigation } from "@/hooks/useGoToNextAssessment"

describe("assessment navigation scope", () => {
  beforeEach(() => {
    mode = ApollonMode.Assessment
    readonly = false
    vi.clearAllMocks()
    // Module-level and mutated by the reader cases; reset so order cannot matter.
    for (const key of Object.keys(assessments)) delete assessments[key]
    assessments.graded = { score: 1 }
  })

  it("steps through every element while a tutor is giving feedback", () => {
    // Grading is exactly the case where nothing is assessed yet, so restricting
    // the list to assessed elements would hide navigation at the start of an
    // assessment - when the tutor most needs to walk the diagram.
    const { result } = renderHook(() => useAssessmentNavigation("ungraded-a"))

    expect(result.current.total).toBe(nodes.length + edges.length)
    expect(result.current.canNavigate).toBe(true)
  })

  it("lists only elements with something to show while reading feedback", () => {
    readonly = true
    // A reader gets nowhere useful by landing on an element nobody graded, so
    // the list is the assessed ones plus wherever the reader currently is.
    const { result } = renderHook(() => useAssessmentNavigation("ungraded-a"))

    expect(result.current.total).toBe(2)
  })

  it("gives a reader no navigation when only the current element would be listed", () => {
    readonly = true
    delete assessments.graded

    const { result } = renderHook(() => useAssessmentNavigation("ungraded-a"))

    expect(result.current.total).toBe(1)
    expect(result.current.canNavigate).toBe(false)
  })

  it("selects an edge through the local-only React Flow change path", () => {
    const { result } = renderHook(() => useAssessmentNavigation("ungraded-b"))

    act(() => result.current.navigate("next"))

    expect(onEdgesChange).toHaveBeenCalledWith([
      { type: "select", id: "relationship", selected: true },
    ])
    expect(onNodesChange).toHaveBeenCalledWith(
      nodes.map((node) => ({ type: "select", id: node.id, selected: false }))
    )
    expect(setSelectedElementsId).toHaveBeenCalledWith(["relationship"])
  })
})
