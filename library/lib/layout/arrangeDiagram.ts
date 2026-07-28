import {
  ConnectionMode,
  type InternalNode,
  type ReactFlowInstance,
} from "@xyflow/react"
import type { StoreApi } from "zustand"
import type { DiagramStore } from "@/store/diagramStore"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"
import { serializeSolverInput } from "@/utils/geometry/edgeGeometryWorkerProtocol"
import {
  getDiagramLayoutAvailability,
  getVisibleLayoutEdges,
} from "./availability"
import {
  startDiagramLayoutJob,
  type DiagramLayoutJob,
} from "./workerController"
import type { ArrangeDiagramResult } from "./types"
import type { UMLDiagramType } from "@/typings"
import { compareLayoutId } from "./graph"
import type { DiagramLayoutSnapshot } from "./model"
import { measureTextWidth } from "@/utils/textUtils"
import { FONT_FAMILY } from "@/fontStack"
import {
  hasManualEdgeRouting,
  resetManualEdgeRouting,
} from "@/edges/routingAuthority"

const solverSnapshot = (
  reactFlow: ReactFlowInstance,
  authoritativeNodes: DiagramStore["nodes"],
  edges: DiagramStore["edges"]
): DiagramLayoutSnapshot => {
  const authoritativeById = new Map(
    authoritativeNodes.map((node) => [node.id, node])
  )
  const nodes = reactFlow
    .getNodes()
    .map((rendered) => {
      const authoritative = authoritativeById.get(rendered.id)
      return authoritative
        ? {
            ...rendered,
            ...authoritative,
            width: rendered.width,
            height: rendered.height,
            measured: rendered.measured,
          }
        : rendered
    })
    .filter((node) => !node.hidden)
  const visibleEdges = getVisibleLayoutEdges(nodes, edges)
  const automaticEdges = visibleEdges.map(resetManualEdgeRouting)
  const nodeLookup = new Map<string, InternalNode>()
  for (const node of nodes) {
    const internal = reactFlow.getInternalNode(node.id)
    if (internal)
      nodeLookup.set(node.id, {
        ...internal,
        ...node,
        internals: {
          ...internal.internals,
          positionAbsolute: { ...node.position },
          userNode: node,
        },
      })
  }
  const solver = serializeSolverInput({
    nodes,
    nodeLookup,
    connectionMode: ConnectionMode.Loose,
    edges: automaticEdges,
    straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
    straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
  })
  const edgeLabels = Object.fromEntries(
    visibleEdges.flatMap((edge) => {
      const values = {
        middle: edge.data?.label,
        sourceRole: edge.data?.sourceRole,
        sourceMultiplicity: edge.data?.sourceMultiplicity,
        targetRole: edge.data?.targetRole,
        targetMultiplicity: edge.data?.targetMultiplicity,
      }
      const stringLabels = Object.fromEntries(
        Object.entries(values).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string" && entry[1].length > 0
        )
      )
      const labels: Record<string, string | number> = {
        ...stringLabels,
      }
      for (const [key, text] of Object.entries(stringLabels))
        labels[`${key}Width`] = measureTextWidth(
          text,
          key === "middle"
            ? `700 12px ${FONT_FAMILY}`
            : `400 16px ${FONT_FAMILY}`
        )
      return Object.keys(stringLabels).length > 0 ? [[edge.id, labels]] : []
    })
  )
  return { solver, edgeLabels }
}

const snapshotSignature = (snapshot: DiagramLayoutSnapshot): string => {
  const sortById = <T extends { id: string }>(values: readonly T[]) =>
    [...values].sort((left, right) => compareLayoutId(left.id, right.id))
  return JSON.stringify({
    solver: {
      ...snapshot.solver,
      nodes: sortById(snapshot.solver.nodes),
      nodeLookup: [...snapshot.solver.nodeLookup].sort(([left], [right]) =>
        compareLayoutId(left, right)
      ),
      edges: sortById(snapshot.solver.edges),
      fixedEdges: snapshot.solver.fixedEdges
        ? sortById(snapshot.solver.fixedEdges)
        : undefined,
    },
    edgeLabels: Object.fromEntries(
      Object.entries(snapshot.edgeLabels).sort(([left], [right]) =>
        compareLayoutId(left, right)
      )
    ),
  })
}

const documentLayoutSignature = (
  nodes: DiagramStore["nodes"],
  edges: DiagramStore["edges"]
): string =>
  JSON.stringify([
    nodes
      .map((node) => [
        node.id,
        node.type ?? "",
        node.position.x,
        node.position.y,
        node.width ?? node.measured?.width ?? null,
        node.height ?? node.measured?.height ?? null,
        node.parentId ?? "",
        node.hidden === true,
        node.data,
      ])
      .sort((left, right) =>
        compareLayoutId(String(left[0]), String(right[0]))
      ),
    edges
      .map((edge) => [
        edge.id,
        edge.source,
        edge.target,
        edge.type ?? "",
        edge.sourceHandle ?? "",
        edge.targetHandle ?? "",
        edge.hidden === true,
        edge.data?.points ?? [],
        edge.data?.sourceAnchor ?? null,
        edge.data?.targetAnchor ?? null,
        edge.data?.label ?? null,
        edge.data?.sourceRole ?? null,
        edge.data?.sourceMultiplicity ?? null,
        edge.data?.targetRole ?? null,
        edge.data?.targetMultiplicity ?? null,
      ])
      .sort((left, right) =>
        compareLayoutId(String(left[0]), String(right[0]))
      ),
  ])

