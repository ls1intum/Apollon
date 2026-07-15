import { use, useLayoutEffect } from "react"
import { useStore, type InternalNode } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import {
  EdgeGeometryStoreContext,
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
 * The central edge-geometry engine: it routes EVERY edge in one synchronous
 * pass and commits the whole map to the shared geometry store, which the edge
 * components read back as their route.
 *
 * The commit runs in a LAYOUT effect so it lands before paint: route changes
 * render in the same frame as the node move that caused them, no settling.
 */
export const EdgeGeometrySolver = () => {
  const nodes = useStore((s) => s.nodes)
  const nodeLookup = useStore(
    (s) => s.nodeLookup as unknown as Map<string, InternalNode>
  )
  const connectionMode = useStore((s) => s.connectionMode)
  const edges = useDiagramStore((s) => s.edges)
  const setAllGeometry = useEdgeGeometryStore((s) => s.setAllGeometry)
  // The raw store, read via getState() inside the effect (not subscribed — that
  // would re-trigger the solve it commits) to hold the last routes for edges
  // whose nodes are momentarily unmeasured.
  const geometryStore = use(EdgeGeometryStoreContext)
  // The edge being bend/endpoint-dragged right now, if any: fed to the solver so
  // higher-id edges dodge the live preview.
  const liveEdgeOverride = useMetadataStore((s) => s.liveEdgeOverride)

  // RF mutates `nodeLookup` in place and keeps the `nodes` ref stable across
  // measurement, so keying the solve on those refs would freeze a stale result.
  // Subscribe instead to a content signature of everything a route depends on:
  // position, measured size, `handleBounds` (endpoints derive from measured
  // handle rects, which land a frame after the body — without this the first,
  // pre-handle solve would stick), and `hidden` (hidden nodes drop out of the
  // obstacle set). `useShallow` yields a new array only when one of these moves.
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
          `${n.id}|${p.x},${p.y}|${n.measured?.width ?? n.width},${n.measured?.height ?? n.height}|${hbSig}|${n.hidden ? 1 : 0}`
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
    const { routeById } = computeAllEdgeGeometry({
      nodes,
      nodeLookup,
      connectionMode,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
      liveOverride: liveEdgeOverride,
      previous: geometryStore?.getState().geometryById,
    })
    setAllGeometry(routeById)
    // `nodeGeometryKey` is the change trigger; `nodes`/`nodeLookup` are refs RF
    // mutates in place, so they never signal measurement on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    nodeGeometryKey,
    connectionMode,
    edges,
    liveEdgeOverride,
    geometryStore,
    setAllGeometry,
  ])

  return null
}
