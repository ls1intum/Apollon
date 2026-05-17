import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const calculateRouteMock = vi.fn<any, any>()
const diagramState: { nodes: any[] } = { nodes: [] }

vi.mock("@/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store")>()
  return {
    ...actual,
    useDiagramStore: (selector: any) => selector(diagramState),
  }
})

vi.mock("@/store/routingStore", () => ({
  useRoutingStore: (selector: any) =>
    selector({ calculateRoute: calculateRouteMock }),
}))

import { useOrthogonalRoute } from "@/edges/interactions/useOrthogonalRoute"

const basePath = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
]

describe("useOrthogonalRoute", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    calculateRouteMock.mockReset()
    diagramState.nodes = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("does not publish a debounced reroute that completes after cleanup", async () => {
    diagramState.nodes = [
      {
        id: "blocker",
        position: { x: 40, y: -10 },
        measured: { width: 30, height: 30 },
      },
    ]

    let resolveRoute: (path: any) => void = () => {}
    calculateRouteMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRoute = resolve
        })
    )

    const { result, unmount } = renderHook(() =>
      useOrthogonalRoute({
        edgeId: "e1",
        sourceNodeId: "s",
        targetNodeId: "t",
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        currentRoute: basePath,
        routingMode: "auto",
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(calculateRouteMock).toHaveBeenCalledTimes(1)

    unmount()

    await act(async () => {
      resolveRoute([
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ])
      await Promise.resolve()
    })

    expect(result.current).toBeUndefined()
  })

  it("manual edges still reroute when a node crosses the path, preserving userWaypoints", async () => {
    diagramState.nodes = [
      {
        id: "blocker",
        position: { x: 40, y: -10 },
        measured: { width: 30, height: 30 },
      },
    ]
    const reroutePath = [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
    ]
    calculateRouteMock.mockResolvedValue(reroutePath)

    const userWaypoints = [{ x: 50, y: 0 }]

    const { result } = renderHook(() =>
      useOrthogonalRoute({
        edgeId: "e2",
        sourceNodeId: "s",
        targetNodeId: "t",
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        currentRoute: basePath,
        userWaypoints,
        routingMode: "manual",
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(200)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(calculateRouteMock).toHaveBeenCalledTimes(1)
    const callArgs = calculateRouteMock.mock.calls[0]
    expect(callArgs[4]).toEqual(userWaypoints)
    expect(result.current).toEqual(reroutePath)
  })
})
