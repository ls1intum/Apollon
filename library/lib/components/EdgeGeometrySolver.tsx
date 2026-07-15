import { useLayoutEffect } from "react"
import { useStore, type InternalNode } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import {
  useDiagramStore,
  useEdgeGeometryStore,
  useMetadataStore,
} from "@/store/context"
import { computeAllEdgeGeometry } from "@/utils/geometry/edgeGeometrySolver"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"

/**
 * The central edge-geometry engine. When `edgeRouting === "central"` it routes
 * EVERY edge in one synchronous pass and commits the whole map to the shared
 * geometry store, replacing the per-edge publish→re-route cascade.
 *
 * The commit runs in a LAYOUT effect, not a passive one, and that timing is the
 * whole point: it lands before the browser paints, so React re-renders the edges
 * whose route changed and paint shows the converged layout for the current node
 * positions — single frame, no settling. But unlike the old cascade this is ONE
 * pre-paint pass over local variables, not N layers of cross-component
 * re-renders: the ascending-id DAG walk resolves the fixed point in the pure
 * solver (see computeAllEdgeGeometry), so there is nothing left to ripple.
 *
 * A no-op when routing is per-edge, so it is safe to mount unconditionally.
 */
export const EdgeGeometrySolver = () => {
  const edgeRouting = useMetadataStore((s) => s.edgeRouting)
  const nodes = useStore((s) => s.nodes)
  const nodeLookup = useStore(
    (s) => s.nodeLookup as unknown as Map<string, InternalNode>
  )
  const connectionMode = useStore((s) => s.connectionMode)
  const edges = useDiagramStore((s) => s.edges)
  const setAllGeometry = useEdgeGeometryStore((s) => s.setAllGeometry)

  // React Flow mutates `nodeLookup` IN PLACE and does not change the `nodes`
  // reference on measurement, so a memo keyed on those refs would keep a stale
  // solve from before the nodes were measured. Subscribe instead to a signature
  // of every node's absolute position and measured size (via `nodeLookup`, which
  // reflects measurement and drag): `useShallow` yields a new array only when
  // some node's geometry actually changes, which is exactly when routes can move.
  //
  // The signature MUST also fold in `handleBounds`: `getEdgePosition` (the exact
  // function this solver reuses) derives every endpoint from a node's measured
  // handle rects, and those populate a frame or two AFTER the node body measures.
  // Key only on position+size and the first solve runs before handles exist —
  // `getEdgePosition` returns null, every edge resolves to no route, and because
  // handle measurement changes neither position nor size the key never updates,
  // so that empty solve sticks forever. Folding a handle-bounds digest in makes
  // the effect re-run the instant the handles land.
  const nodeGeometryKey = useStore(
    useShallow((s) => {
      const sig: string[] = []
      for (const n of s.nodeLookup.values()) {
        const p = n.internals.positionAbsolute
        const hb = n.internals.handleBounds
        const hbSig = hb
          ? `${hb.source?.length ?? 0}:${hb.target?.length ?? 0}:${
              hb.source?.[0]
                ? `${hb.source[0].x},${hb.source[0].y},${hb.source[0].width},${hb.source[0].height}`
                : ""
            }`
          : "nohb"
        sig.push(
          `${n.id}|${p.x},${p.y}|${n.measured?.width ?? n.width},${n.measured?.height ?? n.height}|${hbSig}`
        )
      }
      return sig
    })
  )

  // Compute AND commit in the layout effect, not a memo. The React Compiler
  // infers a useMemo's deps from what its body READS and strips the rest, so a
  // memo keyed on `nodeGeometryKey` (never read inside) loses its only trigger
  // and caches the first, pre-measurement solve forever. Effect dependency
  // arrays are honored verbatim at runtime (the compiler does not rewrite them),
  // so keying on `nodeGeometryKey` — a fresh array ref, via `useShallow`,
  // precisely when any node's geometry moves — recomputes exactly when routes
  // can change, reading the current in-place-mutated `nodeLookup`.
  useLayoutEffect(() => {
    if (edgeRouting !== "central") return
    const { routeById } = computeAllEdgeGeometry({
      nodes,
      nodeLookup,
      connectionMode,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
    })
    setAllGeometry(routeById)
    // `nodeGeometryKey` is the change trigger; `nodes`/`nodeLookup` are refs RF
    // mutates in place, so they never signal measurement on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeRouting, nodeGeometryKey, connectionMode, edges, setAllGeometry])

  return null
}
