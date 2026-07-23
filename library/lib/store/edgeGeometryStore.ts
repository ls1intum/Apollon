import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import { IPoint } from "@/edges/Connection"
import type { EdgeGeometryNodeSnapshot } from "@/utils/geometry/edgeGeometryPreview"

/**
 * Runtime-only registry of jump-free edge polylines, keyed by edge id.
 * `geometryById` is the last accepted holistic solve; `previewById` is the
 * transient display projection while a newer generation is in flight. Spatial
 * consumers use the settled map for stable line jumps, label avoidance, and
 * reconnect routing; an edge renderer may prefer its own preview entry.
 *
 * Not persisted (Yjs never sees it) — it is ephemeral view geometry, exactly
 * the kind of "computed segments" the model deliberately does not store.
 */
export type EdgeGeometryStore = {
  /** Last accepted holistic solve. Spatial consumers deliberately read only
   * this map so transient pointer projections do not invalidate every edge. */
  geometryById: Record<string, IPoint[]>
  /** Display-only routes while a newer exact generation is in flight. Entries
   * may reuse `geometryById` arrays for edges whose endpoints did not move. */
  previewById: Record<string, IPoint[]>
  /** Node geometry belonging to the same accepted generation as
   * `geometryById`. Label avoidance reads this stable snapshot instead of every
   * transient React Flow drag frame. */
  settledNodeGeometry: EdgeGeometryNodeSnapshot
  /** True while a versioned background solve owns a newer geometry snapshot.
   * Exact consumers can await the accepted generation instead of relying on an
   * arbitrary animation delay. */
  isSolving: boolean
  /**
   * Replace the WHOLE map in one write — the central edge solver's single-pass
   * output. Reuses each edge's previous `IPoint[]` reference when its content is
   * unchanged, so a selector reading one edge's route (with content equality)
   * only re-renders the edges the solve actually moved, and edges absent from
   * the new map (deleted) are pruned. An optional display-only settlement
   * preview lets the renderer converge onto the already-authoritative exact map
   * without exposing a mixed generation to spatial consumers.
   */
  setAllGeometry: (
    routeById: Record<string, IPoint[]>,
    nodeGeometry?: EdgeGeometryNodeSnapshot,
    settlementPreview?: Record<string, IPoint[]>
  ) => void
  setPreviewGeometry: (routeById: Record<string, IPoint[]>) => void
  clearPreviewGeometry: () => void
  setSolving: (solving: boolean) => void
  waitForSettled: () => Promise<void>
}

const samePoints = (a: IPoint[], b: IPoint[]): boolean =>
  a === b ||
  (a.length === b.length &&
    a.every((point, index) => point.x === b[index].x && point.y === b[index].y))

const sameNodeGeometry = (
  a: EdgeGeometryNodeSnapshot,
  b: EdgeGeometryNodeSnapshot
): boolean => {
  if (a === b) return true
  if (a.size !== b.size) return false
  for (const [id, rect] of a) {
    const other = b.get(id)
    if (
      !other ||
      rect.x !== other.x ||
      rect.y !== other.y ||
      rect.width !== other.width ||
      rect.height !== other.height ||
      rect.type !== other.type ||
      rect.parentId !== other.parentId
    )
      return false
  }
  return true
}

export const createEdgeGeometryStore = (): UseBoundStore<
  StoreApi<EdgeGeometryStore>
> => {
  const settledWaiters = new Set<() => void>()
  return create<EdgeGeometryStore>()(
    devtools(
      subscribeWithSelector((set, get) => ({
        geometryById: {},
        previewById: {},
        settledNodeGeometry: new Map(),
        isSolving: false,

        setAllGeometry: (routeById, nodeGeometry, settlementPreview) => {
          const state = get()
          const previous = state.geometryById
          const prevIds = Object.keys(previous)
          const nextIds = Object.keys(routeById)
          let geometryChanged = prevIds.length !== nextIds.length
          const next: Record<string, IPoint[]> = {}
          for (const id of nextIds) {
            const prior = previous[id]
            const preview = state.previewById[id]
            if (prior && samePoints(prior, routeById[id])) {
              next[id] = prior // reuse reference so unchanged edges don't re-render
            } else if (preview && samePoints(preview, routeById[id])) {
              // If the exact solve proves the display projection was already
              // right, promote that array while atomically clearing preview so
              // the rendered selector remains reference-equal.
              next[id] = preview
              geometryChanged = true
            } else {
              next[id] = routeById[id]
              geometryChanged = true
            }
          }
          const nextPreview: Record<string, IPoint[]> = {}
          for (const [id, candidate] of Object.entries(
            settlementPreview ?? {}
          )) {
            if (!routeById[id]) continue
            const prior = state.previewById[id]
            nextPreview[id] =
              prior && samePoints(prior, candidate) ? prior : candidate
          }
          const previousPreviewIds = Object.keys(state.previewById)
          const nextPreviewIds = Object.keys(nextPreview)
          const previewChanged =
            previousPreviewIds.length !== nextPreviewIds.length ||
            nextPreviewIds.some(
              (id) => state.previewById[id] !== nextPreview[id]
            )
          const nodeGeometryChanged =
            nodeGeometry !== undefined &&
            !sameNodeGeometry(state.settledNodeGeometry, nodeGeometry)
          if (!geometryChanged && !previewChanged && !nodeGeometryChanged)
            return
          // Replace the display projection in the same write so no render can
          // observe an old preview under a newly accepted exact generation.
          set(
            {
              geometryById: geometryChanged ? next : previous,
              previewById: previewChanged ? nextPreview : state.previewById,
              settledNodeGeometry: nodeGeometryChanged
                ? nodeGeometry
                : state.settledNodeGeometry,
            },
            undefined,
            "setAllGeometry"
          )
        },

        setPreviewGeometry: (routeById) => {
          const state = get()
          const previous = state.previewById
          const nextIds = Object.keys(routeById)
          const previousIds = Object.keys(previous)
          let changed = nextIds.length !== previousIds.length
          const next: Record<string, IPoint[]> = {}
          for (const id of nextIds) {
            const candidate = routeById[id]
            const exact = state.geometryById[id]
            const prior = previous[id]
            if (exact && samePoints(exact, candidate)) {
              next[id] = exact
            } else if (prior && samePoints(prior, candidate)) {
              next[id] = prior
            } else {
              next[id] = candidate
            }
            if (next[id] !== prior) changed = true
          }
          if (!changed) return
          set({ previewById: next }, undefined, "setPreviewGeometry")
        },

        clearPreviewGeometry: () => {
          if (Object.keys(get().previewById).length === 0) return
          set({ previewById: {} }, undefined, "clearPreviewGeometry")
        },

        setSolving: (solving) => {
          if (get().isSolving === solving) return
          set({ isSolving: solving }, undefined, "setSolving")
          if (!solving) {
            for (const resolve of settledWaiters) resolve()
            settledWaiters.clear()
          }
        },

        waitForSettled: () =>
          get().isSolving
            ? new Promise<void>((resolve) => settledWaiters.add(resolve))
            : Promise.resolve(),
      })),
      { name: "EdgeGeometryStore" }
    )
  )
}
