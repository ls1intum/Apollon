import type { ApollonEdge, ApollonNode, UMLModel } from "../typings"

/**
 * Structural diff of two UML models. Compares node and edge sets by stable ID
 * (added / removed) and per-element field equality (changed). Pure-functional;
 * no editor state, no rendering, no DOM.
 */
export interface DiffElementSummary {
  id: string
  type: string
  /** Display label derived from common name fields (best-effort, may be empty). */
  name: string
}

export interface ChangedElement {
  id: string
  type: string
  name: string
  /** Top-level field paths whose values differ between baseline and comparand. */
  fields: string[]
}

export interface DiagramDiff {
  added: { nodes: DiffElementSummary[]; edges: DiffElementSummary[] }
  removed: { nodes: DiffElementSummary[]; edges: DiffElementSummary[] }
  changed: { nodes: ChangedElement[]; edges: ChangedElement[] }
  /** Quick count helpers — useful for one-line summaries. */
  totals: {
    nodesAdded: number
    nodesRemoved: number
    nodesChanged: number
    edgesAdded: number
    edgesRemoved: number
    edgesChanged: number
  }
}

const NAME_KEYS = ["name", "label", "title", "text", "content"] as const

function elementName(
  el: { data?: Record<string, unknown> } | undefined
): string {
  if (!el || !el.data) return ""
  for (const key of NAME_KEYS) {
    const v = el.data[key]
    if (typeof v === "string" && v.trim().length > 0) return v.trim()
  }
  return ""
}

function nodeSummary(n: ApollonNode): DiffElementSummary {
  return { id: n.id, type: n.type, name: elementName(n) }
}

function edgeSummary(e: ApollonEdge): DiffElementSummary {
  return { id: e.id, type: e.type, name: elementName(e) }
}

function indexById<T extends { id: string }>(
  arr: readonly T[]
): Map<string, T> {
  const m = new Map<string, T>()
  for (const item of arr) m.set(item.id, item)
  return m
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false
    return true
  }
  if (typeof a === "object" && typeof b === "object") {
    const ao = a as Record<string, unknown>
    const bo = b as Record<string, unknown>
    const aKeys = Object.keys(ao)
    const bKeys = Object.keys(bo)
    if (aKeys.length !== bKeys.length) return false
    for (const k of aKeys) if (!deepEqual(ao[k], bo[k])) return false
    return true
  }
  return false
}

/**
 * Returns the top-level field paths whose values differ between two records,
 * with `.data.<key>` granularity for the `data` blob (the most informative
 * sub-tree on UML elements).
 */
function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const fields = new Set<string>()
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of allKeys) {
    const a = before[key]
    const b = after[key]
    if (deepEqual(a, b)) continue
    if (
      key === "data" &&
      a &&
      b &&
      typeof a === "object" &&
      typeof b === "object" &&
      !Array.isArray(a) &&
      !Array.isArray(b)
    ) {
      const ao = a as Record<string, unknown>
      const bo = b as Record<string, unknown>
      const dataKeys = new Set([...Object.keys(ao), ...Object.keys(bo)])
      for (const dk of dataKeys) {
        if (!deepEqual(ao[dk], bo[dk])) fields.add(`data.${dk}`)
      }
    } else {
      fields.add(key)
    }
  }
  return Array.from(fields).sort()
}

/**
 * Computes a structural diff between two UML models. Order of nodes/edges in
 * the input is irrelevant — comparison is keyed on stable element IDs.
 */
export function diffModel(a: UMLModel, b: UMLModel): DiagramDiff {
  const aNodes = indexById(a.nodes)
  const bNodes = indexById(b.nodes)
  const aEdges = indexById(a.edges)
  const bEdges = indexById(b.edges)

  const addedNodes: DiffElementSummary[] = []
  const removedNodes: DiffElementSummary[] = []
  const changedNodes: ChangedElement[] = []
  const addedEdges: DiffElementSummary[] = []
  const removedEdges: DiffElementSummary[] = []
  const changedEdges: ChangedElement[] = []

  for (const [id, before] of aNodes) {
    const after = bNodes.get(id)
    if (!after) {
      removedNodes.push(nodeSummary(before))
      continue
    }
    const fields = changedFields(
      before as unknown as Record<string, unknown>,
      after as unknown as Record<string, unknown>
    )
    if (fields.length > 0) {
      changedNodes.push({
        id,
        type: after.type,
        name: elementName(after) || elementName(before),
        fields,
      })
    }
  }
  for (const [id, after] of bNodes) {
    if (!aNodes.has(id)) addedNodes.push(nodeSummary(after))
  }

  for (const [id, before] of aEdges) {
    const after = bEdges.get(id)
    if (!after) {
      removedEdges.push(edgeSummary(before))
      continue
    }
    const fields = changedFields(
      before as unknown as Record<string, unknown>,
      after as unknown as Record<string, unknown>
    )
    if (fields.length > 0) {
      changedEdges.push({
        id,
        type: after.type,
        name: elementName(after) || elementName(before),
        fields,
      })
    }
  }
  for (const [id, after] of bEdges) {
    if (!aEdges.has(id)) addedEdges.push(edgeSummary(after))
  }

  return {
    added: { nodes: addedNodes, edges: addedEdges },
    removed: { nodes: removedNodes, edges: removedEdges },
    changed: { nodes: changedNodes, edges: changedEdges },
    totals: {
      nodesAdded: addedNodes.length,
      nodesRemoved: removedNodes.length,
      nodesChanged: changedNodes.length,
      edgesAdded: addedEdges.length,
      edgesRemoved: removedEdges.length,
      edgesChanged: changedEdges.length,
    },
  }
}
