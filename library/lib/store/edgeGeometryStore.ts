import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import { IPoint } from "@/edges/Connection"

/**
 * Runtime-only registry of each edge's ACTUAL rendered polyline (jump-free),
 * keyed by edge id. Populated in one write per solve by the central edge
 * solver (see EdgeGeometrySolver / computeAllEdgeGeometry). Consumers read it
 * to place things relative to where edges actually are: line jumps center their
 * bridge on the crossing the user sees, labels dodge neighbouring edges, and the
 * reconnect preview routes around the settled routes.
 *
 * Not persisted (Yjs never sees it) — it is ephemeral view geometry, exactly
 * the kind of "computed segments" the model deliberately does not store.
 */
export type EdgeGeometryStore = {
  geometryById: Record<string, IPoint[]>
  /**
   * Replace the WHOLE map in one write — the central edge solver's single-pass
   * output. Reuses each edge's previous `IPoint[]` reference when its content is
   * unchanged, so a selector reading one edge's route (with content equality)
   * only re-renders the edges the solve actually moved, and edges absent from
   * the new map (deleted) are pruned.
   */
  setAllGeometry: (routeById: Record<string, IPoint[]>) => void
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

        setAllGeometry: (routeById) => {
          const previous = get().geometryById
          const prevIds = Object.keys(previous)
          const nextIds = Object.keys(routeById)
          let changed = prevIds.length !== nextIds.length
          const next: Record<string, IPoint[]> = {}
          for (const id of nextIds) {
            const prior = previous[id]
            if (prior && samePoints(prior, routeById[id])) {
              next[id] = prior // reuse reference so unchanged edges don't re-render
            } else {
              next[id] = routeById[id]
              changed = true
            }
          }
          if (!changed) return
          set({ geometryById: next }, undefined, "setAllGeometry")
        },
      })),
      { name: "EdgeGeometryStore" }
    )
  )
