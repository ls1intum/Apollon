import type { Node, Edge } from "@xyflow/react"
import { getPositionOnCanvas } from "@/utils/nodeUtils"

/**
 * Reconstruct the clean syntax-tree forest from a freeform React Flow graph.
 *
 * The editor lets users draw whatever they like, so the input can be malformed:
 * a node may have several parents, edges may form cycles, and links may cross
 * container boundaries. This module contains that mess — it never corrupts the
 * graph. Anything it cannot lay out as a clean rooted tree is reported in
 * `skipped` and MUST keep its exact current position; everything else lands in
 * `laidOut` with an ordered child list ready for `layoutTidyTree`.
 */

/** Node types that participate in a syntax tree (see `library/lib/constants.ts`). */
const SYNTAX_TREE_NODE_TYPES: ReadonlySet<string> = new Set([
  "syntaxTreeNonterminal",
  "syntaxTreeTerminal",
])

/** Edge type connecting syntax-tree nodes (see `library/lib/edges/types.tsx`). */
const SYNTAX_TREE_EDGE_TYPE = "SyntaxTreeLink"

export interface Forest {
  /** Root ids (indegree-0, clean) of each independently laid-out component. */
  roots: string[]
  /** Ordered clean children per laid-out node (parent → child ids). */
  childIds: Map<string, string[]>
  /** Nodes the tidy layout will place. */
  laidOut: Set<string>
  /** Malformed nodes that must keep their exact current position. */
  skipped: Set<string>
}

const isSyntaxTreeNode = (node: Node): boolean =>
  !!node.type && SYNTAX_TREE_NODE_TYPES.has(node.type)

/** Container-nesting depth: how many `parentId` hops reach a top-level node. */
const containerDepth = (node: Node, nodeById: Map<string, Node>): number => {
  let depth = 0
  let current: Node | undefined = node
  const guard = new Set<string>()
  while (current?.parentId && !guard.has(current.id)) {
    guard.add(current.id)
    depth++
    current = nodeById.get(current.parentId)
  }
  return depth
}

