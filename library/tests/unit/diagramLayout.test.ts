import { describe, expect, it, vi } from "vitest"
import {
  Position,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react"
import * as Y from "yjs"
import { getDiagramLayoutAvailability } from "@/layout/availability"
import {
  generatePlacementCandidates,
  type DiagramPlacementCandidate,
} from "@/layout/placementGenerator"
import {
  applyPositionsToSolverInput,
  centerAndSnapLayout,
  scoreLayoutCandidate,
  solveDiagramLayout,
} from "@/layout/candidateSolver"
import {
  DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
  type DiagramLayoutWorkerRequest,
} from "@/layout/workerProtocol"
import {
  startDiagramLayoutJob,
  type DiagramLayoutWorkerPort,
} from "@/layout/workerController"
import type { SerializedSolverInput } from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { deserializeSolverInput } from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { createDiagramStore } from "@/store/diagramStore"
import {
  compareMetricValues,
  isMaterialLayoutImprovement,
  layoutMetricValues,
  measureLayout,
  type LayoutMetrics,
} from "@/layout/objective"
import { measureSemanticComposition } from "@/layout/semanticQuality"
import { executeArrangeDiagram } from "@/layout/arrangeDiagram"
import type { DiagramLayoutJob } from "@/layout/workerController"
import { CANVAS, EDGES } from "@/utils/geometry/routingConstants"
import { UMLDiagramType, type DiagramEdgeType } from "@/typings"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"

const node = (
  id: string,
  x: number,
  y: number,
  extra: Partial<Node> = {}
): Node => ({
  id,
  type: "class",
  position: { x, y },
  width: 100,
  height: 60,
  measured: { width: 100, height: 60 },
  data: {},
  ...extra,
})

const edge = (
  id = "edge",
  data: Edge["data"] = undefined,
  type = "ClassUnidirectional"
): Edge => ({
  id,
  source: "a",
  target: "b",
  type,
  data,
})

const FLAT_LAYOUT_FAMILIES = [
  [UMLDiagramType.ClassDiagram, "ClassUnidirectional"],
  [UMLDiagramType.ObjectDiagram, "ObjectLink"],
  [UMLDiagramType.ActivityDiagram, "ActivityControlFlow"],
  [UMLDiagramType.UseCaseDiagram, "UseCaseAssociation"],
  [UMLDiagramType.CommunicationDiagram, "CommunicationLink"],
  [UMLDiagramType.ComponentDiagram, "ComponentDependency"],
  [UMLDiagramType.DeploymentDiagram, "DeploymentAssociation"],
  [UMLDiagramType.PetriNet, "PetriNetArc"],
  [UMLDiagramType.ReachabilityGraph, "ReachabilityGraphArc"],
  [UMLDiagramType.SyntaxTree, "SyntaxTreeLink"],
  [UMLDiagramType.Flowchart, "FlowChartFlowline"],
  [UMLDiagramType.BPMN, "BPMNSequenceFlow"],
  [UMLDiagramType.Sfc, "SfcDiagramEdge"],
] as const satisfies readonly (readonly [string, DiagramEdgeType])[]

const solverInput = (): SerializedSolverInput => {
  const nodes = [node("a", 0, 0), node("b", 200, 0)]
  const serializedNodes = nodes.map((item) => ({
    id: item.id,
    type: item.type,
    position: item.position,
    width: item.width,
    height: item.height,
    measured: item.measured,
  }))
  return {
    nodes: serializedNodes,
    nodeLookup: serializedNodes.map((item) => [
      item.id,
      {
        ...item,
        positionAbsolute: { ...item.position },
        handleBounds: {
          source: [
            {
              id: null,
              type: "source" as const,
              position: Position.Right,
              x: item.width!,
              y: item.height! / 2,
              width: 1,
              height: 1,
            },
          ],
          target: [
            {
              id: null,
              type: "target" as const,
              position: Position.Left,
              x: 0,
              y: item.height! / 2,
              width: 1,
              height: 1,
            },
          ],
        },
      },
    ]),
    connectionMode: "loose",
    edges: [
      {
        id: "edge",
        source: "a",
        target: "b",
        type: "ClassUnidirectional",
      },
    ],
    straightPathTypes: [],
    straightHookTypes: [],
  }
}

const layoutSnapshot = () => ({
  solver: solverInput(),
  edgeLabels: {},
})

const addSolverNode = (input: SerializedSolverInput, item: Node): void => {
  const serialized = {
    id: item.id,
    type: item.type,
    position: item.position,
    width: item.width,
    height: item.height,
    measured: item.measured,
  }
  input.nodes.push(serialized)
  input.nodeLookup.push([
    item.id,
    {
      ...serialized,
      positionAbsolute: { ...item.position },
      handleBounds: {
        source: [
          {
            id: null,
            type: "source",
            position: Position.Right,
            x: item.width!,
            y: item.height! / 2,
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
            y: item.height! / 2,
            width: 1,
            height: 1,
          },
        ],
      },
    },
  ])
}

describe("diagram layout availability", () => {
  it.each(FLAT_LAYOUT_FAMILIES)(
    "accepts a measured flat %s with %s edges",
    (_diagramType, edgeType) => {
      expect(
        getDiagramLayoutAvailability({
          nodes: [node("a", 0, 0), node("b", 200, 0)],
          edges: [edge("edge", undefined, edgeType)],
        })
      ).toEqual({ available: true })
    }
  )

  it("covers every known diagram family", () => {
    expect(
      new Set(FLAT_LAYOUT_FAMILIES.map(([diagramType]) => diagramType))
    ).toEqual(new Set(Object.values(UMLDiagramType)))
  })

  it("admits the measured large-graph profile and rejects only beyond its safety ceiling", () => {
    const nodes = Array.from({ length: 121 }, (_, index) =>
      node(`node-${index}`, (index % 20) * 120, Math.floor(index / 20) * 80)
    )
    expect(
      getDiagramLayoutAvailability({ nodes: nodes.slice(0, 120), edges: [] })
    ).toEqual({ available: true })
    expect(getDiagramLayoutAvailability({ nodes, edges: [] })).toEqual({
      available: false,
      reason: "too-large",
    })

    const edges = Array.from({ length: 241 }, (_, index) => ({
      ...edge(`edge-${index}`),
      source: "node-0",
      target: "node-1",
    }))
    expect(
      getDiagramLayoutAvailability({
        nodes: nodes.slice(0, 2),
        edges: edges.slice(0, 240),
      })
    ).toEqual({ available: true })
    expect(
      getDiagramLayoutAvailability({ nodes: nodes.slice(0, 2), edges })
    ).toEqual({ available: false, reason: "too-large" })
  })

  it.each([
    { points: [{ x: 100, y: 50 }] },
    { sourceAnchor: { side: Position.Right, ratio: 0.5 } },
    {
      points: [{ x: 100, y: 50 }],
      targetAnchor: { side: Position.Left, ratio: 0.5 },
    },
  ] as Edge["data"][])(
    "accepts visible orthogonal edges with manual routing",
    (data) => {
      expect(
        getDiagramLayoutAvailability({
          nodes: [node("a", 0, 0), node("b", 200, 0)],
          edges: [edge("edge", data)],
        })
      ).toEqual({ available: true })
    }
  )

  it.each([
    [
      "nested-nodes",
      [node("a", 0, 0), node("b", 20, 20, { parentId: "a" })],
      [],
    ],
    [
      "unmeasured-nodes",
      [node("a", 0, 0), node("b", 200, 0, { width: 0, measured: {} })],
      [],
    ],
  ] as const)(
    "reports %s without partially applying",
    (reason, nodes, edges) => {
      expect(
        getDiagramLayoutAvailability({
          nodes,
          edges,
        })
      ).toEqual({
        available: false,
        reason,
      })
    }
  )

  it("accepts straight edges with authored routing", () => {
    expect(
      getDiagramLayoutAvailability({
        nodes: [node("a", 0, 0), node("b", 200, 0)],
        edges: [
          edge(
            "straight",
            {
              points: [{ x: 100, y: 50 }],
              targetAnchor: { side: Position.Left, ratio: 0.5 },
            },
            "SyntaxTreeLink"
          ),
        ],
      })
    ).toEqual({ available: true })
  })
})

describe("placement generation and routed candidate scoring", () => {
  it.each(FLAT_LAYOUT_FAMILIES)(
    "generates and exactly scores a flat %s with %s edges",
    (_diagramType, edgeType) => {
      const input = solverInput()
      input.edges[0].type = edgeType
      input.straightHookTypes = [...STRAIGHT_HOOK_EDGE_TYPES]
      input.straightPathTypes = [...STRAIGHT_PATH_STEP_EDGE_TYPES]
      const candidate = generatePlacementCandidates(input)[0]

      expect(
        scoreLayoutCandidate(
          { solver: input, edgeLabels: {} },
          candidate.positions
        ).every(Number.isFinite)
      ).toBe(true)
    }
  )

  it("is invariant to model order", () => {
    const input = solverInput()
    input.edges.push({
      id: "a-edge",
      source: "b",
      target: "a",
      type: "ClassDependency",
    })
    const canonical = generatePlacementCandidates(input)
    input.nodes.reverse()
    input.edges.reverse()

    expect(generatePlacementCandidates(input)).toEqual(canonical)
  })

  it("places UML parents before children", () => {
    const input = solverInput()
    input.edges[0].type = "ClassInheritance"

    const down = generatePlacementCandidates(input).find(
      (candidate) => candidate.id === "down-stable"
    )!

    expect(down.positions.b.y).toBeLessThan(down.positions.a.y)
  })

  it("places syntax-tree sources before their children", () => {
    const input = solverInput()
    input.edges[0].type = "SyntaxTreeLink"

    const down = generatePlacementCandidates(input).find(
      (candidate) => candidate.id === "down-stable"
    )!

    expect(down.positions.a.y).toBeLessThan(down.positions.b.y)
  })

  it("produces deterministic non-overlapping placements", () => {
    const input = solverInput()
    const first = generatePlacementCandidates(input)
    const second = generatePlacementCandidates(input)

    expect(second).toEqual(first)
    expect(first[0].positions.a.y).not.toBe(first[0].positions.b.y)
  })

  it.each(["ObjectLink", "ClassUnidirectional"] as const)(
    "does not derive direction from %s endpoint order",
    (type) => {
      const forward = solverInput()
      forward.edges[0] = {
        ...forward.edges[0],
        type,
        source: "a",
        target: "b",
      }
      const reversed = structuredClone(forward)
      reversed.edges[0] = {
        ...reversed.edges[0],
        source: "b",
        target: "a",
      }

      expect(generatePlacementCandidates(reversed)).toEqual(
        generatePlacementCandidates(forward)
      )
    }
  )

  it("breaks directed cycles deterministically instead of flattening them", () => {
    const input = solverInput()
    addSolverNode(input, node("c", 100, 150))
    input.edges = [
      { id: "ab", source: "a", target: "b", type: "FlowChartFlowline" },
      { id: "bc", source: "b", target: "c", type: "FlowChartFlowline" },
      { id: "ca", source: "c", target: "a", type: "FlowChartFlowline" },
    ]

    const down = generatePlacementCandidates(input).find(
      (candidate) => candidate.id === "down-stable"
    )!

    expect(new Set(Object.values(down.positions).map(({ y }) => y)).size).toBe(
      3
    )
    expect(generatePlacementCandidates(input)).toEqual(
      generatePlacementCandidates(structuredClone(input))
    )
  })

  it("packs disconnected components without interleaving their layers", () => {
    const input = solverInput()
    addSolverNode(input, node("c", 400, 0))
    addSolverNode(input, node("d", 600, 0))
    input.edges = [
      { id: "ab", source: "a", target: "b", type: "ClassUnidirectional" },
      { id: "cd", source: "c", target: "d", type: "ClassUnidirectional" },
    ]
    const down = generatePlacementCandidates(input).find(
      (candidate) => candidate.id === "down-stable"
    )!

    expect(
      down.layers.every(
        (layer) =>
          layer.every((id) => id === "a" || id === "b") ||
          layer.every((id) => id === "c" || id === "d")
      )
    ).toBe(true)
    const firstMaxX = Math.max(
      down.positions.a.x + 100,
      down.positions.b.x + 100
    )
    const secondMinX = Math.min(down.positions.c.x, down.positions.d.x)
    expect(firstMaxX).toBeLessThan(secondMinX)
  })

  it("keeps neutral association branches in a mixed semantic graph", () => {
    const input = solverInput()
    addSolverNode(input, node("c", 400, 0))
    addSolverNode(input, node("d", 600, 0))
    input.edges = [
      { id: "semantic", source: "a", target: "b", type: "ClassDependency" },
      { id: "neutral-bc", source: "b", target: "c", type: "ObjectLink" },
      { id: "neutral-cd", source: "d", target: "c", type: "ObjectLink" },
    ]

    const down = generatePlacementCandidates(input).find(
      (candidate) => candidate.id === "down-stable"
    )!
    const ranks = new Set(
      ["a", "b", "c", "d"].map((id) => down.positions[id].y)
    )

    expect(ranks.size).toBe(4)
  })

  it.each([
    ["star", 7],
    ["cycle", 6],
  ] as const)(
    "adds one compact deterministic orthogonal seed for a pure undirected %s",
    (shape, count) => {
      const input = solverInput()
      input.nodes[1].position = { x: 0, y: 0 }
      input.nodeLookup[1][1].position = { x: 0, y: 0 }
      input.nodeLookup[1][1].positionAbsolute = { x: 0, y: 0 }
      for (let index = 2; index < count; index++)
        addSolverNode(
          input,
          node(`n-${index}`, 0, 0, {
            width: 80 + index * 10,
            height: 50 + (index % 3) * 15,
            measured: {
              width: 80 + index * 10,
              height: 50 + (index % 3) * 15,
            },
          })
        )
      input.edges =
        shape === "star"
          ? input.nodes
              .filter((item) => item.id !== "a")
              .map((item, index) => ({
                id: `star-${index}`,
                source: "a",
                target: item.id,
                type: "ClassUnidirectional",
              }))
          : input.nodes.map((item, index, items) => ({
              id: `cycle-${index}`,
              source: item.id,
              target: items[(index + 1) % items.length].id,
              type: "ClassUnidirectional",
            }))

      const candidates = generatePlacementCandidates(input)
      const structural = candidates.at(-1)!
      const area = (candidate: DiagramPlacementCandidate) => {
        const rects = input.nodes.map((item) => ({
          x: candidate.positions[item.id].x,
          y: candidate.positions[item.id].y,
          right: candidate.positions[item.id].x + item.width!,
          bottom: candidate.positions[item.id].y + item.height!,
        }))
        return (
          (Math.max(...rects.map(({ right }) => right)) -
            Math.min(...rects.map(({ x }) => x))) *
          (Math.max(...rects.map(({ bottom }) => bottom)) -
            Math.min(...rects.map(({ y }) => y)))
        )
      }

      expect(candidates).toHaveLength(5)
      expect(structural.id).toBe("radial-structures")
      expect(structural.layers.every((layer) => layer.length === 1)).toBe(true)
      expect(area(structural)).toBeLessThan(
        Math.min(...candidates.slice(0, 4).map(area)) *
          (shape === "star" ? 0.8 : 0.9)
      )
      for (const position of Object.values(structural.positions)) {
        expect(position.x % CANVAS.SNAP_TO_GRID_PX).toBe(0)
        expect(position.y % CANVAS.SNAP_TO_GRID_PX).toBe(0)
      }
      const rects = input.nodes.map((item) => ({
        ...structural.positions[item.id],
        width: item.width!,
        height: item.height!,
      }))
      for (let first = 0; first < rects.length; first++)
        for (let second = first + 1; second < rects.length; second++) {
          const left = rects[first]
          const right = rects[second]
          const overlapX =
            Math.min(left.x + left.width, right.x + right.width) -
            Math.max(left.x, right.x)
          const overlapY =
            Math.min(left.y + left.height, right.y + right.height) -
            Math.max(left.y, right.y)
          if (overlapY > 0)
            expect(
              Math.max(
                right.x - left.x - left.width,
                left.x - right.x - right.width
              )
            ).toBeGreaterThanOrEqual(EDGES.NODE_CLEARANCE_PX)
          else if (overlapX > 0)
            expect(
              Math.max(
                right.y - left.y - left.height,
                left.y - right.y - right.height
              )
            ).toBeGreaterThanOrEqual(EDGES.NODE_CLEARANCE_PX)
        }
      expect(generatePlacementCandidates(structuredClone(input))).toEqual(
        candidates
      )
    }
  )

  it("does not offer the radial seed for directed stars", () => {
    const input = solverInput()
    for (let index = 2; index < 5; index++)
      addSolverNode(input, node(`n-${index}`, index * 150, 200))
    input.edges = input.nodes
      .filter((item) => item.id !== "a")
      .map((item, index) => ({
        id: `star-${index}`,
        source: "a",
        target: item.id,
        type: "ClassUnidirectional",
      }))

    expect(generatePlacementCandidates(input)).toHaveLength(5)
    input.edges = input.edges.map((item) => ({
      ...item,
      type: "FlowChartFlowline",
    }))
    input.nodes.forEach((item) => {
      item.position = { x: 0, y: 0 }
      const internal = input.nodeLookup.find(([id]) => id === item.id)![1]
      internal.position = { x: 0, y: 0 }
      internal.positionAbsolute = { x: 0, y: 0 }
    })

    expect(generatePlacementCandidates(input)).toHaveLength(4)
  })

  it("keeps the old centre, snaps to the canvas grid, and preserves hidden nodes", () => {
    const nodes = solverInput().nodes.concat({
      id: "hidden",
      position: { x: 13, y: 17 },
      width: 10,
      height: 10,
      hidden: true,
    })
    const positions = centerAndSnapLayout(nodes, {
      a: { x: 10.4, y: 20.2 },
      b: { x: 125.8, y: 21.7 },
    })

    expect(positions.hidden).toEqual({ x: 13, y: 17 })
    for (const position of Object.values(positions).slice(0, 2)) {
      expect(position.x % 5).toBe(0)
      expect(position.y % 5).toBe(0)
    }
  })

  it("rejects an overlapping proposal before secondary route aesthetics", async () => {
    const input = solverInput()
    input.nodes[1].position = { x: 0, y: 0 }
    input.nodeLookup[1][1].position = { x: 0, y: 0 }
    input.nodeLookup[1][1].positionAbsolute = { x: 0, y: 0 }
    const generate = (): DiagramPlacementCandidate[] => [
      {
        id: "overlap",
        direction: "DOWN",
        positions: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
        layers: [["a", "b"]],
      },
      {
        id: "clear",
        direction: "RIGHT",
        positions: { a: { x: 0, y: 0 }, b: { x: 250, y: 0 } },
        layers: [["a"], ["b"]],
      },
    ]

    const result = await solveDiagramLayout(
      { solver: input, edgeLabels: {} },
      generate
    )
    expect(result.candidate).toBe("clear")
    expect(result.score[0]).toBe(0)
  })

  it("is idempotent after applying its own result", async () => {
    const input = solverInput()
    input.nodes[1].position = { x: 0, y: 0 }
    input.nodeLookup[1][1].position = { x: 0, y: 0 }
    input.nodeLookup[1][1].positionAbsolute = { x: 0, y: 0 }
    const first = await solveDiagramLayout({
      solver: input,
      edgeLabels: {},
    })
    expect(first.candidate).not.toBe("current")

    const arranged = applyPositionsToSolverInput(input, first.positions)
    const second = await solveDiagramLayout({
      solver: arranged,
      edgeLabels: {},
    })

    expect(second.candidate).toBe("current")
    expect(second.positions).toEqual(first.positions)
  })

  it("reaches the same fixed point on a nontrivial cyclic graph", async () => {
    const input = solverInput()
    for (const [id, x, y] of [
      ["c", 0, 0],
      ["d", 100, 0],
      ["e", 200, 0],
      ["f", 300, 0],
    ] as const)
      addSolverNode(input, node(id, x, y))
    input.nodes[1].position = { x: 0, y: 0 }
    input.nodeLookup[1][1].position = { x: 0, y: 0 }
    input.nodeLookup[1][1].positionAbsolute = { x: 0, y: 0 }
    input.edges = [
      { id: "ad", source: "a", target: "d", type: "FlowChartFlowline" },
      { id: "ac", source: "a", target: "c", type: "FlowChartFlowline" },
      { id: "be", source: "b", target: "e", type: "FlowChartFlowline" },
      { id: "cf", source: "c", target: "f", type: "FlowChartFlowline" },
      { id: "fa", source: "f", target: "a", type: "FlowChartFlowline" },
    ]

    const first = await solveDiagramLayout({ solver: input, edgeLabels: {} })
    const second = await solveDiagramLayout({
      solver: applyPositionsToSolverInput(input, first.positions),
      edgeLabels: {},
    })

    expect(second.candidate).toBe("current")
    expect(second.positions).toEqual(first.positions)
  })

  it("does not count an endpoint label's intentional node and edge contacts", () => {
    const snapshot = layoutSnapshot()
    snapshot.edgeLabels.edge = {
      sourceRole: "owner",
      sourceRoleWidth: 44,
      targetMultiplicity: "1..*",
      targetMultiplicityWidth: 24,
    }

    const score = scoreLayoutCandidate(snapshot, {
      a: { x: 0, y: 0 },
      b: { x: 200, y: 0 },
    })

    expect(score[3]).toBe(0)
    expect(score[6]).toBe(0)
  })

  it("bounds exact route evaluations and memoizes duplicate placements", async () => {
    const input = solverInput()
    for (let index = 0; index < 8; index++)
      addSolverNode(input, node(`extra-${index}`, index * 120, 200))
    const positions = Object.fromEntries(
      input.nodes.map((item, index) => [
        item.id,
        { x: (index % 5) * 140, y: Math.floor(index / 5) * 120 },
      ])
    )
    const candidate: DiagramPlacementCandidate = {
      id: "budget",
      direction: "DOWN",
      positions,
      layers: [input.nodes.map((item) => item.id)],
    }
    let exactEvaluations = 0

    await solveDiagramLayout(
      { solver: input, edgeLabels: {} },
      () => [candidate, { ...candidate, id: "duplicate" }],
      () => exactEvaluations++
    )

    // Duplicate placements are free, and all unique global/local evaluations
    // share the small-diagram ceiling with the baseline.
    expect(exactEvaluations).toBeLessThanOrEqual(6)
  })
})

describe("semantic composition quality", () => {
  it("scores flow only between strongly connected components", () => {
    const input = solverInput()
    addSolverNode(input, node("c", 200, 0))
    addSolverNode(input, node("d", 0, -100))
    input.edges = [
      { id: "ab", source: "a", target: "b", type: "FlowChartFlowline" },
      { id: "bc", source: "b", target: "c", type: "FlowChartFlowline" },
      { id: "ca", source: "c", target: "a", type: "FlowChartFlowline" },
      { id: "cd", source: "c", target: "d", type: "FlowChartFlowline" },
    ]

    const quality = measureSemanticComposition(
      input,
      Object.fromEntries(input.nodes.map((item) => [item.id, item.position]))
    )

    expect(quality.backwardEdges).toBe(1)
    expect(quality.backwardDistancePx).toBe(105)
  })

  it("does not invent a backward edge for an unavoidable directed cycle", () => {
    const input = solverInput()
    addSolverNode(input, node("c", 100, 200))
    input.edges = [
      { id: "ab", source: "a", target: "b", type: "ReachabilityGraphArc" },
      { id: "bc", source: "b", target: "c", type: "ReachabilityGraphArc" },
      { id: "ca", source: "c", target: "a", type: "ReachabilityGraphArc" },
    ]

    expect(
      measureSemanticComposition(
        input,
        Object.fromEntries(input.nodes.map((item) => [item.id, item.position]))
      )
    ).toMatchObject({
      backwardEdges: 0,
      backwardDistancePx: 0,
    })
  })

  it("rewards centered, compact UML inheritance fan-outs", () => {
    const input = solverInput()
    addSolverNode(input, node("parent", 0, 0))
    input.edges = [
      {
        id: "a-parent",
        source: "a",
        target: "parent",
        type: "ClassInheritance",
      },
      {
        id: "b-parent",
        source: "b",
        target: "parent",
        type: "ClassInheritance",
      },
    ]
    const ugly = measureSemanticComposition(input, {
      parent: { x: 0, y: 0 },
      a: { x: 0, y: 200 },
      b: { x: 500, y: 200 },
    })
    const composed = measureSemanticComposition(input, {
      parent: { x: 75, y: 0 },
      a: { x: 0, y: 200 },
      b: { x: 150, y: 200 },
    })

    expect(ugly.hierarchyFanoutMaxOffsetPermille).toBeGreaterThan(800)
    expect(ugly.hierarchySiblingSpreadPermille).toBe(1_000)
    expect(composed).toMatchObject({
      hierarchyFanoutMaxOffsetPermille: 0,
      hierarchyFanoutTotalOffsetPermille: 0,
      hierarchySiblingSpreadPermille: 0,
    })
  })
})

describe("layout middle-label coverage", () => {
  const routeScore = {
    hardInvalidity: 0,
    weightedCost: 0,
    crossings: 0,
    proximityPx: 0,
    straightBroken: 0,
    bends: 0,
    maxSideGapImbalancePx: 0,
    totalSideGapImbalancePx: 0,
    maxCornerJamPermille: 0,
    totalCornerJamPermille: 0,
    length: 0,
  }

  const labelNodeHits = ({
    type,
    label = "condition",
    route,
    obstacle,
  }: {
    type: string
    label?: string
    route: Array<{ x: number; y: number }>
    obstacle: Node
  }): number => {
    const input = solverInput()
    addSolverNode(input, obstacle)
    input.edges = [{ id: "edge", source: "a", target: "b", type }]
    const positions = Object.fromEntries(
      input.nodes.map((item) => [item.id, item.position])
    )
    return measureLayout(
      input,
      positions,
      routeScore,
      { edge: route },
      { edge: { middle: label, middleWidth: 60 } }
    ).labelNodeHits
  }

  it("scores middle labels rendered by newly enabled orthogonal families", () => {
    const obstacle = node("c", 100, -100, {
      width: 100,
      height: 260,
      measured: { width: 100, height: 260 },
    })
    const route = [
      { x: 100, y: 30 },
      { x: 200, y: 30 },
    ]

    expect(
      labelNodeHits({ type: "ActivityControlFlow", route, obstacle })
    ).toBeGreaterThan(0)
    expect(
      labelNodeHits({ type: "DeploymentDependency", route, obstacle })
    ).toBe(0)
  })

  it("scores rotated straight-edge labels and ignores Petri's implicit weight", () => {
    const obstacle = node("c", 120, 55, {
      width: 80,
      height: 80,
      measured: { width: 80, height: 80 },
    })
    const route = [
      { x: 100, y: 30 },
      { x: 200, y: 130 },
    ]

    expect(
      labelNodeHits({ type: "UseCaseAssociation", route, obstacle })
    ).toBeGreaterThan(0)
    expect(
      labelNodeHits({ type: "PetriNetArc", label: "1", route, obstacle })
    ).toBe(0)
  })
})

describe("layout acceptance policy", () => {
  const metrics = (overrides: Partial<LayoutMetrics> = {}): LayoutMetrics => ({
    nodeOverlaps: 0,
    nodeOverlapPenetrationPx: 0,
    nodeClearanceViolations: 0,
    nodeClearanceDeficitPx: 0,
    labelNodeHits: 0,
    labelLineHits: 0,
    labelFitFailures: 0,
    labelLabelOverlaps: 0,
    semanticBackwardEdges: 0,
    semanticBackwardDistancePx: 0,
    hierarchyFanoutMaxOffsetPermille: 0,
    hierarchyFanoutTotalOffsetPermille: 0,
    hierarchySiblingSpreadPermille: 0,
    route: {
      hardInvalidity: 0,
      weightedCost: 1_000,
      crossings: 0,
      proximityPx: 0,
      straightBroken: 0,
      bends: 4,
      maxSideGapImbalancePx: 0,
      totalSideGapImbalancePx: 0,
      maxCornerJamPermille: 0,
      totalCornerJamPermille: 0,
      length: 600,
    },
    displacementPx: 0,
    widthPx: 500,
    heightPx: 300,
    perimeterPx: 800,
    areaPx2: 150_000,
    ...overrides,
  })

  it("rejects a cosmetic route improvement below the material threshold", () => {
    const baseline = metrics()
    const candidate = metrics({
      route: { ...baseline.route, weightedCost: 950, length: 550 },
      displacementPx: 1_000,
    })

    expect(isMaterialLayoutImprovement(baseline, candidate)).toBe(false)
  })

  it("accepts removal of a hard overlap regardless of displacement", () => {
    const baseline = metrics({
      nodeOverlaps: 1,
      nodeOverlapPenetrationPx: 20,
    })
    const candidate = metrics({
      displacementPx: 2_000,
      areaPx2: 300_000,
    })

    expect(isMaterialLayoutImprovement(baseline, candidate)).toBe(true)
  })

  it("does not exchange one kind of hard defect for another", () => {
    const baseline = metrics({
      nodeOverlaps: 1,
      nodeOverlapPenetrationPx: 20,
    })
    const candidate = metrics({
      route: { ...baseline.route, hardInvalidity: 1 },
    })

    expect(isMaterialLayoutImprovement(baseline, candidate)).toBe(false)
  })

  it("does not trade a worse canonical route for one soft label improvement", () => {
    const baseline = metrics({ labelLineHits: 1 })
    const candidate = metrics({
      labelLineHits: 0,
      route: {
        ...baseline.route,
        weightedCost: baseline.route.weightedCost + 1,
        crossings: baseline.route.crossings + 1,
      },
    })

    expect(isMaterialLayoutImprovement(baseline, candidate)).toBe(false)
  })

  it("accepts a crossing reduction only within a bounded routing detour", () => {
    const baseline = metrics({
      route: {
        ...metrics().route,
        weightedCost: 1_000,
        crossings: 1,
      },
    })
    const bounded = metrics({
      route: {
        ...baseline.route,
        weightedCost: 1_200,
        crossings: 0,
      },
    })
    const excessive = metrics({
      route: {
        ...baseline.route,
        weightedCost: 1_251,
        crossings: 0,
      },
    })

    expect(isMaterialLayoutImprovement(baseline, bounded)).toBe(true)
    expect(isMaterialLayoutImprovement(baseline, excessive)).toBe(false)
  })

  it("prefers planarity over one grid step of clearance, but bounds the trade", () => {
    const baseline = metrics({
      route: {
        ...metrics().route,
        weightedCost: 1_000,
        crossings: 3,
      },
    })
    const bounded = metrics({
      nodeClearanceViolations: 1,
      nodeClearanceDeficitPx: CANVAS.SNAP_TO_GRID_PX,
      route: {
        ...baseline.route,
        weightedCost: 1_200,
        crossings: 0,
      },
    })
    const excessive = metrics({
      nodeClearanceViolations: 1,
      nodeClearanceDeficitPx: 2 * CANVAS.SNAP_TO_GRID_PX,
      route: bounded.route,
    })

    expect(isMaterialLayoutImprovement(baseline, bounded)).toBe(true)
    expect(isMaterialLayoutImprovement(baseline, excessive)).toBe(false)
  })

  it("does not remove a crossing by introducing another structural defect", () => {
    const baseline = metrics({
      route: {
        ...metrics().route,
        weightedCost: 1_000,
        crossings: 1,
      },
    })
    const candidate = metrics({
      labelLineHits: 1,
      route: {
        ...baseline.route,
        weightedCost: 1_100,
        crossings: 0,
      },
    })

    expect(isMaterialLayoutImprovement(baseline, candidate)).toBe(false)
  })

  it("uses the canonical weighted cost for overlap and crowding trade-offs", () => {
    const baseline = metrics({
      route: {
        ...metrics().route,
        weightedCost: 1_000,
        proximityPx: 50,
      },
    })
    const candidate = metrics({
      route: {
        ...baseline.route,
        weightedCost: 900,
        proximityPx: 70,
      },
    })

    expect(isMaterialLayoutImprovement(baseline, candidate)).toBe(true)
  })

  it("accepts a bounded removal of aggregate label collisions", () => {
    const baseline = metrics({ labelLabelOverlaps: 1, labelLineHits: 1 })
    const bounded = metrics({
      labelLabelOverlaps: 0,
      labelLineHits: 1,
      route: { ...baseline.route, weightedCost: 1_100 },
    })
    const excessive = metrics({
      labelLabelOverlaps: 0,
      labelLineHits: 1,
      route: { ...baseline.route, weightedCost: 1_101 },
    })

    expect(isMaterialLayoutImprovement(baseline, bounded)).toBe(true)
    expect(isMaterialLayoutImprovement(baseline, excessive)).toBe(false)
  })

  it("accepts clearer directed flow within a smaller detour budget", () => {
    const baseline = metrics({
      semanticBackwardEdges: 1,
      semanticBackwardDistancePx: 100,
    })
    const bounded = metrics({
      semanticBackwardEdges: 0,
      semanticBackwardDistancePx: 0,
      route: { ...baseline.route, weightedCost: 1_150 },
    })
    const excessive = metrics({
      semanticBackwardEdges: 0,
      semanticBackwardDistancePx: 0,
      route: { ...baseline.route, weightedCost: 1_151 },
    })

    expect(isMaterialLayoutImprovement(baseline, bounded)).toBe(true)
    expect(isMaterialLayoutImprovement(baseline, excessive)).toBe(false)
  })

  it("selects a material hierarchy composition win within a five-percent route budget", () => {
    const baseline = metrics({
      hierarchyFanoutMaxOffsetPermille: 800,
      hierarchyFanoutTotalOffsetPermille: 800,
      hierarchySiblingSpreadPermille: 600,
    })
    const composed = metrics({
      hierarchyFanoutMaxOffsetPermille: 0,
      hierarchyFanoutTotalOffsetPermille: 0,
      hierarchySiblingSpreadPermille: 0,
      route: { ...baseline.route, weightedCost: 1_050 },
    })
    const excessive = metrics({
      ...composed,
      route: { ...composed.route, weightedCost: 1_051 },
    })

    expect(
      compareMetricValues(
        layoutMetricValues(composed),
        layoutMetricValues(baseline)
      )
    ).toBeLessThan(0)
    expect(isMaterialLayoutImprovement(baseline, composed)).toBe(true)
    expect(isMaterialLayoutImprovement(baseline, excessive)).toBe(false)
  })

  it("does not buy hierarchy composition with a routing or clearance defect", () => {
    const baseline = metrics({
      hierarchyFanoutMaxOffsetPermille: 800,
      hierarchyFanoutTotalOffsetPermille: 800,
    })
    const crossing = metrics({
      hierarchyFanoutMaxOffsetPermille: 0,
      hierarchyFanoutTotalOffsetPermille: 0,
      route: { ...baseline.route, crossings: 1 },
    })
    const clearance = metrics({
      hierarchyFanoutMaxOffsetPermille: 0,
      hierarchyFanoutTotalOffsetPermille: 0,
      nodeClearanceViolations: 1,
      nodeClearanceDeficitPx: CANVAS.SNAP_TO_GRID_PX,
    })

    expect(isMaterialLayoutImprovement(baseline, crossing)).toBe(false)
    expect(isMaterialLayoutImprovement(baseline, clearance)).toBe(false)
  })

  it("requires a scaled bend improvement but preserves feasible straight edges", () => {
    const manyBends = metrics({
      route: { ...metrics().route, bends: 40 },
    })
    const tooFewRemoved = metrics({
      route: { ...manyBends.route, weightedCost: 990, bends: 37 },
    })
    const materialReduction = metrics({
      route: { ...manyBends.route, weightedCost: 990, bends: 36 },
    })
    const brokenStraight = metrics({
      route: { ...metrics().route, straightBroken: 1 },
    })
    const repairedStraight = metrics({
      route: {
        ...brokenStraight.route,
        weightedCost: 1_100,
        straightBroken: 0,
      },
    })

    expect(isMaterialLayoutImprovement(manyBends, tooFewRemoved)).toBe(false)
    expect(isMaterialLayoutImprovement(manyBends, materialReduction)).toBe(true)
    expect(isMaterialLayoutImprovement(brokenStraight, repairedStraight)).toBe(
      true
    )
  })

  it("keeps structural improvements inside the footprint guard", () => {
    const baseline = metrics({
      route: {
        ...metrics().route,
        weightedCost: 1_000,
        crossings: 1,
      },
    })
    const candidate = metrics({
      route: {
        ...baseline.route,
        weightedCost: 1_100,
        crossings: 0,
      },
      widthPx: baseline.widthPx * 1.76,
      areaPx2: baseline.areaPx2 * 1.4,
    })

    expect(isMaterialLayoutImprovement(baseline, candidate)).toBe(false)
  })
})

describe("diagram layout Worker lifecycle", () => {
  it("accepts only its matching response and terminates the one-shot Worker", async () => {
    let request: DiagramLayoutWorkerRequest | undefined
    const worker: DiagramLayoutWorkerPort = {
      postMessage: vi.fn((next) => {
        request = next
      }),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    }
    const job = startDiagramLayoutJob(layoutSnapshot(), {
      worker,
      timeoutMs: 1_000,
    })
    expect(request).toBeDefined()
    worker.onmessage?.({
      data: {
        protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
        requestId: request!.requestId + 1,
        kind: "result",
        positions: {},
      },
    } as MessageEvent)
    worker.onmessage?.({
      data: {
        protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
        requestId: request!.requestId,
        kind: "result",
        positions: { a: { x: 0, y: 0 }, b: { x: 200, y: 0 } },
      },
    } as MessageEvent)

    await expect(job.result).resolves.toMatchObject({
      positions: { a: { x: 0, y: 0 }, b: { x: 200, y: 0 } },
    })
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it("hard-cancels without mutating a document", async () => {
    const worker: DiagramLayoutWorkerPort = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    }
    const job = startDiagramLayoutJob(layoutSnapshot(), {
      worker,
      timeoutMs: 1_000,
    })
    job.cancel()
    await expect(job.result).rejects.toMatchObject({ name: "AbortError" })
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it("terminates and rejects when posting to the Worker fails", async () => {
    const worker: DiagramLayoutWorkerPort = {
      postMessage: vi.fn(() => {
        throw new DOMException("Blocked by policy", "SecurityError")
      }),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    }

    const job = startDiagramLayoutJob(layoutSnapshot(), { worker })

    await expect(job.result).rejects.toMatchObject({
      name: "DiagramLayoutError",
      code: "worker-start",
    })
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it("classifies Worker runtime errors without exposing their raw message", async () => {
    let request: DiagramLayoutWorkerRequest | undefined
    const worker: DiagramLayoutWorkerPort = {
      postMessage: vi.fn((next) => {
        request = next
      }),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    }
    const job = startDiagramLayoutJob(layoutSnapshot(), { worker })
    worker.onmessage?.({
      data: {
        protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
        requestId: request!.requestId,
        kind: "error",
        message: "sensitive implementation detail",
      },
    } as MessageEvent)

    await expect(job.result).rejects.toMatchObject({
      name: "DiagramLayoutError",
      code: "worker-runtime",
      message: "Diagram layout Worker failed",
    })
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it.each([
    ["missing", { a: { x: 0, y: 0 } }],
    ["non-finite", { a: { x: Number.NaN, y: 0 }, b: { x: 200, y: 0 } }],
  ])("rejects a %s Worker position set", async (_name, positions) => {
    let request: DiagramLayoutWorkerRequest | undefined
    const worker: DiagramLayoutWorkerPort = {
      postMessage: vi.fn((next) => {
        request = next
      }),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    }
    const job = startDiagramLayoutJob(layoutSnapshot(), { worker })
    worker.onmessage?.({
      data: {
        protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
        requestId: request!.requestId,
        kind: "result",
        positions,
      },
    } as MessageEvent)

    await expect(job.result).rejects.toMatchObject({
      name: "DiagramLayoutError",
      code: "invalid-result",
    })
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it("terminates a job at the hard timeout", async () => {
    vi.useFakeTimers()
    const worker: DiagramLayoutWorkerPort = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    }
    const job = startDiagramLayoutJob(layoutSnapshot(), {
      worker,
      timeoutMs: 1_000,
    })
    const rejected = expect(job.result).rejects.toMatchObject({
      name: "DiagramLayoutError",
      code: "timeout",
    })
    await vi.advanceTimersByTimeAsync(1_000)

    await rejected
    expect(worker.terminate).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})

describe("layout persistence", () => {
  it("commits positions and routing resets as one isolated undo item", () => {
    const doc = new Y.Doc()
    const store = createDiagramStore(doc)
    store.getState().setNodes([node("a", 0, 0), node("b", 200, 0)])
    store.getState().setEdges([
      edge("visible", {
        points: [{ x: 100, y: 20 }],
        sourceAnchor: { side: Position.Right, ratio: 0.25 },
        label: "preserved",
      }),
      {
        ...edge("hidden", {
          points: [{ x: 100, y: 40 }],
          targetAnchor: { side: Position.Left, ratio: 0.75 },
        }),
        hidden: true,
      },
    ])
    store.getState().initializeUndoManager()

    expect(
      store.getState().applyDiagramLayout({
        positions: {
          a: { x: 20, y: 40 },
          b: { x: 220, y: 40 },
        },
        resetEdgeRoutingIds: ["visible"],
      })
    ).toEqual({
      movedNodeCount: 2,
      replacedManualRouteCount: 1,
    })
    expect(store.getState().undoManager?.undoStack).toHaveLength(1)
    expect(store.getState().nodes.map((item) => item.position)).toEqual([
      { x: 20, y: 40 },
      { x: 220, y: 40 },
    ])
    expect(store.getState().edges[0].data).toEqual({
      points: [],
      label: "preserved",
    })
    expect(store.getState().edges[1].data).toEqual({
      points: [{ x: 100, y: 40 }],
      targetAnchor: { side: Position.Left, ratio: 0.75 },
    })

    store.getState().undo()
    store.getState().updateNodesFromYjs()
    store.getState().updateEdgesFromYjs()
    expect(store.getState().nodes.map((item) => item.position)).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ])
    expect(store.getState().edges[0].data).toMatchObject({
      points: [{ x: 100, y: 20 }],
      sourceAnchor: { side: Position.Right, ratio: 0.25 },
      label: "preserved",
    })
    store.getState().redo()
    store.getState().updateNodesFromYjs()
    store.getState().updateEdgesFromYjs()
    expect(store.getState().nodes.map((item) => item.position)).toEqual([
      { x: 20, y: 40 },
      { x: 220, y: 40 },
    ])
    expect(store.getState().edges[0].data).toEqual({
      points: [],
      label: "preserved",
    })
    doc.destroy()
  })

  it("rejects partial and non-finite layouts before opening a transaction", () => {
    const doc = new Y.Doc()
    const store = createDiagramStore(doc)
    store.getState().setNodes([node("a", 0, 0), node("b", 200, 0)])
    const before = store.getState().nodes.map((item) => item.position)

    expect(() =>
      store.getState().applyDiagramLayout({
        positions: { a: { x: 20, y: 20 } },
        resetEdgeRoutingIds: [],
      })
    ).toThrow(/incomplete/)
    expect(() =>
      store.getState().applyDiagramLayout({
        positions: {
          a: { x: Number.POSITIVE_INFINITY, y: 20 },
          b: { x: 220, y: 20 },
        },
        resetEdgeRoutingIds: [],
      })
    ).toThrow(/incomplete/)
    expect(() =>
      store.getState().applyDiagramLayout({
        positions: {
          a: { x: 20, y: 20 },
          b: { x: 220, y: 20 },
        },
        resetEdgeRoutingIds: ["missing"],
      })
    ).toThrow(/incomplete/)
    expect(store.getState().nodes.map((item) => item.position)).toEqual(before)
    doc.destroy()
  })
})

describe("diagram layout orchestration", () => {
  const fixture = () => {
    const doc = new Y.Doc()
    const store = createDiagramStore(doc)
    const solved = deserializeSolverInput(solverInput())
    store.getState().setNodes(structuredClone(solved.nodes) as Node[])
    store.getState().setEdges(solved.edges as Edge[])
    const rfNodes = solved.nodes as Node[]
    const reactFlow = {
      getNodes: () => rfNodes,
      getInternalNode: (id: string) => solved.nodeLookup.get(id),
    } as unknown as ReactFlowInstance
    return { doc, store, rfNodes, reactFlow }
  }

  const deferredJob = () => {
    let resolve!: (value: Awaited<DiagramLayoutJob["result"]>) => void
    let reject!: (reason: unknown) => void
    const result = new Promise<Awaited<DiagramLayoutJob["result"]>>(
      (resolvePromise, rejectPromise) => {
        resolve = resolvePromise
        reject = rejectPromise
      }
    )
    const cancel = vi.fn(() =>
      reject(new DOMException("Diagram layout cancelled", "AbortError"))
    )
    return { job: { result, cancel }, resolve, cancel }
  }

  it("treats an already reconciled singleton diagram as unchanged", async () => {
    const doc = new Y.Doc()
    const store = createDiagramStore(doc)
    const onlyNode = node("only", 0, 0)
    store.getState().setNodes([onlyNode])
    const reactFlow = {
      getNodes: () => [onlyNode],
      getInternalNode: () => undefined,
    } as unknown as ReactFlowInstance
    const startJob = vi.fn()

    const execution = executeArrangeDiagram({
      diagramStore: store,
      reactFlow,
      isModifiable: () => true,
      isInteractionActive: () => false,
      getDiagramType: () => UMLDiagramType.ClassDiagram,
      startJob,
    })

    await expect(execution.result).resolves.toEqual({ status: "unchanged" })
    expect(startJob).not.toHaveBeenCalled()
    doc.destroy()
  })

  it("requires explicit permission before starting work on manual routes", async () => {
    const { doc, store, reactFlow } = fixture()
    store.getState().setEdges([
      edge("edge", {
        points: [{ x: 100, y: 20 }],
        sourceAnchor: { side: Position.Right, ratio: 0.25 },
      }),
    ])
    const startJob = vi.fn()
    const execution = executeArrangeDiagram({
      diagramStore: store,
      reactFlow,
      isModifiable: () => true,
      isInteractionActive: () => false,
      getDiagramType: () => "ClassDiagram",
      startJob,
    })

    await expect(execution.result).resolves.toEqual({
      status: "confirmation-required",
      manualRouteCount: 1,
    })
    expect(startJob).not.toHaveBeenCalled()
    expect(store.getState().edges[0].data).toMatchObject({
      points: [{ x: 100, y: 20 }],
      sourceAnchor: { side: Position.Right, ratio: 0.25 },
    })
    doc.destroy()
  })

  it("scores automatic routes and atomically clears only visible manual routing", async () => {
    const { doc, store, reactFlow } = fixture()
    store.getState().setEdges([
      edge("edge", {
        points: [{ x: 100, y: 20 }],
        sourceAnchor: { side: Position.Right, ratio: 0.25 },
        targetAnchor: { side: Position.Left, ratio: 0.75 },
        label: "preserved",
      }),
      {
        ...edge("hidden", {
          points: [{ x: 100, y: 40 }],
          sourceAnchor: { side: Position.Right, ratio: 0.5 },
        }),
        hidden: true,
      },
    ])
    const deferred = deferredJob()
    let capturedSnapshot: Parameters<
      NonNullable<Parameters<typeof executeArrangeDiagram>[0]["startJob"]>
    >[0]
    const execution = executeArrangeDiagram({
      diagramStore: store,
      reactFlow,
      isModifiable: () => true,
      isInteractionActive: () => false,
      getDiagramType: () => "ClassDiagram",
      replaceManualRoutes: true,
      startJob: (snapshot) => {
        capturedSnapshot = snapshot
        return deferred.job
      },
    })

    expect(capturedSnapshot!.solver.edges).toHaveLength(1)
    expect(capturedSnapshot!.solver.edges[0].data).toEqual({ points: [] })
    expect(capturedSnapshot!.edgeLabels.edge).toMatchObject({
      middle: "preserved",
    })
    deferred.resolve({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: 1,
      kind: "result",
      positions: { a: { x: 0, y: 0 }, b: { x: 200, y: 0 } },
    })

    await expect(execution.result).resolves.toEqual({
      status: "applied",
      movedNodeCount: 0,
      replacedManualRouteCount: 1,
    })
    expect(store.getState().edges[0].data).toEqual({
      points: [],
      label: "preserved",
    })
    expect(store.getState().edges[1].data).toMatchObject({
      points: [{ x: 100, y: 40 }],
      sourceAnchor: { side: Position.Right, ratio: 0.5 },
    })
    doc.destroy()
  })

  it("keeps a concurrent manual-route edit and discards the layout as stale", async () => {
    const { doc, store, reactFlow } = fixture()
    store.getState().setEdges([edge("edge", { points: [{ x: 100, y: 20 }] })])
    const deferred = deferredJob()
    const execution = executeArrangeDiagram({
      diagramStore: store,
      reactFlow,
      isModifiable: () => true,
      isInteractionActive: () => false,
      getDiagramType: () => "ClassDiagram",
      replaceManualRoutes: true,
      startJob: () => deferred.job,
    })
    store.getState().setEdges([edge("edge", { points: [{ x: 100, y: 45 }] })])
    deferred.resolve({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: 1,
      kind: "result",
      positions: { a: { x: 0, y: 0 }, b: { x: 250, y: 0 } },
    })

    await expect(execution.result).resolves.toEqual({ status: "stale" })
    expect(store.getState().nodes[1].position).toEqual({ x: 200, y: 0 })
    expect(store.getState().edges[0].data?.points).toEqual([{ x: 100, y: 45 }])
    doc.destroy()
  })

  it("allows selection-only changes and applies a valid result", async () => {
    const { doc, store, reactFlow } = fixture()
    const deferred = deferredJob()
    const execution = executeArrangeDiagram({
      diagramStore: store,
      reactFlow,
      isModifiable: () => true,
      isInteractionActive: () => false,
      getDiagramType: () => "ClassDiagram",
      startJob: () => deferred.job,
    })
    store
      .getState()
      .setNodes((nodes) =>
        nodes.map((item) =>
          item.id === "a" ? { ...item, selected: true } : item
        )
      )
    deferred.resolve({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: 1,
      kind: "result",
      positions: { a: { x: 0, y: 0 }, b: { x: 250, y: 0 } },
    })

    await expect(execution.result).resolves.toEqual({
      status: "applied",
      movedNodeCount: 1,
      replacedManualRouteCount: 0,
    })
    expect(store.getState().nodes[1].position).toEqual({ x: 250, y: 0 })
    doc.destroy()
  })

  it("discards a result when geometry changes during the job", async () => {
    const { doc, store, reactFlow } = fixture()
    const deferred = deferredJob()
    const execution = executeArrangeDiagram({
      diagramStore: store,
      reactFlow,
      isModifiable: () => true,
      isInteractionActive: () => false,
      getDiagramType: () => "ClassDiagram",
      startJob: () => deferred.job,
    })
    store
      .getState()
      .setNodes((nodes) =>
        nodes.map((item) =>
          item.id === "b" ? { ...item, position: { x: 225, y: 0 } } : item
        )
      )
    deferred.resolve({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: 1,
      kind: "result",
      positions: { a: { x: 0, y: 0 }, b: { x: 250, y: 0 } },
    })

    await expect(execution.result).resolves.toEqual({ status: "stale" })
    expect(store.getState().nodes[1].position).toEqual({ x: 225, y: 0 })
    doc.destroy()
  })

  it("discards a result when a document node is added before React Flow renders it", async () => {
    const { doc, store, reactFlow } = fixture()
    const deferred = deferredJob()
    const execution = executeArrangeDiagram({
      diagramStore: store,
      reactFlow,
      isModifiable: () => true,
      isInteractionActive: () => false,
      getDiagramType: () => "ClassDiagram",
      startJob: () => deferred.job,
    })
    store.getState().setNodes((nodes) => [...nodes, node("new", 400, 0)])
    deferred.resolve({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: 1,
      kind: "result",
      positions: { a: { x: 0, y: 0 }, b: { x: 250, y: 0 } },
    })

    await expect(execution.result).resolves.toEqual({ status: "stale" })
    expect(store.getState().nodes).toHaveLength(3)
    doc.destroy()
  })

  it("discards a result when node content changes before its size is remeasured", async () => {
    const { doc, store, reactFlow } = fixture()
    const deferred = deferredJob()
    const execution = executeArrangeDiagram({
      diagramStore: store,
      reactFlow,
      isModifiable: () => true,
      isInteractionActive: () => false,
      getDiagramType: () => "ClassDiagram",
      startJob: () => deferred.job,
    })
    store
      .getState()
      .setNodes((nodes) =>
        nodes.map((item) =>
          item.id === "a"
            ? { ...item, data: { name: "A much longer class name" } }
            : item
        )
      )
    deferred.resolve({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: 1,
      kind: "result",
      positions: { a: { x: 0, y: 0 }, b: { x: 250, y: 0 } },
    })

    await expect(execution.result).resolves.toEqual({ status: "stale" })
    expect(store.getState().nodes[1].position).toEqual({ x: 200, y: 0 })
    doc.destroy()
  })

  it("supersedes an API or UI job through the shared coordinator", async () => {
    const { doc, store, reactFlow } = fixture()
    const first = deferredJob()
    const second = deferredJob()
    const jobs = [first.job, second.job]
    const startJob = () => jobs.shift()!
    const options = {
      diagramStore: store,
      reactFlow,
      isModifiable: () => true,
      isInteractionActive: () => false,
      getDiagramType: () => "ClassDiagram" as const,
      startJob,
    }
    const firstExecution = executeArrangeDiagram(options)
    const secondExecution = executeArrangeDiagram(options)

    await expect(firstExecution.result).rejects.toMatchObject({
      name: "AbortError",
    })
    expect(first.cancel).toHaveBeenCalledOnce()
    second.resolve({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: 2,
      kind: "result",
      positions: { a: { x: 0, y: 0 }, b: { x: 250, y: 0 } },
    })
    await expect(secondExecution.result).resolves.toEqual({
      status: "applied",
      movedNodeCount: 1,
      replacedManualRouteCount: 0,
    })
    doc.destroy()
  })
})
