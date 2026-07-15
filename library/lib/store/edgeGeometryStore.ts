import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import { IPoint } from "@/edges/Connection"

/**
 * Runtime-only registry of each edge's ACTUAL rendered polyline (jump-free),
 * keyed by edge id. Line jumps read other edges' geometry from here instead of
 * re-deriving it, so a bridge always centers on the crossing the user actually
 * sees — regardless of edge type, routing (step / straight-path), handle, or
 * container offset. Each edge publishes on render and removes on unmount.
 *
 * Not persisted (Yjs never sees it) — it is ephemeral view geometry, exactly
 * the kind of "computed segments" the model deliberately does not store.
 */
export type EdgeGeometryStore = {
  geometryById: Record<string, IPoint[]>
  publishEdgeGeometry: (id: string, points: IPoint[]) => void
  removeEdgeGeometry: (id: string) => void
}

const samePoints = (a: IPoint[], b: IPoint[]): boolean =>
  a.length === b.length &&
  a.every((point, index) => point.x === b[index].x && point.y === b[index].y)

/**
 * Backstop for the synchronous convergence loop.
 *
 * Edges route around each other, so publishing one edge's route re-renders its
 * neighbours, which re-route and publish — and because the publish runs in a
 * LAYOUT effect (see `usePublishEdgeGeometry`), that whole cascade resolves before
 * the browser paints, so the user only ever sees the settled layout. It terminates
 * on its own: routing yields only to lower-id edges (a DAG, no cycles), so the
 * layout has a fixed point, and `samePoints` above stops an edge publishing once it
 * reaches it.
 *
 * This budget is the guard for the case that reasoning does not cover — a layout so
 * deep it would exceed React's own re-render-depth limit, or a genuine
 * non-convergence no one foresaw. Past it, further publishes this frame are dropped
 * and the layout settles over the next few frames instead of all at once: a graceful
 * fallback to the old behaviour, never a frozen tab. Reset each animation frame, so
 * it bounds work PER frame, not for the session. Sized well above what any settle of
 * a few thousand edges needs, so normal use never reaches it.
 */
const MAX_PUBLISHES_PER_FRAME = 8000
let frameBudget = MAX_PUBLISHES_PER_FRAME
let resetQueued = false
const withinFrameBudget = (): boolean => {
  // No animation frames (SSR, non-DOM tests) means no synchronous re-render loop to
  // bound — never cap there, or a long-lived process would eventually stop publishing.
  if (typeof requestAnimationFrame !== "function") return true
  if (!resetQueued) {
    resetQueued = true
    requestAnimationFrame(() => {
      frameBudget = MAX_PUBLISHES_PER_FRAME
      resetQueued = false
    })
  }
  if (frameBudget <= 0) return false
  frameBudget--
  return true
}

export const createEdgeGeometryStore = (): UseBoundStore<
  StoreApi<EdgeGeometryStore>
> =>
  create<EdgeGeometryStore>()(
    devtools(
      subscribeWithSelector((set, get) => ({
        geometryById: {},

        publishEdgeGeometry: (id, points) => {
          // Skip redundant writes so re-rendering an edge (e.g. because its
          // bridge changed — a render-only effect) never re-triggers the
          // consumers that depend on this map. This guard is what keeps the
          // publish→recompute→re-render cycle from looping.
          const previous = get().geometryById[id]
          if (previous && samePoints(previous, points)) return
          // A real change. Charge it against this frame's budget; if the frame has
          // spent it, defer rather than feed the synchronous re-render loop further.
          if (!withinFrameBudget()) return
          set(
            (state) => ({
              geometryById: { ...state.geometryById, [id]: points },
            }),
            undefined,
            "publishEdgeGeometry"
          )
        },

        removeEdgeGeometry: (id) => {
          set(
            (state) => {
              if (!(id in state.geometryById)) return state
              const next = { ...state.geometryById }
              delete next[id]
              return { geometryById: next }
            },
            undefined,
            "removeEdgeGeometry"
          )
        },
      })),
      { name: "EdgeGeometryStore" }
    )
  )