export function buildSyntaxTreeForest(nodes: Node[], edges: Edge[]): Forest {
  const nodeById = new Map<string, Node>()
  for (const node of nodes) nodeById.set(node.id, node)

  const syntaxNodes = nodes.filter(isSyntaxTreeNode)
  const syntaxIds = new Set(syntaxNodes.map((node) => node.id))

  // Absolute canvas x per syntax node — the child ordering key, and the
  // tie-break within cross-container links.
  const canvasX = new Map<string, number>()
  for (const node of syntaxNodes) {
    canvasX.set(node.id, getPositionOnCanvas(node, nodes).x)
  }

  const skipped = new Set<string>()
  const childIds = new Map<string, string[]>()
  const indegree = new Map<string, number>()
  for (const id of syntaxIds) {
    childIds.set(id, [])
    indegree.set(id, 0)
  }

  // Pass 1: keep only syntax-tree links between two syntax-tree nodes. A link
  // that crosses a container boundary is dropped and its deeper endpoint marked
  // skipped, so container scopes never merge into one tree.
  for (const edge of edges) {
    if (edge.type !== SYNTAX_TREE_EDGE_TYPE) continue
    const parentId = edge.source
    const childId = edge.target
    if (!syntaxIds.has(parentId) || !syntaxIds.has(childId)) continue
    if (parentId === childId) {
      // A self-link is a degenerate cycle — the node cannot be a clean tree.
      skipped.add(parentId)
      continue
    }

    const parentNode = nodeById.get(parentId)!
    const childNode = nodeById.get(childId)!
    if (
      (parentNode.parentId ?? undefined) !== (childNode.parentId ?? undefined)
    ) {
      const deeperIsChild =
        containerDepth(childNode, nodeById) >=
        containerDepth(parentNode, nodeById)
      skipped.add(deeperIsChild ? childId : parentId)
      continue
    }

    childIds.get(parentId)!.push(childId)
    indegree.set(childId, (indegree.get(childId) ?? 0) + 1)
  }

  // Order every parent's children by current absolute x, then id — the fixed,
  // deterministic order the tidy layout consumes.
  for (const [parentId, children] of childIds) {
    children.sort((a, b) => {
      const dx = (canvasX.get(a) ?? 0) - (canvasX.get(b) ?? 0)
      return dx !== 0 ? dx : a < b ? -1 : a > b ? 1 : 0
    })
    childIds.set(parentId, children)
  }

  // Pass 2: any node with two or more parents cannot sit in a single tree.
  // Mark it and its whole descendant subtree skipped.
  const skipSubtree = (rootId: string): void => {
    const stack = [rootId]
    while (stack.length) {
      const id = stack.pop()!
      if (skipped.has(id)) continue
      skipped.add(id)
      for (const child of childIds.get(id) ?? []) stack.push(child)
    }
  }
  for (const id of syntaxIds) {
    if ((indegree.get(id) ?? 0) >= 2) skipSubtree(id)
  }

  // Pass 3: skip every node on a directed cycle (Tarjan strongly-connected
  // components of size > 1). Self-links were already handled above.
  for (const id of tarjanCyclicNodes(syntaxIds, childIds)) skipped.add(id)

  // Roots are the clean indegree-0 nodes. Build each component top-down, never
  // descending into a skipped node and never visiting a node twice.
  const laidOut = new Set<string>()
  const roots: string[] = []
  const cleanChildIds = new Map<string, string[]>()

  const collect = (rootId: string): void => {
    const stack = [rootId]
    while (stack.length) {
      const id = stack.pop()!
      if (laidOut.has(id) || skipped.has(id)) continue
      laidOut.add(id)
      const children = (childIds.get(id) ?? []).filter(
        (child) => !skipped.has(child)
      )
      cleanChildIds.set(id, children)
      for (const child of children) stack.push(child)
    }
  }

  const rootCandidates = [...syntaxIds]
    .filter((id) => !skipped.has(id) && (indegree.get(id) ?? 0) === 0)
    .sort((a, b) => {
      const dx = (canvasX.get(a) ?? 0) - (canvasX.get(b) ?? 0)
      return dx !== 0 ? dx : a < b ? -1 : a > b ? 1 : 0
    })
  for (const id of rootCandidates) {
    if (laidOut.has(id) || skipped.has(id)) continue
    roots.push(id)
    collect(id)
  }

  // Any clean child list must be pruned to the nodes that survived collection.
  for (const [id, children] of cleanChildIds) {
    cleanChildIds.set(
      id,
      children.filter((child) => laidOut.has(child))
    )
  }

  return { roots, childIds: cleanChildIds, laidOut, skipped }
}

/**
 * Ids that belong to a strongly-connected component of size > 1 in the
 * `parent → child` graph — i.e. every node caught on a directed cycle.
 * Iterative Tarjan so deep chains cannot overflow the stack.
 */
function tarjanCyclicNodes(
  ids: ReadonlySet<string>,
  childIds: ReadonlyMap<string, string[]>
): Set<string> {
  const index = new Map<string, number>()
  const lowlink = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const cyclic = new Set<string>()
  let counter = 0

  type Frame = { id: string; childIndex: number }

  for (const start of ids) {
    if (index.has(start)) continue
    const frames: Frame[] = [{ id: start, childIndex: 0 }]
    index.set(start, counter)
    lowlink.set(start, counter)
    counter++
    stack.push(start)
    onStack.add(start)

    while (frames.length) {
      const frame = frames[frames.length - 1]
      const children = childIds.get(frame.id) ?? []
      if (frame.childIndex < children.length) {
        const child = children[frame.childIndex]
        frame.childIndex++
        if (!index.has(child)) {
          index.set(child, counter)
          lowlink.set(child, counter)
          counter++
          stack.push(child)
          onStack.add(child)
          frames.push({ id: child, childIndex: 0 })
        } else if (onStack.has(child)) {
          lowlink.set(
            frame.id,
            Math.min(lowlink.get(frame.id)!, index.get(child)!)
          )
        }
      } else {
        if (lowlink.get(frame.id) === index.get(frame.id)) {
          const component: string[] = []
          let popped: string
          do {
            popped = stack.pop()!
            onStack.delete(popped)
            component.push(popped)
          } while (popped !== frame.id)
          if (component.length > 1) for (const id of component) cyclic.add(id)
        }
        frames.pop()
        if (frames.length) {
          const parent = frames[frames.length - 1]
          lowlink.set(
            parent.id,
            Math.min(lowlink.get(parent.id)!, lowlink.get(frame.id)!)
          )
        }
      }
    }
  }
  return cyclic
}
