/**
 * Buchheim–Jünger–Leipert linear-time tidy tree.
 *
 * A hand-written implementation of the layout described in:
 *
 *   Christoph Buchheim, Michael Jünger, Sebastian Leipert,
 *   "Improving Walker's Algorithm to Run in Linear Time" (Graph Drawing 2002),
 *
 * which itself improves
 *
 *   John Q. Walker II, "A Node-Positioning Algorithm for General Trees" (1990),
 *
 * the n-ary generalisation of
 *
 *   Edward M. Reingold, John S. Tilford,
 *   "Tidier Drawings of Trees" (IEEE TSE 1981).
 *
 * The two-pass structure (`firstWalk` computing preliminary x offsets and per-node
 * modifiers, `secondWalk` summing modifiers into absolute centres) with contour
 * threading (`thread`, `leftMost`/`rightMost` via `nextLeft`/`nextRight`), the
 * `ancestor` shortcut and the `shift`/`change` amortisation is exactly the BJL
 * scheme; `apportion` runs each contour pair once, giving overall linear time.
 *
 * This variant is n-ary and supports **variable node widths**: the minimum
 * horizontal separation between two adjacent subtrees at the same level is
 *
 *     half(width[left]) + siblingGap + half(width[right])   (+ subtreeGap
 *                                                            for distinct subtrees)
 *
 * fed straight into the apportion distance, so a long label pushes its siblings
 * apart instead of overlapping them. Vertical placement gives each depth a single
 * y equal to the cumulative maximum row height of the shallower levels plus
 * `levelGap`. The final absolute top-left coordinates are grid-snapped and the
 * whole layout is normalised so its minimum x and y are 0. The result is fully
 * deterministic: child order is fixed by the caller.
 */

export interface TidyOptions {
  /** Min horizontal clearance between adjacent sibling subtrees (px). */
  siblingGap: number
  /** Extra gap inserted between distinct sibling subtrees (px). */
  subtreeGap: number
  /** Vertical gap between depth levels (px). */
  levelGap: number
  /** Grid the final absolute coordinates snap to (px). */
  gridSnap: number
}

export interface TidyNodeInput {
  id: string
  width: number
  height: number
  childIds: string[]
}

export interface TidyPosition {
  x: number
  y: number
}

/**
 * A mutable working node for the two-pass walk. All coordinate fields live in a
 * centre-x space until `secondWalk`; `x` then holds the absolute centre.
 */
interface WorkNode {
  id: string
  width: number
  height: number
  depth: number
  parent: WorkNode | null
  children: WorkNode[]
  /** 1-based index among siblings — divisor in the shift smoothing. */
  number: number
  ancestor: WorkNode
  thread: WorkNode | null
  prelim: number
  mod: number
  change: number
  shift: number
  /** Absolute centre-x, filled by `secondWalk`. */
  x: number
}

const half = (value: number): number => value / 2

const snapToGrid = (value: number, grid: number): number =>
  grid > 0 ? Math.round(value / grid) * grid : Math.round(value)

/**
 * Layout a forest of tidy trees. `roots` gives the root id of each independent
 * component; `nodesById` supplies width/height and the (already ordered) child
 * ids for every node reachable from those roots. Returns absolute top-left
 * positions normalised so the whole forest's minimum x and y are 0.
 *
 * Anchoring a component to its current on-canvas position is the caller's job —
 * here every component is laid out in one shared, normalised coordinate space.
 */
