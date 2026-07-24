import { describe, expect, it, vi } from "vitest"
import {
  createEdgeGeometryStore,
  type EdgeGeometryStore,
} from "@/store/edgeGeometryStore"

const commitGeometry = (
  store: ReturnType<typeof createEdgeGeometryStore>,
  routes: Parameters<EdgeGeometryStore["setAllGeometry"]>[0],
  nodeGeometry?: Parameters<EdgeGeometryStore["setAllGeometry"]>[2],
  settlementPreview?: Parameters<EdgeGeometryStore["setAllGeometry"]>[3]
) =>
  store
    .getState()
    .setAllGeometry(
      routes,
      store.getState().routingEpoch,
      nodeGeometry,
      settlementPreview
    )

describe("edge geometry store", () => {
  it("rejects obsolete geometry after model replacement", () => {
    const store = createEdgeGeometryStore()
    const obsoleteEpoch = store.getState().routingEpoch
    commitGeometry(store, { previous: [{ x: -1, y: -1 }] })
    store.getState().beginRoutingBootstrap()

    expect(store.getState().routingReady).toBe(false)
    expect(store.getState().isSolving).toBe(true)
    expect(
      store
        .getState()
        .setAllGeometry({ obsolete: [{ x: 0, y: 0 }] }, obsoleteEpoch)
    ).toBe(false)
    expect(store.getState().geometryById).toEqual({})
    expect(store.getState().routingReady).toBe(false)

    const currentEpoch = store.getState().routingEpoch
    expect(
      store
        .getState()
        .setAllGeometry({ current: [{ x: 1, y: 1 }] }, currentEpoch)
    ).toBe(true)
    expect(store.getState().geometryById).toHaveProperty("current")
    expect(store.getState().routingReady).toBe(true)
  })

  it("lets exact consumers await the accepted background generation", async () => {
    const store = createEdgeGeometryStore()
    store.getState().setSolving(true)
    const settled = vi.fn()
    const waiting = store.getState().waitForSettled().then(settled)

    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()

    store.getState().setSolving(false)
    await waiting
    expect(settled).toHaveBeenCalledOnce()
    await expect(store.getState().waitForSettled()).resolves.toBeUndefined()
  })

  it("can wait for a solve that has not started yet", async () => {
    const store = createEdgeGeometryStore()
    const generation = store.getState().acceptedGeneration
    const settled = vi.fn()
    const waiting = store.getState().waitForSettled(generation).then(settled)

    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()

    commitGeometry(store, {})
    await waiting
    expect(settled).toHaveBeenCalledOnce()
    expect(store.getState().acceptedGeneration).toBe(generation + 1)
  })

  it("reuses unchanged route references across exact commits", () => {
    const store = createEdgeGeometryStore()
    const route = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    commitGeometry(store, { edge: route })
    const first = store.getState().geometryById.edge
    commitGeometry(store, {
      edge: route.map((point) => ({ ...point })),
    })
    expect(store.getState().geometryById.edge).toBe(first)
  })

  it("advances settled node geometry only with an exact commit", () => {
    const store = createEdgeGeometryStore()
    const route = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    const firstNodes = new Map([
      ["node", { x: 0, y: 0, width: 100, height: 80, type: "class" }],
    ])
    commitGeometry(store, { edge: route }, firstNodes)
    const accepted = store.getState().settledNodeGeometry

    store.getState().setPreviewGeometry({
      edge: [
        { x: 20, y: 0 },
        { x: 120, y: 0 },
      ],
    })
    expect(store.getState().settledNodeGeometry).toBe(accepted)

    // A content-identical exact snapshot retains its identity, keeping every
    // memoized label selector asleep.
    commitGeometry(
      store,
      { edge: route },
      new Map([["node", { x: 0, y: 0, width: 100, height: 80, type: "class" }]])
    )
    expect(store.getState().settledNodeGeometry).toBe(accepted)

    const movedNodes = new Map([
      ["node", { x: 20, y: 0, width: 100, height: 80, type: "class" }],
    ])
    commitGeometry(store, { edge: route }, movedNodes)
    expect(store.getState().settledNodeGeometry).toBe(movedNodes)
  })

  it("keeps preview geometry separate and granular by route reference", () => {
    const store = createEdgeGeometryStore()
    const exactA = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    const exactB = [
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ]
    commitGeometry(store, { a: exactA, b: exactB })
    const settled = store.getState().geometryById

    const movedB = [
      { x: 0, y: 30 },
      { x: 100, y: 30 },
    ]
    store.getState().setPreviewGeometry({
      a: exactA.map((point) => ({ ...point })),
      b: movedB,
    })
    const firstPreview = store.getState().previewById

    expect(store.getState().geometryById).toBe(settled)
    expect(firstPreview.a).toBe(settled.a)
    expect(firstPreview.b).toBe(movedB)

    store.getState().setPreviewGeometry({
      a: exactA.map((point) => ({ ...point })),
      b: movedB.map((point) => ({ ...point })),
    })
    expect(store.getState().previewById.a).toBe(settled.a)
    expect(store.getState().previewById.b).toBe(firstPreview.b)
  })

  it("clears the preview atomically when an exact generation commits", () => {
    const store = createEdgeGeometryStore()
    const exact = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    commitGeometry(store, { edge: exact })
    const settledMap = store.getState().geometryById
    const settledRoute = store.getState().geometryById.edge
    store.getState().setPreviewGeometry({
      edge: [
        { x: 0, y: 20 },
        { x: 100, y: 20 },
      ],
    })

    const observed: Array<{
      exact: typeof exact
      preview: typeof exact | undefined
    }> = []
    const unsubscribe = store.subscribe((state) =>
      observed.push({
        exact: state.geometryById.edge,
        preview: state.previewById.edge,
      })
    )
    commitGeometry(store, {
      edge: exact.map((point) => ({ ...point })),
    })
    unsubscribe()

    expect(observed).toHaveLength(1)
    expect(observed[0]).toEqual({
      exact: settledRoute,
      preview: undefined,
    })
    expect(store.getState().geometryById).toBe(settledMap)
    expect(store.getState().geometryById.edge).toBe(settledRoute)
    expect(store.getState().previewById).toEqual({})
  })

  it("promotes a matching preview route on exact commit", () => {
    const store = createEdgeGeometryStore()
    commitGeometry(store, {
      edge: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    })
    const preview = [
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ]
    store.getState().setPreviewGeometry({ edge: preview })
    const displayed = store.getState().previewById.edge

    commitGeometry(store, {
      edge: preview.map((point) => ({ ...point })),
    })

    expect(store.getState().geometryById.edge).toBe(displayed)
    expect(store.getState().previewById).toEqual({})
  })

  it("can retain a display-only handoff while exact geometry settles", () => {
    const store = createEdgeGeometryStore()
    const preview = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    const exact = [
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ]
    commitGeometry(store, { edge: preview })
    store.getState().setPreviewGeometry({ edge: preview })

    const observed: Array<{
      exact: typeof exact
      preview: typeof preview | undefined
    }> = []
    const unsubscribe = store.subscribe((state) =>
      observed.push({
        exact: state.geometryById.edge,
        preview: state.previewById.edge,
      })
    )
    commitGeometry(store, { edge: exact }, undefined, { edge: preview })
    unsubscribe()

    expect(observed).toHaveLength(1)
    expect(observed[0].exact).toBe(exact)
    expect(observed[0].preview).toBe(preview)
  })

  it("can clear a transient preview without changing settled geometry", () => {
    const store = createEdgeGeometryStore()
    const exact = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    commitGeometry(store, { edge: exact })
    const settled = store.getState().geometryById
    store.getState().setPreviewGeometry({
      edge: [
        { x: 0, y: 10 },
        { x: 100, y: 10 },
      ],
    })

    store.getState().clearPreviewGeometry()

    expect(store.getState().previewById).toEqual({})
    expect(store.getState().geometryById).toBe(settled)
  })
})
