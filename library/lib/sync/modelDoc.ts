import type { Edge, Node } from "@xyflow/react"
import * as Y from "yjs"
import type {
  ApollonEdge,
  ApollonNode,
  Assessment,
  InteractiveElements,
  UMLModel,
} from "../typings"
import {
  mapFromReactFlowEdgeToApollonEdge,
  mapFromReactFlowNodeToApollonNode,
  parseDiagramType,
} from "../utils/diagramTypeUtils"
import {
  CURRENT_MODEL_VERSION,
  normalizeModel,
} from "../utils/versionConverter"
import {
  nodeEntriesForPersistence,
  stripComputedSegmentsFromEdges,
} from "./persistedShape"
import {
  getAssessments,
  getDiagramMetadata,
  getEdgesMap,
  getNodesMap,
  reconcileYMap,
} from "./ydoc"

/**
 * Default transaction origin of the helpers below. It is deliberately not the
 * editor's own local-write origin, so a mounted editor on the same document
 * treats these writes as remote changes and keeps them out of its undo history.
 */
export const MODEL_DOC_ORIGIN = "apollon-model"

const DIAGRAM_TYPE_KEY = "diagramType"
const DIAGRAM_TITLE_KEY = "diagramTitle"
const DIAGRAM_ID_KEY = "diagramId"
const INTERACTIVE_KEY = "interactive"

const getMetadata = (ydoc: Y.Doc) =>
  getDiagramMetadata(ydoc) as unknown as Y.Map<unknown>

const byId = <T extends { id: string }>(a: T, b: T) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0

// Y.Map iteration order differs between peers, so the read side orders
// elements itself: by id, parents before their children.
function sortParentsFirst(nodes: ApollonNode[]): ApollonNode[] {
  const byNodeId = new Map(nodes.map((node) => [node.id, node]))
  const sorted: ApollonNode[] = []
  const visited = new Set<string>()
  const visit = (node: ApollonNode, trail: Set<string>) => {
    if (visited.has(node.id) || trail.has(node.id)) return
    trail.add(node.id)
    const parent = node.parentId ? byNodeId.get(node.parentId) : undefined
    if (parent) visit(parent, trail)
    visited.add(node.id)
    sorted.push(node)
  }
  for (const node of [...nodes].sort(byId)) visit(node, new Set())
  return sorted
}

/** Whether the document holds an Apollon diagram. */
export function hasModelInYDoc(ydoc: Y.Doc): boolean {
  return typeof getMetadata(ydoc).get(DIAGRAM_TYPE_KEY) === "string"
}

/** The id a diagram was written with, if the document carries one. */
export function getModelIdFromYDoc(ydoc: Y.Doc): string | undefined {
  const id = getMetadata(ydoc).get(DIAGRAM_ID_KEY)
  return typeof id === "string" && id !== "" ? id : undefined
}

export function getInteractiveFromYDoc(
  ydoc: Y.Doc
): InteractiveElements | undefined {
  return getMetadata(ydoc).get(INTERACTIVE_KEY) as
    | InteractiveElements
    | undefined
}

export function setModelIdInYDoc(
  ydoc: Y.Doc,
  id: string,
  origin: unknown = MODEL_DOC_ORIGIN
): void {
  ydoc.transact(() => getMetadata(ydoc).set(DIAGRAM_ID_KEY, id), origin)
}

/**
 * Writes `model` into `ydoc` in the layout the editor reads, replacing any
 * diagram already there. Synchronous, one transaction. Expects a current
 * model; run untrusted input through `importDiagram` first.
 */
export function writeModelToYDoc(
  ydoc: Y.Doc,
  model: UMLModel,
  origin: unknown = MODEL_DOC_ORIGIN
): void {
  const normalized = normalizeModel(structuredClone(model))
  const nodes = (normalized.nodes ?? []) as unknown as Node[]
  const edges = stripComputedSegmentsFromEdges(
    (normalized.edges ?? []) as unknown as Edge[]
  )
  ydoc.transact(() => {
    reconcileYMap(getNodesMap(ydoc), nodeEntriesForPersistence(nodes))
    reconcileYMap(
      getEdgesMap(ydoc),
      edges.map((edge) => [edge.id, edge] as const)
    )
    reconcileYMap(
      getAssessments(ydoc),
      Object.entries(normalized.assessments ?? {})
    )
    const metadata = getMetadata(ydoc)
    metadata.set(DIAGRAM_TITLE_KEY, normalized.title ?? "")
    metadata.set(DIAGRAM_TYPE_KEY, parseDiagramType(normalized.type))
    if (normalized.id) {
      metadata.set(DIAGRAM_ID_KEY, normalized.id)
    } else {
      metadata.delete(DIAGRAM_ID_KEY)
    }
    if (normalized.interactive) {
      metadata.set(INTERACTIVE_KEY, normalized.interactive)
    } else {
      metadata.delete(INTERACTIVE_KEY)
    }
  }, origin)
}

/**
 * Reads the diagram in `ydoc` as a model, or `null` when the document holds
 * none. The result is independent of the order in which a peer received the
 * document's updates.
 */
export function readModelFromYDoc(ydoc: Y.Doc): UMLModel | null {
  if (!hasModelInYDoc(ydoc)) return null
  const metadata = getMetadata(ydoc)
  const assessments: { [id: string]: Assessment } = {}
  const assessmentsMap = getAssessments(ydoc)
  for (const key of Array.from(assessmentsMap.keys()).sort()) {
    assessments[key] = assessmentsMap.get(key)!
  }
  const title = metadata.get(DIAGRAM_TITLE_KEY)
  const interactive = getInteractiveFromYDoc(ydoc)
  const edges: ApollonEdge[] = Array.from(getEdgesMap(ydoc).values())
    .map((edge) => mapFromReactFlowEdgeToApollonEdge(edge))
    .sort(byId)
  // A copy: the values in the maps are the objects Yjs holds. Handing them out
  // would let a caller change the document without a transaction, and a later
  // write would see no difference to reconcile.
  return structuredClone({
    version: CURRENT_MODEL_VERSION,
    id: getModelIdFromYDoc(ydoc) ?? "",
    title: typeof title === "string" ? title : "",
    type: parseDiagramType(metadata.get(DIAGRAM_TYPE_KEY)),
    nodes: sortParentsFirst(
      Array.from(getNodesMap(ydoc).values()).map((node) =>
        mapFromReactFlowNodeToApollonNode(node)
      )
    ),
    edges,
    assessments,
    ...(interactive && { interactive }),
  })
}

/** Removes the diagram from `ydoc`, leaving every other shared type alone. */
export function clearModelFromYDoc(
  ydoc: Y.Doc,
  origin: unknown = MODEL_DOC_ORIGIN
): void {
  ydoc.transact(() => {
    getNodesMap(ydoc).clear()
    getEdgesMap(ydoc).clear()
    getAssessments(ydoc).clear()
    getMetadata(ydoc).clear()
  }, origin)
}