export function layoutTidyTree(
  roots: string[],
  nodesById: Map<string, TidyNodeInput>,
  opts: TidyOptions
): Map<string, TidyPosition> {
  const built: WorkNode[] = []
  const seen = new Set<string>()

  const build = (
    id: string,
    parent: WorkNode | null,
    depth: number,
    number: number
  ): WorkNode | null => {
    const input = nodesById.get(id)
    if (!input) return null
    // A node can be reached only once in a clean forest; the guard keeps a
    // malformed input from looping and keeps the walk deterministic.
    if (seen.has(id)) return null
    seen.add(id)

    const node: WorkNode = {
      id,
      width: input.width,
      height: input.height,
      depth,
      parent,
      children: [],
      number,
      ancestor: null as unknown as WorkNode,
      thread: null,
      prelim: 0,
      mod: 0,
      change: 0,
      shift: 0,
      x: 0,
    }
    node.ancestor = node
    built.push(node)

    let childNumber = 1
    for (const childId of input.childIds) {
      const child = build(childId, node, depth + 1, childNumber)
      if (child) {
        node.children.push(child)
        childNumber++
      }
    }
    return node
  }

  const rootNodes: WorkNode[] = []
  for (const rootId of roots) {
    const root = build(rootId, null, 0, 1)
    if (root) rootNodes.push(root)
  }

  // Vertical: one y per depth, from the cumulative max row height of shallower
  // levels. Computed across the whole forest so equal depths stay aligned.
  const rowHeight: number[] = []
  for (const node of built) {
    rowHeight[node.depth] = Math.max(rowHeight[node.depth] ?? 0, node.height)
  }
  const depthTop: number[] = []
  let cumulative = 0
  for (let depth = 0; depth < rowHeight.length; depth++) {
    depthTop[depth] = cumulative
    cumulative += (rowHeight[depth] ?? 0) + opts.levelGap
  }

  const separation = (left: WorkNode, right: WorkNode): number => {
    const base = half(left.width) + half(right.width) + opts.siblingGap
    return left.parent === right.parent ? base : base + opts.subtreeGap
  }

  const nextLeft = (node: WorkNode): WorkNode | null =>
    node.children.length ? node.children[0] : node.thread

  const nextRight = (node: WorkNode): WorkNode | null =>
    node.children.length ? node.children[node.children.length - 1] : node.thread

  const nextAncestor = (
    vim: WorkNode,
    v: WorkNode,
    defaultAncestor: WorkNode
  ): WorkNode =>
    vim.ancestor.parent === v.parent ? vim.ancestor : defaultAncestor

  const moveSubtree = (wm: WorkNode, wp: WorkNode, shift: number): void => {
    const subtrees = wp.number - wm.number
    const change = shift / subtrees
    wp.change -= change
    wp.shift += shift
    wm.change += change
    wp.prelim += shift
    wp.mod += shift
  }

  const executeShifts = (v: WorkNode): void => {
    let shift = 0
    let change = 0
    for (let i = v.children.length - 1; i >= 0; i--) {
      const w = v.children[i]
      w.prelim += shift
      w.mod += shift
      change += w.change
      shift += w.shift + change
    }
  }

  const previousSibling = (v: WorkNode): WorkNode | null => {
    if (!v.parent) return null
    const index = v.number - 2 // number is 1-based; left sibling is number-1
    return index >= 0 ? v.parent.children[index] : null
  }

  const apportion = (v: WorkNode, defaultAncestor: WorkNode): WorkNode => {
    const w = previousSibling(v)
    if (!w) return defaultAncestor

    let vip: WorkNode | null = v
    let vop: WorkNode | null = v
    let vim: WorkNode | null = w
    let vom: WorkNode | null = v.parent!.children[0]
    let sip = vip.mod
    let sop = vop.mod
    let sim = vim.mod
    let som = vom.mod

    vim = nextRight(vim)
    vip = nextLeft(vip)
    while (vim && vip) {
      vom = nextLeft(vom!)
      vop = nextRight(vop!)
      vop!.ancestor = v
      const shift = vim.prelim + sim - (vip.prelim + sip) + separation(vim, vip)
      if (shift > 0) {
        moveSubtree(nextAncestor(vim, v, defaultAncestor), v, shift)
        sip += shift
        sop += shift
      }
      sim += vim.mod
      sip += vip.mod
      som += vom!.mod
      sop += vop!.mod

      vim = nextRight(vim)
      vip = nextLeft(vip)
    }

    if (vim && !nextRight(vop!)) {
      vop!.thread = vim
      vop!.mod += sim - sop
    }
    if (vip && !nextLeft(vom!)) {
      vom!.thread = vip
      vom!.mod += sip - som
      defaultAncestor = v
    }
    return defaultAncestor
  }

  const firstWalk = (v: WorkNode): void => {
    const w = previousSibling(v)
    if (v.children.length === 0) {
      v.prelim = w ? w.prelim + separation(v, w) : 0
      return
    }
    let defaultAncestor = v.children[0]
    for (const child of v.children) {
      firstWalk(child)
      defaultAncestor = apportion(child, defaultAncestor)
    }
    executeShifts(v)
    const midpoint = half(
      v.children[0].prelim + v.children[v.children.length - 1].prelim
    )
    if (w) {
      v.prelim = w.prelim + separation(v, w)
      v.mod = v.prelim - midpoint
    } else {
      v.prelim = midpoint
    }
  }

  const secondWalk = (v: WorkNode, modSum: number): void => {
    v.x = v.prelim + modSum
    for (const child of v.children) secondWalk(child, modSum + v.mod)
  }

  for (const root of rootNodes) {
    firstWalk(root)
    secondWalk(root, 0)
  }

  // Convert centre-x + depth into top-left coordinates, then normalise the whole
  // forest so its minimum x and y are 0 before grid-snapping. Snapping a common
  // translation of every node preserves the separation invariant exactly when
  // widths and gaps are grid multiples.
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  for (const node of built) {
    const left = node.x - half(node.width)
    if (left < minX) minX = left
    if (depthTop[node.depth] < minY) minY = depthTop[node.depth]
  }
  if (!Number.isFinite(minX)) minX = 0
  if (!Number.isFinite(minY)) minY = 0

  const positions = new Map<string, TidyPosition>()
  for (const node of built) {
    positions.set(node.id, {
      x: snapToGrid(node.x - half(node.width) - minX, opts.gridSnap),
      y: snapToGrid(depthTop[node.depth] - minY, opts.gridSnap),
    })
  }
  return positions
}
