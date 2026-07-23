import { describe, expect, it } from "vitest"
import {
  ConnectionMode,
  Position,
  type Edge,
  type InternalNode,
  type Node,
} from "@xyflow/react"
import {
  computeAllEdgeGeometry,
  type EdgeSolveCacheEntry,
  type SolverInput,
} from "@/utils/geometry/edgeGeometrySolver"
import { handleEdgeGeometryWorkerRequest } from "@/utils/geometry/edgeGeometryWorkerHandler"
import {
  deserializeEdgeSolveCache,
  EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
  serializeEdgeSolveCache,
  serializeSolverInput,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"

type TestNode = { node: Node; internal: InternalNode }

const makeNode = (
  id: string,
  x: number,
  y: number,
  width = 160,
  height = 100
): TestNode => {
  const node = {
    id,
    type: "Class",
    position: { x, y },
    width,
    height,
    measured: { width, height },
    data: {},
  } as Node
  const internal = {
    ...node,
    internals: {
      positionAbsolute: { x, y },
      handleBounds: {
        source: [
          {
            id: null,
            type: "source",
            position: Position.Right,
            x: width,
            y: height / 2,
            width: 1,
            height: 1,
          },
        ],
        target: [
          {
            id: null,
            type: "target",
            position: Position.Left,
            x: 0,
            y: height / 2,
            width: 1,
            height: 1,
          },
        ],
      },
    },
  } as unknown as InternalNode
  return { node, internal }
}

const solverInput = (
  nodes: readonly TestNode[],
  edges: readonly Edge[]
): SolverInput => ({
  nodes: nodes.map(({ node }) => node),
  nodeLookup: new Map(nodes.map(({ node, internal }) => [node.id, internal])),
  connectionMode: ConnectionMode.Loose,
  edges,
  straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
  straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
})

/**
 * Exercise the production DTO and worker handler. Omitting `solveCache` models
 * an independent cold worker; passing one models the worker's session-local cache.
 */
const workerRoundTrip = (
  input: SolverInput,
  solveCache?: Map<string, EdgeSolveCacheEntry>,
  revision = 1
) => {
  const result = handleEdgeGeometryWorkerRequest(
    {
      protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
      sessionId: "equivalence",
      revision,
      kind: "solve",
      input: structuredClone(serializeSolverInput(input)),
    },
    solveCache
  )
  if (result.kind === "error") throw new Error(result.message)
  return result.routeById
}

const reordered = (input: SolverInput): SolverInput => {
  const nodes = [...input.nodes].reverse()
  const lookupEntries = [...input.nodeLookup.entries()].reverse()
  return {
    ...input,
    nodes,
    nodeLookup: new Map(lookupEntries),
    edges: [input.edges[2], input.edges[0], input.edges[1]],
  }
}

const frame = (step: number): SolverInput => {
  const targetShift = [0, 35, -25, 60][step]
  const blockerShift = [0, -20, 45, 15][step]
  const pinRatio = [0.72, 0.58, 0.81, 0.64][step]
  const bendX = [-120, -85, -150, -100][step]

  const hub = makeNode("hub", 0, 100)
  const upper = makeNode("upper", 520, -40 + targetShift)
  const lower = makeNode("lower", 500 + targetShift, 280)
  const blocker = makeNode("blocker", 255, 65 + blockerShift, 120, 210)
  const manualSource = makeNode("manual-source", -200, -300, 120, 80)
  const manualTarget = makeNode("manual-target", 320, 430, 120, 80)

  const automatic: Edge = {
    id: "automatic",
    source: "hub",
    target: "upper",
    type: "ClassUnidirectional",
  }
  const pinned: Edge = {
    id: "pinned",
    source: "hub",
    target: "lower",
    type: "ClassUnidirectional",
    data: {
      sourceAnchor: { side: Position.Bottom, ratio: pinRatio },
      targetAnchor: { side: Position.Left, ratio: 0.35 },
    },
  }
  const authored: Edge = {
    id: "authored",
    source: "manual-source",
    target: "manual-target",
    type: "ClassUnidirectional",
    data: {
      sourceAnchor: { side: Position.Bottom, ratio: 0.5 },
      targetAnchor: { side: Position.Top, ratio: 0.5 },
      points: [
        { x: -140, y: -220 },
        { x: bendX, y: 120 },
        { x: 380, y: 120 },
        { x: 380, y: 430 },
      ],
    },
  }

  return solverInput(
    [hub, upper, lower, blocker, manualSource, manualTarget],
    [automatic, pinned, authored]
  )
}

describe("edge geometry execution-mode equivalence", () => {
  it("matches cold, incremental, reordered, and worker-style solves through a drag trajectory", () => {
    const cache = new Map<string, EdgeSolveCacheEntry>()

    for (let step = 0; step < 4; step++) {
      const current = frame(step)
      const cold = computeAllEdgeGeometry(current).routeById
      const incremental = computeAllEdgeGeometry({
        ...current,
        solveCache: cache,
      }).routeById
      const shuffled = computeAllEdgeGeometry(reordered(current)).routeById
      const worker = workerRoundTrip(current)

      expect(incremental, `incremental frame ${step}`).toEqual(cold)
      expect(shuffled, `reordered frame ${step}`).toEqual(cold)
      expect(worker, `worker frame ${step}`).toEqual(cold)

      const pinRatio = [0.72, 0.58, 0.81, 0.64][step]
      const targetShift = [0, 35, -25, 60][step]
      expect(incremental.pinned[0].x).toBeCloseTo(160 * pinRatio, 0)
      expect(incremental.pinned[0].y).toBe(200)
      expect(incremental.pinned.at(-1)!.x).toBe(500 + targetShift)
      expect(incremental.pinned.at(-1)!.y).toBeCloseTo(315, 0)
      expect(incremental.authored[0]).toEqual({ x: -140, y: -220 })
      expect(incremental.authored.at(-1)).toEqual({ x: 380, y: 430 })
      expect(incremental.authored.length).toBeGreaterThan(2)
    }
  })

  it("keeps a live bend trajectory equal across cold and incremental execution", () => {
    const cache = new Map<string, EdgeSolveCacheEntry>()
    const baseFrame = frame(0)
    const authored = baseFrame.edges.find(({ id }) => id === "authored")!

    for (const x of [-90, -40, -135, -70]) {
      const points = [
        { x: -140, y: -220 },
        { x, y: 90 },
        { x: 380, y: 90 },
        { x: 380, y: 430 },
      ]
      const input: SolverInput = {
        ...baseFrame,
        liveOverride: {
          edgeId: authored.id,
          points,
          strategy: "authoritative",
        },
      }
      const cold = computeAllEdgeGeometry(input).routeById
      const incremental = computeAllEdgeGeometry({
        ...input,
        solveCache: cache,
      }).routeById
      const worker = workerRoundTrip(input)

      expect(incremental).toEqual(cold)
      expect(worker).toEqual(cold)
      expect(cold.authored).toEqual(points)
    }
  })

  it("keeps persistent worker and synchronous caches exact in both trajectory directions", () => {
    const syncCache = new Map<string, EdgeSolveCacheEntry>()
    const workerCache = new Map<string, EdgeSolveCacheEntry>()
    const steps = [0, 1, 3, 2, 0, 2, 3, 1, 0]

    for (let revision = 0; revision < steps.length; revision++) {
      const current = frame(steps[revision])
      const cold = computeAllEdgeGeometry(current).routeById
      const synchronous = computeAllEdgeGeometry({
        ...current,
        solveCache: syncCache,
      }).routeById
      const worker = workerRoundTrip(current, workerCache, revision)

      expect(synchronous, `synchronous revision ${revision}`).toEqual(cold)
      expect(worker, `worker revision ${revision}`).toEqual(cold)
      expect(worker, `execution modes revision ${revision}`).toEqual(
        synchronous
      )
    }
  })

  it("bootstraps the first Worker solve from the synchronous cache without changing its result", () => {
    const input = frame(0)
    const synchronousCache = new Map<string, EdgeSolveCacheEntry>()
    const expected = computeAllEdgeGeometry({
      ...input,
      solveCache: synchronousCache,
    }).routeById
    expect(synchronousCache.size).toBeGreaterThan(0)

    const serializedInput = structuredClone(serializeSolverInput(input))
    const initialCache = structuredClone(
      serializeEdgeSolveCache(synchronousCache)
    )
    const seededWorkerCache = new Map<string, EdgeSolveCacheEntry>()
    const seeded = handleEdgeGeometryWorkerRequest(
      {
        protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
        sessionId: "seeded",
        revision: 1,
        kind: "solve",
        input: serializedInput,
        initialCache,
      },
      seededWorkerCache
    )
    const cold = handleEdgeGeometryWorkerRequest(
      {
        protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
        sessionId: "cold",
        revision: 1,
        kind: "solve",
        input: serializedInput,
      },
      new Map()
    )

    expect(seeded.kind).toBe("result")
    expect(cold.kind).toBe("result")
    if (seeded.kind !== "result" || cold.kind !== "result") return
    expect(seeded.routeById).toEqual(expected)
    expect(seeded.routeById).toEqual(cold.routeById)
    expect(seededWorkerCache.size).toBe(synchronousCache.size)
    expect(seeded.perfDelta!.routerSearches).toBeLessThan(
      cold.perfDelta!.routerSearches
    )
  })

  it("never replaces a non-empty Worker cache with a later bootstrap payload", () => {
    const input = frame(0)
    const synchronousCache = new Map<string, EdgeSolveCacheEntry>()
    const expected = computeAllEdgeGeometry({
      ...input,
      solveCache: synchronousCache,
    }).routeById
    const workerCache = deserializeEdgeSolveCache(
      serializeEdgeSolveCache(synchronousCache)
    )
    const [firstEdgeId] = workerCache.keys()
    const retainedEntry = workerCache.get(firstEdgeId)
    const lateBootstrap = serializeEdgeSolveCache(synchronousCache)
    lateBootstrap[0][1].computed = [{ x: 999_999, y: 999_999 }]

    const response = handleEdgeGeometryWorkerRequest(
      {
        protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
        sessionId: "already-seeded",
        revision: 2,
        kind: "solve",
        input: serializeSolverInput(input),
        initialCache: lateBootstrap,
      },
      workerCache
    )

    expect(response.kind).toBe("result")
    if (response.kind !== "result") return
    expect(response.routeById).toEqual(expected)
    expect(workerCache.get(firstEdgeId)).toBe(retainedEntry)
  })
})
