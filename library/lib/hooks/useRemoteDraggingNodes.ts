import { useEffect, useState } from "react"
import type { Node } from "@xyflow/react"
import type { CollaborationAwarenessApi } from "@/components/collaboration/CollaborationLayer"
import type { CollaborationState, DraggingNode } from "@/typings"

/**
 * Live positions/sizes of nodes that *remote* peers are currently dragging or
 * resizing, keyed by node id. These travel over the ephemeral awareness channel
 * (never the Yjs document — see `diagramStore.onNodesChange`), so this hook is
 * the read side of the live remote drag: it mirrors awareness into React state
 * that `applyDraggingOverlay` overlays onto the rendered nodes.
 */
export type RemoteDraggingOverlay = Map<string, DraggingNode>

const sameOverlay = (
  a: RemoteDraggingOverlay,
  b: RemoteDraggingOverlay
): boolean => {
  if (a.size !== b.size) return false
  for (const [id, node] of a) {
    const other = b.get(id)
    if (
      !other ||
      other.position.x !== node.position.x ||
      other.position.y !== node.position.y ||
      (other.width ?? null) !== (node.width ?? null) ||
      (other.height ?? null) !== (node.height ?? null)
    ) {
      return false
    }
  }
  return true
}

const buildOverlay = (
  states: Map<number, CollaborationState>,
  localClientId: number
): RemoteDraggingOverlay => {
  const overlay: RemoteDraggingOverlay = new Map()
  for (const [clientId, state] of states) {
    if (clientId === localClientId) continue
    const draggingNodes = state.draggingNodes
    if (!draggingNodes) continue
    // Last writer wins on the rare chance two peers drag the same node; the
    // node is one peer's at a time in practice, so collisions don't linger.
    for (const node of draggingNodes) overlay.set(node.id, node)
  }
  return overlay
}

export const useRemoteDraggingNodes = (
  awareness: CollaborationAwarenessApi,
  active: boolean
): RemoteDraggingOverlay => {
  const [overlay, setOverlay] = useState<RemoteDraggingOverlay>(() => new Map())

  useEffect(() => {
    if (!active) {
      // Drop any lingering overlay when collaboration turns off so locally
      // owned positions take over immediately.
      setOverlay((prev) => (prev.size === 0 ? prev : new Map()))
      return
    }

    const localClientId = awareness.getLocalAwarenessClientId()
    const rebuild = (states: Map<number, CollaborationState>) => {
      const next = buildOverlay(states, localClientId)
      // Bail out of the state update when nothing dragging changed, so an
      // unrelated awareness tick (a peer's cursor move) doesn't re-render the
      // whole canvas.
      setOverlay((prev) => (sameOverlay(prev, next) ? prev : next))
    }

    rebuild(awareness.getAwarenessStates())
    return awareness.subscribeToAwarenessChanges(rebuild)
  }, [awareness, active])

  return overlay
}

/**
 * Overlay remote live-drag positions/sizes onto the rendered nodes. Returns the
 * same array reference when there is nothing to overlay so React Flow skips the
 * update. Behaviourally identical to the old per-frame document write — it
 * moves the node in the controlled `nodes` prop — so connected edges follow
 * exactly as before; the difference is only the (ephemeral) source.
 */
export const applyDraggingOverlay = (
  nodes: Node[],
  overlay: RemoteDraggingOverlay
): Node[] => {
  if (overlay.size === 0) return nodes
  return nodes.map((node) => {
    const dragged = overlay.get(node.id)
    if (!dragged) return node
    return {
      ...node,
      position: dragged.position,
      ...(dragged.width != null ? { width: dragged.width } : {}),
      ...(dragged.height != null ? { height: dragged.height } : {}),
    }
  })
}
