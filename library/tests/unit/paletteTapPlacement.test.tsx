import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Node } from "@xyflow/react"
import type { DropElementConfig } from "@/constants"

// A viewport that maps screen coordinates 1:1 to flow coordinates and never
// finds a parent under the drop point.
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    screenToFlowPosition: (position: { x: number; y: number }) => ({
      ...position,
    }),
    getIntersectingNodes: () => [],
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  }),
}))

const setNodes = vi.fn()
const setEdges = vi.fn()
const setSelectedElementsId = vi.fn()
const setLastPlacedElementId = vi.fn()
let selectedElementIds: string[] = []
let nodes: Node[] = []
let edges: { id: string; selected?: boolean }[] = []
let lastPlacedElementId: string | null = null

vi.mock("@/store/context", () => ({
  useDiagramStore: (select: (state: unknown) => unknown) =>
    select({
      diagramId: "diagram",
      nodes,
      setNodes,
      edges,
      setEdges,
      selectedElementIds,
      setSelectedElementsId,
      lastPlacedElementId,
      setLastPlacedElementId,
    }),
  useMetadataStore: (select: (state: unknown) => unknown) =>
    select({
      labels: { addElement: "Add element", nodeTypeLabel: (t: string) => t },
    }),
}))

import { DraggableGhost } from "@/components/DraggableGhost"

const config = {
  type: "Class",
  width: 160,
  height: 100,
  defaultData: {},
} as unknown as DropElementConfig

const CANVAS_RECT = {
  left: 0,
  top: 0,
  right: 800,
  bottom: 600,
  width: 800,
  height: 600,
  x: 0,
  y: 0,
  toJSON: () => {},
} as DOMRect

let canvas: HTMLDivElement

beforeEach(() => {
  setNodes.mockClear()
  setEdges.mockClear()
  setSelectedElementsId.mockClear()
  setLastPlacedElementId.mockClear()
  selectedElementIds = []
  nodes = []
  edges = []
  lastPlacedElementId = null
  canvas = document.createElement("div")
  canvas.id = "react-flow-library-diagram"
  canvas.getBoundingClientRect = () => CANVAS_RECT
  document.body.appendChild(canvas)
})

afterEach(() => canvas.remove())

const mountGhost = () => {
  const { getByRole } = render(
    <DraggableGhost dropElementConfig={config}>
      <div data-testid="entry">entry</div>
    </DraggableGhost>
  )
  return getByRole("button")
}

// setNodes now takes a functional updater; run it against the current nodes.
const placedNodes = (): Node[] => {
  const updater = setNodes.mock.calls[0][0] as (prev: Node[]) => Node[]
  return updater(nodes)
}

describe("palette tap-to-place", () => {
  it("a click places a centred, selected node", () => {
    fireEvent.click(mountGhost())

    const placed = placedNodes()
    expect(placed).toHaveLength(1)
    // Canvas centre (400,300) minus half the 160×100 node, snapped.
    expect(placed[0].position).toEqual({ x: 320, y: 250 })
    expect(placed[0].selected).toBe(true)
    expect(setSelectedElementsId).toHaveBeenCalledWith([placed[0].id])
  })

  it("keyboard Enter places a centred, selected node", () => {
    fireEvent.keyDown(mountGhost(), { key: "Enter" })

    const placed = placedNodes()
    expect(placed[0].position).toEqual({ x: 320, y: 250 })
    expect(placed[0].selected).toBe(true)
  })

  it("cascades only off the last tap-placed node while it stays selected", () => {
    nodes = [
      { id: "n1", position: { x: 100, y: 100 }, width: 160, height: 100 },
    ]
    selectedElementIds = ["n1"]
    lastPlacedElementId = "n1"

    fireEvent.click(mountGhost())

    // Anchor (100,100) + one 20px step, snapped.
    const placed = placedNodes().find((node) => node.selected)!
    expect(placed.position).toEqual({ x: 120, y: 120 })
    expect(setLastPlacedElementId).toHaveBeenCalledWith(placed.id)
  })

  it("centres (not beside) when an unrelated node is selected, not the last placed one", () => {
    nodes = [
      { id: "other", position: { x: 400, y: 400 }, width: 160, height: 100 },
    ]
    selectedElementIds = ["other"]
    lastPlacedElementId = null // this selection wasn't made by a palette tap

    fireEvent.click(mountGhost())

    const placed = placedNodes().find((node) => node.selected)!
    expect(placed.position).toEqual({ x: 320, y: 250 })
  })

  it("clears a previously selected edge so the rendered selection stays in sync", () => {
    edges = [{ id: "e1", selected: true }]
    selectedElementIds = ["e1"]

    fireEvent.click(mountGhost())

    expect(setEdges).toHaveBeenCalledWith([{ id: "e1", selected: false }])
  })

  it("a drag drops at the pointer, unselected, and swallows the trailing click", () => {
    const wrapper = mountGhost()
    fireEvent.pointerDown(wrapper, { clientX: 30, clientY: 30 })
    fireEvent.pointerMove(document, { clientX: 400, clientY: 300 })
    fireEvent.pointerUp(document, { clientX: 400, clientY: 300 })
    fireEvent.click(wrapper) // the click a real drag also emits

    expect(setNodes).toHaveBeenCalledTimes(1) // click was swallowed
    const placed = placedNodes()
    // Pointer (400,300) backed out by the grabbed-point offset (30/0.8 → 35).
    expect(placed[0].position).toEqual({ x: 365, y: 265 })
    expect(placed[0].selected).toBe(false)
    expect(setSelectedElementsId).not.toHaveBeenCalled()
  })

  it("a wobble that releases off-canvas places nothing on drop, then centres on the click", () => {
    const wrapper = mountGhost()
    fireEvent.pointerDown(wrapper, { clientX: 30, clientY: 30 })
    fireEvent.pointerMove(document, { clientX: 900, clientY: 30 }) // past slop
    fireEvent.pointerUp(document, { clientX: 900, clientY: 30 }) // off-canvas
    expect(setNodes).not.toHaveBeenCalled() // drop placed nothing
    fireEvent.click(wrapper) // not swallowed — the tap the user meant
    expect(placedNodes()[0].position).toEqual({ x: 320, y: 250 })
  })

  it("does not activate on key auto-repeat", () => {
    fireEvent.keyDown(mountGhost(), { key: "Enter", repeat: true })
    expect(setNodes).not.toHaveBeenCalled()
  })
})
