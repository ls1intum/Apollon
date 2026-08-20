import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { ApollonMode } from "@/typings"

const { setCenter } = vi.hoisted(() => ({ setCenter: vi.fn() }))

const edgeGeometryState = {
  geometryById: {} as Record<string, { x: number; y: number }[]>,
  previewById: {} as Record<string, { x: number; y: number }[]>,
}

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ setCenter, getZoom: () => 1 }),
}))

type Assessment = { score?: number; feedback?: string }

const nodes = [
  { id: "parent", position: { x: 100, y: 200 }, width: 200, height: 200 },
  {
    id: "graded",
    parentId: "parent",
    position: { x: 10, y: 20 },
    width: 10,
    height: 10,
  },
  { id: "ungraded-a", position: { x: 50, y: 0 }, width: 10, height: 10 },
  { id: "ungraded-b", position: { x: 100, y: 0 }, width: 10, height: 10 },
]
const edges = [{ id: "relationship", source: "graded", target: "ungraded-a" }]
const assessments: Record<string, Assessment> = { graded: { score: 1 } }
const setLocalSelection = vi.fn()

let mode: ApollonMode = ApollonMode.Assessment
let readonly = false

vi.mock("@/store", () => ({
  useDiagramStore: (select: (state: unknown) => unknown) =>
    select({
      nodes,
      edges,
      setLocalSelection,
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
  useEdgeGeometryStoreApi: () => ({ getState: () => edgeGeometryState }),
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
    edgeGeometryState.geometryById = {}
    edgeGeometryState.previewById = {}
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

  it("selects an edge through the local-only store path", () => {
    const { result } = renderHook(() => useAssessmentNavigation("ungraded-b"))

    act(() => result.current.navigate("next"))

    expect(setLocalSelection).toHaveBeenCalledWith(["relationship"])
    // The graded endpoint is nested at absolute (110,220), so its centre is
    // (115,225); the other endpoint's centre is (55,5).
    expect(setCenter).toHaveBeenCalledWith(85, 115, {
      duration: 220,
      zoom: 1,
    })
  })

  it("pans an edge to the displayed route midpoint", () => {
    edgeGeometryState.previewById.relationship = [
      { x: 115, y: 225 },
      { x: 215, y: 225 },
      { x: 215, y: 5 },
      { x: 55, y: 5 },
    ]
    const { result } = renderHook(() => useAssessmentNavigation("ungraded-b"))

    act(() => result.current.navigate("next"))

    expect(setCenter).toHaveBeenCalledWith(215, 85, {
      duration: 220,
      zoom: 1,
    })
  })
})
