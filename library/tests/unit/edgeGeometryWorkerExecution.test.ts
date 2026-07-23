import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { describe, expect, it, vi } from "vitest"
import {
  ConnectionMode,
  Position,
  type Edge,
  type InternalNode,
  type Node,
} from "@xyflow/react"
import {
  EDGE_GEOMETRY_WORKER_PREVIEW_EDGE_THRESHOLD,
  EdgeGeometryWorkerController,
  shouldSampleEdgeGeometryWorker,
  shouldUseEdgeGeometryWorker,
  type EdgeGeometryWorkerPort,
} from "@/utils/geometry/edgeGeometryWorkerController"
import {
  deserializeEdgeSolveCache,
  deserializeSolverInput,
  EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
  serializeEdgeSolveCache,
  serializeSolverInput,
  type EdgeGeometrySolveRequest,
  type SerializedEdgeSolveCache,
  type SerializedSolverInput,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"
import {
  computeAllEdgeGeometry,
  type EdgeSolveCacheEntry,
  type SolverInput,
} from "@/utils/geometry/edgeGeometrySolver"
import { handleEdgeGeometryWorkerRequest } from "@/utils/geometry/edgeGeometryWorkerHandler"
import { getPerfCounters } from "@/sync/perfCounters"

const emptyInput = (): SerializedSolverInput => ({
  nodes: [],
  nodeLookup: [],
  connectionMode: "loose",
  edges: [],
  straightPathTypes: [],
  straightHookTypes: [],
})

const resultFor = (request: EdgeGeometrySolveRequest) => ({
  protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
  sessionId: request.sessionId,
  revision: request.revision,
  kind: "result" as const,
  routeById: {},
  durationMs: 1,
})

const makeRoutingNode = (
  id: string,
  x: number,
  y: number,
  width = 120,
  height = 80
): { node: Node; internal: InternalNode } => {
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
      userNode: node,
      z: 0,
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

const routingInput = (targetY = 0): SolverInput => {
  const source = makeRoutingNode("source", 0, 0)
  const blocker = makeRoutingNode("blocker", 220, -20, 100, 120)
  const target = makeRoutingNode("target", 480, targetY)
  const nodes = [source, blocker, target]
  return {
    nodes: nodes.map(({ node }) => node),
    nodeLookup: new Map(nodes.map(({ node, internal }) => [node.id, internal])),
    connectionMode: ConnectionMode.Loose,
    edges: [
      {
        id: "edge",
        source: "source",
        target: "target",
        type: "ClassUnidirectional",
      },
    ],
    straightPathTypes: new Set(["ClassUnidirectional"]),
    straightHookTypes: new Set(),
  }
}

const resolveLocalRuntimeImport = (
  specifier: string,
  importer: string,
  libraryRoot: string
): string | null => {
  const unresolved = specifier.startsWith("@/")
    ? path.join(libraryRoot, specifier.slice(2))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(importer), specifier)
      : null
  if (!unresolved) return null

  for (const candidate of [
    unresolved,
    `${unresolved}.ts`,
    `${unresolved}.tsx`,
    path.join(unresolved, "index.ts"),
    path.join(unresolved, "index.tsx"),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      return candidate
  }
  throw new Error(
    `Could not resolve Worker import "${specifier}" from ${importer}`
  )
}

/**
 * Follow the emitted JavaScript imports, not the raw TypeScript imports:
 * `transpileModule` erases both `import type` and value imports used only as
 * types, matching the boundary Vite bundles for the Worker.
 */
const getWorkerRuntimeGraph = () => {
  const libraryRoot = path.resolve(process.cwd(), "lib")
  const entry = path.join(libraryRoot, "utils/geometry/edgeGeometry.worker.ts")
  const localModules = new Set<string>()
  const packages = new Set<string>()
  const pending = [entry]

  while (pending.length > 0) {
    const file = pending.pop()!
    if (localModules.has(file)) continue
    localModules.add(file)

    const emitted = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
    const source = ts.createSourceFile(
      `${file}.js`,
      emitted,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.JS
    )

    for (const statement of source.statements) {
      if (
        (ts.isImportDeclaration(statement) ||
          ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const specifier = statement.moduleSpecifier.text
        const local = resolveLocalRuntimeImport(specifier, file, libraryRoot)
        if (local) pending.push(local)
        else packages.add(specifier)
      }
    }
  }

  return { libraryRoot, localModules, packages }
}

describe("EdgeGeometryWorkerController", () => {
  it("keeps the initial and small solves synchronous", () => {
    const decision = (
      hasRunInitialSolve: boolean,
      edgeCount: number,
      disabled = false
    ) =>
      shouldUseEdgeGeometryWorker({
        hasRunInitialSolve,
        edgeCount,
        threshold: 32,
        disabled,
      })

    expect(decision(false, 200)).toBe(false)
    expect(decision(true, 31)).toBe(false)
    expect(decision(true, 32)).toBe(true)
    expect(decision(true, 200, true)).toBe(false)
  })

  it("defers only large actively changing scenes", () => {
    expect(
      shouldSampleEdgeGeometryWorker({
        edgeCount: EDGE_GEOMETRY_WORKER_PREVIEW_EDGE_THRESHOLD - 1,
        interacting: true,
      })
    ).toBe(false)
    expect(
      shouldSampleEdgeGeometryWorker({
        edgeCount: EDGE_GEOMETRY_WORKER_PREVIEW_EDGE_THRESHOLD,
        interacting: false,
      })
    ).toBe(false)
    expect(
      shouldSampleEdgeGeometryWorker({
        edgeCount: EDGE_GEOMETRY_WORKER_PREVIEW_EDGE_THRESHOLD,
        interacting: true,
      })
    ).toBe(true)
  })

  it("keeps one solve in flight and collapses queued frames to the latest revision", () => {
    const requests: EdgeGeometrySolveRequest[] = []
    const accepted: number[] = []
    const worker: EdgeGeometryWorkerPort = {
      postMessage: (request) => requests.push(request),
      terminate: vi.fn(),
    }
    const controller = new EdgeGeometryWorkerController({
      sessionId: "session",
      worker,
      onResult: ({ revision }) => accepted.push(revision),
      onFailure: vi.fn(),
    })

    expect(controller.submit(emptyInput())).toBe(1)
    expect(controller.submit(emptyInput())).toBe(2)
    expect(controller.submit(emptyInput())).toBe(3)
    expect(requests.map(({ revision }) => revision)).toEqual([1])

    controller.receive(resultFor(requests[0]))
    expect(accepted).toEqual([])
    expect(requests.map(({ revision }) => revision)).toEqual([1, 3])

    controller.receive(resultFor(requests[1]))
    expect(accepted).toEqual([3])
  })

  it("reports superseded exact generations as provisional without settling them", () => {
    const requests: EdgeGeometrySolveRequest[] = []
    const settled: number[] = []
    const provisional: number[] = []
    const controller = new EdgeGeometryWorkerController({
      sessionId: "session",
      worker: {
        postMessage: (request) => requests.push(request),
        terminate: vi.fn(),
      },
      onResult: ({ revision }) => settled.push(revision),
      onProvisionalResult: ({ revision }) => provisional.push(revision),
      onFailure: vi.fn(),
    })

    controller.submit(emptyInput())
    controller.submit(emptyInput())
    controller.submit(emptyInput())
    controller.receive(resultFor(requests[0]))

    expect(provisional).toEqual([1])
    expect(settled).toEqual([])
    expect(requests.map(({ revision }) => revision)).toEqual([1, 3])

    // A duplicate old result is neither a second preview nor a settled commit.
    controller.receive(resultFor(requests[0]))
    expect(provisional).toEqual([1])
    controller.receive(resultFor(requests[1]))
    expect(settled).toEqual([3])
  })

  it("continues sampled provisional work while pointer frames supersede it", () => {
    const requests: EdgeGeometrySolveRequest[] = []
    const settled: number[] = []
    const provisional: number[] = []
    const controller = new EdgeGeometryWorkerController({
      sessionId: "session",
      worker: {
        postMessage: (request) => requests.push(request),
        terminate: vi.fn(),
      },
      onResult: ({ revision }) => settled.push(revision),
      onProvisionalResult: ({ revision }) => provisional.push(revision),
      onFailure: vi.fn(),
    })

    controller.submit(emptyInput()) // in flight
    controller.submit(emptyInput()) // cadence-sampled pending
    controller.supersede() // a newer unsampled pointer frame
    controller.receive(resultFor(requests[0]))

    // The pending sample is stale for settlement, but still runs so the UI gets
    // bounded-lag holistic progress instead of freezing until pointer-up.
    expect(requests.map(({ revision }) => revision)).toEqual([1, 2])
    expect(provisional).toEqual([1])
    controller.receive(resultFor(requests[1]))
    expect(provisional).toEqual([1, 2])
    expect(settled).toEqual([])

    const release = controller.submit(emptyInput())
    controller.receive(resultFor(requests[2]))
    expect(settled).toEqual([release])
  })

  it("distinguishes soft supersession from a hard synchronous invalidation", () => {
    const requests: EdgeGeometrySolveRequest[] = []
    const settled: number[] = []
    const provisional: number[] = []
    const controller = new EdgeGeometryWorkerController({
      sessionId: "session",
      worker: {
        postMessage: (request) => requests.push(request),
        terminate: vi.fn(),
      },
      onResult: ({ revision }) => settled.push(revision),
      onProvisionalResult: ({ revision }) => provisional.push(revision),
      onFailure: vi.fn(),
    })

    controller.submit(emptyInput())
    expect(controller.supersede()).toBe(2)
    controller.receive(resultFor(requests[0]))
    expect(provisional).toEqual([1])

    controller.submit(emptyInput())
    expect(controller.invalidate()).toBe(4)
    controller.receive(resultFor(requests[1]))
    expect(provisional).toEqual([1])
    expect(settled).toEqual([])
  })

  it("does not let a stale solve error discard the pending latest revision", () => {
    const requests: EdgeGeometrySolveRequest[] = []
    const accepted: number[] = []
    const onProvisionalResult = vi.fn()
    const onFailure = vi.fn()
    const controller = new EdgeGeometryWorkerController({
      sessionId: "session",
      worker: {
        postMessage: (request) => requests.push(request),
        terminate: vi.fn(),
      },
      onResult: ({ revision }) => accepted.push(revision),
      onProvisionalResult,
      onFailure,
    })

    controller.submit(emptyInput())
    controller.submit(emptyInput())
    controller.receive({
      protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
      sessionId: "session",
      revision: 1,
      kind: "error",
      message: "obsolete geometry failed",
    })

    expect(onFailure).not.toHaveBeenCalled()
    expect(onProvisionalResult).not.toHaveBeenCalled()
    expect(requests.map(({ revision }) => revision)).toEqual([1, 2])
    controller.receive(resultFor(requests[1]))
    expect(accepted).toEqual([2])
  })

  it("attaches the synchronous cache only to the first Worker request", () => {
    const requests: EdgeGeometrySolveRequest[] = []
    const controller = new EdgeGeometryWorkerController({
      sessionId: "session",
      worker: {
        postMessage: (request) => requests.push(request),
        terminate: vi.fn(),
      },
      onResult: vi.fn(),
      onFailure: vi.fn(),
    })
    const initialCache = serializeEdgeSolveCache(
      new Map<string, EdgeSolveCacheEntry>([
        [
          "edge",
          {
            sig: "initial",
            routeSig: "route",
            computed: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
            ],
          },
        ],
      ])
    )

    controller.submit(emptyInput(), initialCache)
    controller.submit(emptyInput(), initialCache)
    expect(requests[0].initialCache).toEqual(initialCache)

    controller.receive(resultFor(requests[0]))
    expect(requests[1].initialCache).toBeUndefined()
  })

  it("keeps invalidation, duplicate replies, and the one-shot bootstrap revision-safe", () => {
    const requests: EdgeGeometrySolveRequest[] = []
    const accepted: number[] = []
    const controller = new EdgeGeometryWorkerController({
      sessionId: "session",
      worker: {
        postMessage: (request) => requests.push(request),
        terminate: vi.fn(),
      },
      onResult: ({ revision }) => accepted.push(revision),
      onFailure: vi.fn(),
    })
    const initialCache = serializeEdgeSolveCache(
      new Map<string, EdgeSolveCacheEntry>([
        [
          "edge",
          {
            sig: "initial",
            routeSig: "",
            computed: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
            ],
          },
        ],
      ])
    )

    expect(controller.submit(emptyInput(), initialCache)).toBe(1)
    expect(controller.submit(emptyInput(), initialCache)).toBe(2)
    expect(controller.invalidate()).toBe(3)
    expect(controller.submit(emptyInput(), initialCache)).toBe(4)

    controller.receive(resultFor(requests[0]))
    expect(requests.map(({ revision }) => revision)).toEqual([1, 4])
    expect(requests[0].initialCache).toEqual(initialCache)
    expect(requests[1].initialCache).toBeUndefined()

    // A duplicated old reply cannot clear or accept the current in-flight solve.
    controller.receive(resultFor(requests[0]))
    expect(accepted).toEqual([])
    controller.receive(resultFor(requests[1]))
    expect(accepted).toEqual([4])
  })

  it("invalidates an outstanding result before a synchronous solve", () => {
    const requests: EdgeGeometrySolveRequest[] = []
    const onResult = vi.fn()
    const controller = new EdgeGeometryWorkerController({
      sessionId: "session",
      worker: {
        postMessage: (request) => requests.push(request),
        terminate: vi.fn(),
      },
      onResult,
      onFailure: vi.fn(),
    })

    controller.submit(emptyInput())
    expect(controller.invalidate()).toBe(2)
    controller.receive(resultFor(requests[0]))

    expect(onResult).not.toHaveBeenCalled()
  })

  it("rejects wrong-session messages and terminates exactly once", () => {
    const requests: EdgeGeometrySolveRequest[] = []
    const terminate = vi.fn()
    const onResult = vi.fn()
    const onProvisionalResult = vi.fn()
    const controller = new EdgeGeometryWorkerController({
      sessionId: "current",
      worker: {
        postMessage: (request) => requests.push(request),
        terminate,
      },
      onResult,
      onProvisionalResult,
      onFailure: vi.fn(),
    })
    controller.submit(emptyInput())
    controller.submit(emptyInput())

    controller.receive({
      ...resultFor(requests[0]),
      sessionId: "previous-mount",
    })
    expect(onResult).not.toHaveBeenCalled()
    expect(onProvisionalResult).not.toHaveBeenCalled()

    controller.dispose()
    controller.dispose()
    expect(terminate).toHaveBeenCalledTimes(1)
  })

  it("surfaces postMessage failures so the caller can switch to sync", () => {
    const onFailure = vi.fn()
    const controller = new EdgeGeometryWorkerController({
      sessionId: "session",
      worker: {
        postMessage: () => {
          throw new DOMException("could not clone", "DataCloneError")
        },
        terminate: vi.fn(),
      },
      onResult: vi.fn(),
      onFailure,
    })

    controller.submit(emptyInput())
    expect(onFailure).toHaveBeenCalledWith("could not clone")
  })
})

describe("edge geometry Worker runtime boundary", () => {
  it("cannot pull React or rendered-editor modules into the Worker graph", () => {
    const { libraryRoot, localModules, packages } = getWorkerRuntimeGraph()
    const relativeModules = [...localModules].map((file) =>
      path.relative(libraryRoot, file).replaceAll(path.sep, "/")
    )
    const renderedEditorModules = relativeModules.filter(
      (file) =>
        /^(components|hooks|nodes|store|styles)\//.test(file) ||
        file === "constants.ts" ||
        (file.startsWith("edges/") && file !== "edges/Connection.ts")
    )
    const renderedEditorPackages = [...packages].filter((specifier) =>
      /^(react(?:-dom)?(?:\/|$)|@xyflow\/react$|@base-ui\/|lucide-react$|zustand(?:\/|$)|@tumaet\/ui$)/.test(
        specifier
      )
    )

    expect(renderedEditorModules).toEqual([])
    expect(renderedEditorPackages).toEqual([])
    expect(relativeModules).toContain("utils/geometry/routingConstants.ts")
    expect(relativeModules).not.toContain("constants.ts")
  })
})

describe("edge geometry worker DTO", () => {
  it("round-trips a clone-safe cache with bounded, flat alternative history", () => {
    const alternatives: EdgeSolveCacheEntry[] = Array.from(
      { length: 6 },
      (_, index) => ({
        sig: `alternative-${index}`,
        routeSig: `route-${index}`,
        computed: [
          { x: 0, y: index },
          { x: 100, y: index },
        ],
        alternatives: [
          {
            sig: `nested-${index}`,
            routeSig: "",
            computed: [{ x: index, y: index }],
          },
        ],
      })
    )
    const source = new Map<string, EdgeSolveCacheEntry>([
      [
        "edge",
        {
          sig: "active",
          routeSig: "active-route",
          computed: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
          sourceAnchor: { side: Position.Right, ratio: 0.25 },
          targetAnchor: { side: Position.Left, ratio: 0.75 },
          alternatives,
        },
      ],
    ])

    const serialized = structuredClone(serializeEdgeSolveCache(source))
    const roundTripped = deserializeEdgeSolveCache(serialized)
    const entry = roundTripped.get("edge")!

    expect(entry).toMatchObject({
      sig: "active",
      routeSig: "active-route",
      sourceAnchor: { side: Position.Right, ratio: 0.25 },
      targetAnchor: { side: Position.Left, ratio: 0.75 },
    })
    expect(entry.alternatives?.map(({ sig }) => sig)).toEqual([
      "alternative-0",
      "alternative-1",
      "alternative-2",
      "alternative-3",
    ])
    expect(entry.alternatives?.every((item) => !item.alternatives)).toBe(true)

    entry.computed[0].x = 999
    expect(source.get("edge")!.computed[0].x).toBe(10)
  })

  it("hydrates the Worker from the synchronous cache without repeating the route search", () => {
    const input = routingInput()
    const synchronousCache = new Map<string, EdgeSolveCacheEntry>()
    const synchronous = computeAllEdgeGeometry({
      ...input,
      solveCache: synchronousCache,
    }).routeById
    expect(synchronousCache.has("edge")).toBe(true)

    const workerCache = new Map<string, EdgeSolveCacheEntry>()
    const searchesBefore = getPerfCounters()!.routerSearches
    const result = handleEdgeGeometryWorkerRequest(
      {
        protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
        sessionId: "bootstrap",
        revision: 1,
        kind: "solve",
        input: structuredClone(serializeSolverInput(input)),
        initialCache: structuredClone(
          serializeEdgeSolveCache(synchronousCache)
        ),
      },
      workerCache
    )

    expect(result.kind).toBe("result")
    if (result.kind !== "result") return
    expect(result.routeById).toEqual(synchronous)
    expect(getPerfCounters()!.routerSearches).toBe(searchesBefore)
    expect(workerCache.has("edge")).toBe(true)
  })

  it("invalidates stale synchronous entries when the first Worker snapshot is newer", () => {
    const synchronousCache = new Map<string, EdgeSolveCacheEntry>()
    computeAllEdgeGeometry({
      ...routingInput(0),
      solveCache: synchronousCache,
    })
    const newerInput = routingInput(70)
    const cold = computeAllEdgeGeometry(newerInput).routeById
    const workerCache = new Map<string, EdgeSolveCacheEntry>()

    const result = handleEdgeGeometryWorkerRequest(
      {
        protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
        sessionId: "bootstrap",
        revision: 1,
        kind: "solve",
        input: serializeSolverInput(newerInput),
        initialCache: serializeEdgeSolveCache(synchronousCache),
      },
      workerCache
    )

    expect(result.kind).toBe("result")
    if (result.kind !== "result") return
    expect(result.routeById).toEqual(cold)
    expect(workerCache.get("edge")!.sig).not.toBe(
      synchronousCache.get("edge")!.sig
    )
  })

  it("ignores a stale duplicate bootstrap after the Worker cache has advanced", () => {
    const input = routingInput()
    const workerCache = new Map<string, EdgeSolveCacheEntry>()
    const first = handleEdgeGeometryWorkerRequest(
      {
        protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
        sessionId: "bootstrap",
        revision: 1,
        kind: "solve",
        input: serializeSolverInput(input),
      },
      workerCache
    )
    expect(first.kind).toBe("result")
    const active = workerCache.get("edge")!
    const staleBootstrap: SerializedEdgeSolveCache = [
      [
        "edge",
        {
          sig: active.sig,
          routeSig: active.routeSig,
          computed: [
            { x: 9_999, y: 9_999 },
            { x: 10_000, y: 9_999 },
          ],
        },
      ],
    ]

    const duplicate = handleEdgeGeometryWorkerRequest(
      {
        protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
        sessionId: "bootstrap",
        revision: 2,
        kind: "solve",
        input: serializeSolverInput(input),
        initialCache: staleBootstrap,
      },
      workerCache
    )

    expect(duplicate.kind).toBe("result")
    if (first.kind !== "result" || duplicate.kind !== "result") return
    expect(duplicate.routeById).toEqual(first.routeById)
    expect(workerCache.get("edge")!.computed[0]).not.toEqual({
      x: 9_999,
      y: 9_999,
    })
  })

  it("rejects a corrupt bootstrap atomically", () => {
    const workerCache = new Map<string, EdgeSolveCacheEntry>()
    const corrupt = [
      [
        "edge",
        {
          sig: "corrupt",
          routeSig: "",
          computed: null,
        },
      ],
    ] as unknown as SerializedEdgeSolveCache

    const result = handleEdgeGeometryWorkerRequest(
      {
        protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
        sessionId: "bootstrap",
        revision: 1,
        kind: "solve",
        input: serializeSolverInput(routingInput()),
        initialCache: corrupt,
      },
      workerCache
    )

    expect(result.kind).toBe("error")
    expect(workerCache.size).toBe(0)
  })

  it("strips arbitrary app data while preserving every routing handle", () => {
    const node = {
      id: "a",
      type: "Class",
      position: { x: 10, y: 20 },
      width: 120,
      height: 80,
      measured: { width: 120, height: 80 },
      data: {
        renderLabel: () => "not cloneable",
      },
    } as unknown as Node
    const internal = {
      ...node,
      internals: {
        positionAbsolute: { x: 10, y: 20 },
        userNode: node,
        z: 0,
        handleBounds: {
          source: [
            {
              id: "east-1",
              type: "source",
              position: Position.Right,
              x: 120,
              y: 20,
              width: 1,
              height: 1,
            },
            {
              id: "east-2",
              type: "source",
              position: Position.Right,
              x: 120,
              y: 60,
              width: 1,
              height: 1,
            },
          ],
          target: [
            {
              id: "west",
              type: "target",
              position: Position.Left,
              x: 0,
              y: 40,
              width: 1,
              height: 1,
            },
          ],
        },
      },
    } as unknown as InternalNode
    const edge = {
      id: "e",
      source: "a",
      target: "a",
      sourceHandle: "east-2",
      targetHandle: "west",
      type: "ClassUnidirectional",
      data: {
        points: [
          { x: 130, y: 80 },
          { x: 160, y: 80 },
        ],
        labelRenderer: () => "not cloneable",
      },
    } as unknown as Edge
    const input: SolverInput = {
      nodes: [node],
      nodeLookup: new Map([[node.id, internal]]),
      connectionMode: ConnectionMode.Loose,
      edges: [edge],
      straightPathTypes: new Set(["ClassUnidirectional"]),
      straightHookTypes: new Set(),
    }

    const serialized = serializeSolverInput(input)
    expect(() => structuredClone(serialized)).not.toThrow()
    expect(serialized.nodes[0]).not.toHaveProperty("data")
    expect(serialized.edges[0].data).not.toHaveProperty("labelRenderer")
    expect(serialized.nodeLookup[0][1].handleBounds?.source).toHaveLength(2)

    const roundTripped = deserializeSolverInput(structuredClone(serialized))
    expect(
      roundTripped.nodeLookup.get("a")?.internals.handleBounds?.source
    ).toHaveLength(2)
    expect(roundTripped.edges[0].data?.points).toEqual(edge.data?.points)
  })
})
