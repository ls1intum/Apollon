import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { PointerEvent as ReactPointerEvent } from "react"

type TestNode = {
  id: string
  position: { x: number; y: number }
  measured?: { width: number; height: number }
}

const calculateRouteMock = vi.fn()
const findHandleMock = vi.fn()
const diagramState: { nodes: TestNode[] } = { nodes: [] }
const metadataActions = {
  startConnectionGuidance: vi.fn(),
  setConnectionGuidanceTarget: vi.fn(),
  stopConnectionGuidance: vi.fn(),
}

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>()
  return {
    ...actual,
    useReactFlow: () => ({
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({
        x,
        y,
      }),
    }),
  }
})

vi.mock("@/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store")>()
  type DiagramSelector = (state: typeof diagramState) => unknown
  type MetadataSelector = (state: typeof metadataActions) => unknown
  return {
    ...actual,
    useDiagramStore: (selector: DiagramSelector) => selector(diagramState),
    useMetadataStore: (selector: MetadataSelector) => selector(metadataActions),
  }
})

vi.mock("@/store/routingStore", () => ({
  useRoutingStore: (
    selector?: (state: { calculateRoute: typeof calculateRouteMock }) => unknown
  ) => {
    const state = { calculateRoute: calculateRouteMock }
    return typeof selector === "function" ? selector(state) : state
  },
}))

vi.mock("@/hooks/useHandleFinder", () => ({
  useHandleFinder: () => ({
    findBestHandleAtClientPosition: findHandleMock,
  }),
}))

import { useEdgeInteractions } from "@/edges/interactions/useEdgeInteractions"

const initialSegments = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
]

function makePointerDownEvent(clientX: number, clientY: number) {
  return {
    clientX,
    clientY,
    pointerId: 1,
    stopPropagation: vi.fn(),
    target: {
      setPointerCapture: vi.fn(),
    } as unknown as Element,
  } as unknown as ReactPointerEvent<SVGElement>
}

describe("useEdgeInteractions — endpoint drag final-route contract", () => {
  beforeEach(() => {
    calculateRouteMock.mockReset()
    findHandleMock.mockReset()
    Object.values(metadataActions).forEach((fn) => fn.mockReset())
    diagramState.nodes = [
      {
        id: "src",
        position: { x: 0, y: 0 },
        measured: { width: 100, height: 60 },
      },
      {
        id: "tgt",
        position: { x: 400, y: 0 },
        measured: { width: 100, height: 60 },
      },
      {
        id: "other",
        position: { x: 200, y: 200 },
        measured: { width: 80, height: 60 },
      },
    ]
  })

  it("commits using the handle found at the release event, not the one previously hovered", async () => {
    // The handle returned depends on clientX so we can distinguish preview
    // vs. release calls. The rAF loop calls findHandle many times during
    // the drag (we don't care how many); what matters is the FINAL call,
    // which must come from the pointer-up handler with the release coords.
    findHandleMock.mockImplementation((clientX: number) =>
      clientX > 200
        ? { handle: "left", node: { id: "other" } }
        : { handle: "right", node: { id: "src" } }
    )

    calculateRouteMock.mockResolvedValue([
      { x: 50, y: 50 },
      { x: 200, y: 200 },
    ])

    const onCommit = vi.fn()

    const { result } = renderHook(() =>
      useEdgeInteractions("e1", initialSegments, {
        sourceNodeId: "src",
        targetNodeId: "tgt",
        onCommit,
      })
    )

    // Start a target drag at clientX=50 (preview region).
    await act(async () => {
      result.current.onHandlePointerDown(makePointerDownEvent(50, 50), false)
    })
    expect(metadataActions.startConnectionGuidance).toHaveBeenCalledWith(
      "tgt",
      null
    )

    // Simulate the release event at clientX=240 ("other" region).
    await act(async () => {
      const upEvent = new Event("pointerup") as Event & {
        clientX: number
        clientY: number
      }
      upEvent.clientX = 240
      upEvent.clientY = 230
      window.dispatchEvent(upEvent)
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(onCommit).toHaveBeenCalledTimes(1)
    const commit = onCommit.mock.calls[0][0]
    expect(commit).not.toBeNull()
    expect(commit.drag.kind).toBe("target")
    // The committed handle must be the one found at release, NOT the preview.
    expect(commit.drag.handle).toEqual({ nodeId: "other", handleId: "left" })
    expect(metadataActions.stopConnectionGuidance).toHaveBeenCalled()
  })

  it("aborts (commits null) when release is off any handle, even if a handle was previously hovered", async () => {
    // Preview sees a handle (clientX < 800), release is in the void (>= 800).
    findHandleMock.mockImplementation((clientX: number) =>
      clientX >= 800
        ? { handle: null, node: null }
        : { handle: "left", node: { id: "other" } }
    )

    calculateRouteMock.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 999, y: 999 },
    ])

    const onCommit = vi.fn()

    const { result } = renderHook(() =>
      useEdgeInteractions("e2", initialSegments, {
        sourceNodeId: "src",
        targetNodeId: "tgt",
        onCommit,
      })
    )

    await act(async () => {
      result.current.onHandlePointerDown(makePointerDownEvent(50, 0), true)
    })

    await act(async () => {
      const upEvent = new Event("pointerup") as Event & {
        clientX: number
        clientY: number
      }
      upEvent.clientX = 999
      upEvent.clientY = 999
      window.dispatchEvent(upEvent)
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(onCommit).toHaveBeenCalledWith(null)
  })
})
