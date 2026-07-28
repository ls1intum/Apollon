import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import { solveDiagramLayout } from "@/layout/candidateSolver"
import type { DiagramLayoutSnapshot } from "@/layout/model"
import type {
  SerializedInternalSolverNode,
  SerializedSolverNode,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"

const NODE_WIDTH = 100
const NODE_HEIGHT = 60

const internalNode = (
  node: SerializedSolverNode
): SerializedInternalSolverNode => ({
  ...node,
  positionAbsolute: { ...node.position },
  handleBounds: {
    source: [
      {
        id: null,
        type: "source",
        position: Position.Right,
        x: NODE_WIDTH,
        y: NODE_HEIGHT / 2,
        width: 1,
        height: 1,
      },
      {
        id: null,
        type: "source",
        position: Position.Bottom,
        x: NODE_WIDTH / 2,
        y: NODE_HEIGHT,
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
        y: NODE_HEIGHT / 2,
        width: 1,
        height: 1,
      },
      {
        id: null,
        type: "target",
        position: Position.Top,
        x: NODE_WIDTH / 2,
        y: 0,
        width: 1,
        height: 1,
      },
    ],
  },
})

const gridSnapshot = (columns: number, rows: number): DiagramLayoutSnapshot => {
  const nodes = Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    return {
      id: `node-${index.toString().padStart(3, "0")}`,
      type: "class",
      position: { x: column * 130, y: row * 90 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      measured: { width: NODE_WIDTH, height: NODE_HEIGHT },
    } satisfies SerializedSolverNode
  })
  const edges = nodes.flatMap((node, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    return [
      ...(column + 1 < columns
        ? [
            {
              id: `horizontal-${index}`,
              source: node.id,
              target: nodes[index + 1].id,
              type: "ClassUnidirectional",
            },
          ]
        : []),
      ...(row + 1 < rows
        ? [
            {
              id: `vertical-${index}`,
              source: node.id,
              target: nodes[index + columns].id,
              type: "ClassUnidirectional",
            },
          ]
        : []),
    ]
  })
  return {
    solver: {
      nodes,
      nodeLookup: nodes.map((node) => [node.id, internalNode(node)]),
      connectionMode: "loose",
      edges,
      straightPathTypes: ["ClassUnidirectional"],
      straightHookTypes: [],
    },
    edgeLabels: {},
  }
}

describe("diagram layout scale profile", () => {
  it("keeps a medium sparse graph within the exact solve budget", async () => {
    const snapshot = gridSnapshot(9, 9)
    let evaluations = 0
    const startedAt = performance.now()
    const result = await solveDiagramLayout(snapshot, undefined, () => {
      evaluations++
    })

    expect(Object.keys(result.positions)).toHaveLength(81)
    expect(evaluations).toBeLessThanOrEqual(4)
    expect(performance.now() - startedAt).toBeLessThan(4_000)
  })

  it("keeps a 120-node sparse graph below the Worker deadline", async () => {
    const snapshot = gridSnapshot(12, 10)
    let evaluations = 0
    const startedAt = performance.now()
    const result = await solveDiagramLayout(snapshot, undefined, () => {
      evaluations++
    })

    expect(Object.keys(result.positions)).toHaveLength(120)
    expect(evaluations).toBeLessThanOrEqual(2)
    expect(performance.now() - startedAt).toBeLessThan(5_000)
  })
})
