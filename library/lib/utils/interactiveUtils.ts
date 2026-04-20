import { ApollonEdge, ApollonNode, InteractiveElements } from "@/typings"

function filterInteractiveRecord(
  record: Record<string, boolean> | undefined,
  allowedIds: Set<string>
): Record<string, boolean> {
  if (!record) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(record).filter(
      ([id, included]) => included && allowedIds.has(id)
    )
  )
}

export function pruneInteractiveElements(
  interactive: InteractiveElements | undefined,
  nodes: Array<Pick<ApollonNode, "id">>,
  edges: Array<Pick<ApollonEdge, "id">>
): InteractiveElements | undefined {
  if (!interactive) {
    return undefined
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edgeIds = new Set(edges.map((edge) => edge.id))

  const elements = filterInteractiveRecord(interactive.elements, nodeIds)
  const relationships = filterInteractiveRecord(
    interactive.relationships,
    edgeIds
  )

  if (
    Object.keys(elements).length === 0 &&
    Object.keys(relationships).length === 0
  ) {
    return undefined
  }

  return {
    elements,
    relationships,
  }
}

export function toggleInteractiveRecord(
  record: Record<string, boolean>,
  id: string
): Record<string, boolean> {
  const nextRecord = { ...record }

  if (nextRecord[id]) {
    delete nextRecord[id]
  } else {
    nextRecord[id] = true
  }

  return nextRecord
}

export function hasInteractiveSelections(
  interactive: InteractiveElements | undefined
): boolean {
  if (!interactive) {
    return false
  }

  return (
    Object.values(interactive.elements ?? {}).some(Boolean) ||
    Object.values(interactive.relationships ?? {}).some(Boolean)
  )
}
