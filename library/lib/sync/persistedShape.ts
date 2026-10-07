import type { Edge, Node } from "@xyflow/react"

export function stripComputedSegmentsFromEdge(edge: Edge): Edge {
  if (
    !edge.data ||
    !Object.prototype.hasOwnProperty.call(edge.data, "computedSegments")
  ) {
    return edge
  }

  const data = { ...(edge.data as Record<string, unknown>) }
  delete data.computedSegments
  return { ...edge, data }
}

export function stripComputedSegmentsFromEdges(edges: Edge[]): Edge[] {
  return edges.map(stripComputedSegmentsFromEdge)
}

// The transient `selected` flag is re-overlaid locally on read
// (`updateNodesFromYjs`), so it must never be persisted: otherwise selection
// toggles become Yjs writes, undo entries and peer broadcasts.
export function stripSelected(node: Node): Node {
  const persisted = { ...node }
  delete persisted.selected
  return persisted
}

export function nodeEntriesForPersistence(
  nodes: Node[]
): Array<[string, Node]> {
  return nodes.map((node) => [node.id, stripSelected(node)])
}