export type ArrangeDiagramExecution = Readonly<{
  result: Promise<ArrangeDiagramResult>
  cancel: () => void
}>

const activeJobs = new WeakMap<StoreApi<DiagramStore>, DiagramLayoutJob>()

export const cancelActiveDiagramLayout = (
  diagramStore: StoreApi<DiagramStore>
): void => {
  activeJobs.get(diagramStore)?.cancel()
  activeJobs.delete(diagramStore)
}

/**
 * Shared orchestration for the public API and built-in control. The Worker sees
 * a clone-only geometry snapshot; the final commit is accepted only when both
 * the document and React Flow measurements still match that snapshot.
 */
export const executeArrangeDiagram = ({
  diagramStore,
  reactFlow,
  isModifiable,
  isInteractionActive,
  getDiagramType,
  replaceManualRoutes = false,
  startJob = startDiagramLayoutJob,
}: {
  diagramStore: StoreApi<DiagramStore>
  reactFlow: ReactFlowInstance
  isModifiable: () => boolean
  isInteractionActive: () => boolean
  getDiagramType: () => UMLDiagramType
  replaceManualRoutes?: boolean
  startJob?: typeof startDiagramLayoutJob
}): ArrangeDiagramExecution => {
  cancelActiveDiagramLayout(diagramStore)
  const state = diagramStore.getState()
  const edgesRef = state.edges
  const rfNodes = reactFlow.getNodes()
  const renderedIds = new Set(rfNodes.map((node) => node.id))
  if (
    state.nodes.some((node) => !node.hidden && !renderedIds.has(node.id)) ||
    rfNodes.some(
      (node) =>
        !node.hidden && !state.nodes.some((stored) => stored.id === node.id)
    )
  )
    return {
      result: Promise.resolve({
        status: "unavailable",
        reason: "unmeasured-nodes",
      }),
      cancel: () => {},
    }
  if (rfNodes.filter((node) => !node.hidden).length < 2)
    return {
      result: Promise.resolve({ status: "unchanged" }),
      cancel: () => {},
    }
  const diagramType = getDiagramType()
  const availability = getDiagramLayoutAvailability({
    nodes: rfNodes,
    edges: edgesRef,
    modifiable: isModifiable(),
    interactionActive:
      isInteractionActive() ||
      rfNodes.some((node) => node.dragging || node.resizing),
  })
  if (!availability.available)
    return {
      result: Promise.resolve({
        status: "unavailable",
        reason: availability.reason,
      }),
      cancel: () => {},
    }

  const resetEdgeRoutingIds = getVisibleLayoutEdges(rfNodes, edgesRef)
    .filter(hasManualEdgeRouting)
    .map((edge) => edge.id)
  if (resetEdgeRoutingIds.length > 0 && !replaceManualRoutes)
    return {
      result: Promise.resolve({
        status: "confirmation-required",
        manualRouteCount: resetEdgeRoutingIds.length,
      }),
      cancel: () => {},
    }

  const snapshot = solverSnapshot(reactFlow, state.nodes, edgesRef)
  const before = snapshotSignature(snapshot)
  const beforeDocument = documentLayoutSignature(state.nodes, edgesRef)
  let job: DiagramLayoutJob
  try {
    job = startJob(snapshot)
  } catch (error) {
    return {
      result: Promise.reject(error),
      cancel: () => {},
    }
  }
  activeJobs.set(diagramStore, job)

  return {
    cancel: job.cancel,
    result: job.result
      .then((layout) => {
        const current = diagramStore.getState()
        if (
          !isModifiable() ||
          isInteractionActive() ||
          reactFlow.getNodes().some((node) => node.dragging || node.resizing) ||
          getDiagramType() !== diagramType ||
          documentLayoutSignature(current.nodes, current.edges) !==
            beforeDocument ||
          snapshotSignature(
            solverSnapshot(reactFlow, current.nodes, current.edges)
          ) !== before
        )
          return { status: "stale" } as const

        const positions = Object.fromEntries(
          current.nodes.map((node) => [
            node.id,
            layout.positions[node.id] ?? node.position,
          ])
        )
        const changes = current.applyDiagramLayout({
          positions,
          resetEdgeRoutingIds,
        })
        return changes
          ? ({ status: "applied", ...changes } as const)
          : ({ status: "unchanged" } as const)
      })
      .finally(() => {
        if (activeJobs.get(diagramStore) === job)
          activeJobs.delete(diagramStore)
      }),
  }
}
