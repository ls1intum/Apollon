import type { Node, Edge, XYPosition } from "@xyflow/react"
import { getPositionOnCanvas } from "@/utils/nodeUtils"
import { buildSyntaxTreeForest, type Forest } from "./buildForest"
import {
  layoutTidyTree,
  type TidyNodeInput,
  type TidyOptions,
} from "./tidyTree"

export type { TidyOptions } from "./tidyTree"
export type { Forest } from "./buildForest"

/** Fallback footprint for a syntax-tree node with no measured or declared size. */
const FALLBACK_WIDTH = 90
const FALLBACK_HEIGHT = 40

/** Sensible defaults; `gridSnap` mirrors `CANVAS.SNAP_TO_GRID_PX`. */
export const DEFAULT_TIDY_OPTIONS: TidyOptions = {
  siblingGap: 30,
  subtreeGap: 20,
  levelGap: 60,
  gridSnap: 5,
}

const measuredWidth = (node: Node): number =>
  node.measured?.width ?? node.width ?? FALLBACK_WIDTH

const measuredHeight = (node: Node): number =>
  node.measured?.height ?? node.height ?? FALLBACK_HEIGHT

/**
 * Tidy the syntax-tree forest inside `nodes`, leaving every other node untouched.
 *
 * Returns a NEW nodes array of the same length and id set. Only nodes the layout
 * actually moves are replaced with a fresh object (new `position`); every other
 * node — non-syntax nodes, skipped malformed nodes, and already-tidy nodes — is
 * returned BY REFERENCE. Each clean component is translated so its root keeps its
 * current on-canvas position, so a tidy pass never makes the tree jump on screen
 * and re-running it on an already-tidy tree is idempotent.
 */
export function computeTidyLayout(
  nodes: Node[],
  edges: Edge[],
  opts: Partial<TidyOptions> = {}
): Node[] {
  const options: TidyOptions = { ...DEFAULT_TIDY_OPTIONS, ...opts }
  const forest: Forest = buildSyntaxTreeForest(nodes, edges)
  if (forest.laidOut.size === 0) return nodes

  const nodeById = new Map<string, Node>()
  for (const node of nodes) nodeById.set(node.id, node)

  // Feed real per-node footprints into the layout so long labels push siblings
  // apart. Child order comes straight from the forest (already deterministic).
  const inputById = new Map<string, TidyNodeInput>()
  for (const id of forest.laidOut) {
    const node = nodeById.get(id)
    if (!node) continue
    inputById.set(id, {
      id,
      width: measuredWidth(node),
      height: measuredHeight(node),
      childIds: forest.childIds.get(id) ?? [],
    })
  }

  const layout = layoutTidyTree(forest.roots, inputById, options)

  // Absolute on-canvas position each laid-out node should end up at: translate
  // every component so its root stays exactly where it is now.
  const targetCanvas = new Map<string, XYPosition>()
  for (const rootId of forest.roots) {
    const rootNode = nodeById.get(rootId)
    const rootLayout = layout.get(rootId)
    if (!rootNode || !rootLayout) continue
    const rootCanvas = getPositionOnCanvas(rootNode, nodes)
    const deltaX = rootCanvas.x - rootLayout.x
    const deltaY = rootCanvas.y - rootLayout.y

    // Walk the component from its root so each node inherits the same delta.
    const stack = [rootId]
    const visited = new Set<string>()
    while (stack.length) {
      const id = stack.pop()!
      if (visited.has(id)) continue
      visited.add(id)
      const nodeLayout = layout.get(id)
      if (nodeLayout) {
        targetCanvas.set(id, {
          x: nodeLayout.x + deltaX,
          y: nodeLayout.y + deltaY,
        })
      }
      for (const child of forest.childIds.get(id) ?? []) stack.push(child)
    }
  }

  return nodes.map((node) => {
    const canvasTarget = targetCanvas.get(node.id)
    if (!canvasTarget) return node

    // Convert the absolute canvas target back into a position relative to the
    // node's container (parentId), mirroring usePalettePlacement's nesting math.
    // The container is never a laid-out syntax node, so its canvas position is
    // read from the untouched input graph.
    let position: XYPosition = canvasTarget
    if (node.parentId) {
      const parent = nodeById.get(node.parentId)
      if (parent) {
        const parentCanvas = getPositionOnCanvas(parent, nodes)
        position = {
          x: canvasTarget.x - parentCanvas.x,
          y: canvasTarget.y - parentCanvas.y,
        }
      }
    }

    if (position.x === node.position.x && position.y === node.position.y) {
      return node
    }
    return { ...node, position }
  })
}
