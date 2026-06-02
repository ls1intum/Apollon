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
