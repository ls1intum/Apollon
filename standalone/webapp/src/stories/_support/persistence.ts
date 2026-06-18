/* Shared fixtures + builders for the home dashboard stories.
 *
 * The home stories (DiagramCard / DiagramGallery) re-declared the same
 * `makeModel` body factory, the same `RecentDiagram` sample tiles, and the same
 * `usePersistenceModelStore.setState` seeding boilerplate. This module is the
 * single source of those shapes:
 *
 *  - `makeModel` builds a minimal `UMLModel` (optionally with one node so the
 *    "empty diagram" vs "has content" distinction is reachable).
 *  - `makePersistentEntity` wraps a model in the store's `PersistentModelEntity`
 *    envelope (id / model / lastModifiedAt / createdAt / favorite).
 *  - `makeRecentDiagram` builds the `RecentDiagram` tile shape `DiagramCard` takes.
 *  - `SAMPLE_RECENT` / `SAMPLE_GALLERY` are ready-made spreads of types/dates.
 *  - `seedModels` / `resetPersistenceStore` wrap the store mutations the
 *    container stories use in `beforeEach`.
 *
 * View stories drive everything via `args`; the store helpers exist only for the
 * thin-container integration stories that still read `usePersistenceModelStore`.
 */
import type { UMLDiagramType, UMLModel } from "@tumaet/apollon"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { playgroundModelId } from "@/constants/playgroundDefaultDiagram"
import { DiagramView } from "@/types"
import type {
  DiagramSource,
  RecentDiagram,
} from "@/components/home/DiagramCard"

export type { RecentDiagram, DiagramSource }

/** The store's per-diagram envelope (mirrors `PersistentModelEntity`). */
export type PersistentModelEntity = {
  id: string
  model: UMLModel
  lastModifiedAt: string
  createdAt: string
  favorite: boolean
}

/**
 * Build a minimal `UMLModel`. With `withContent` it carries one node, so the
 * gallery's "empty diagram" badge / preview path is reachable.
 */
export function makeModel({
  id,
  title,
  type = "ClassDiagram",
  withContent = true,
}: {
  id: string
  title: string
  type?: UMLDiagramType
  withContent?: boolean
}): UMLModel {
  return {
    version: "4.0.0",
    id,
    title,
    type,
    nodes: withContent
      ? [
          {
            id: `${id}-node`,
            type,
            position: { x: 0, y: 0 },
            width: 200,
            height: 110,
            data: {},
          },
        ]
      : [],
    edges: [],
    assessments: {},
  } as unknown as UMLModel
}

/** Wrap a `UMLModel` in the persistence store's `PersistentModelEntity`. */
export function makePersistentEntity({
  model,
  lastModifiedAt = "2026-06-15T10:00:00.000Z",
  createdAt,
  favorite = false,
}: {
  model: UMLModel
  lastModifiedAt?: string
  createdAt?: string
  favorite?: boolean
}): PersistentModelEntity {
  return {
    id: model.id,
    model,
    lastModifiedAt,
    createdAt: createdAt ?? lastModifiedAt,
    favorite,
  }
}

/** Build a `RecentDiagram` tile (the shape `DiagramCard` takes as a prop). */
export function makeRecentDiagram(
  overrides: Partial<RecentDiagram> & Pick<RecentDiagram, "id" | "title"> = {
    id: "local-demo-1",
    title: "Order Processing",
  }
): RecentDiagram {
  return {
    type: "ClassDiagram",
    lastModifiedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    favorite: false,
    source: "local",
    ...overrides,
  }
}

/** A representative local diagram tile. */
export const SAMPLE_LOCAL_DIAGRAM: RecentDiagram = makeRecentDiagram({
  id: "local-demo-1",
  title: "Order Processing",
  type: "ClassDiagram",
  source: "local",
})

/** A favorited shared diagram tile, with a last-used sharing mode. */
export const SAMPLE_SHARED_DIAGRAM: RecentDiagram = makeRecentDiagram({
  id: "shared-demo-1",
  title: "Team Architecture",
  type: "ComponentDiagram",
  lastModifiedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  favorite: true,
  source: "shared",
  lastSharedView: DiagramView.EDIT,
})

/**
 * A spread of types, titles, and timestamps so the gallery's type/sort filters
 * and the search box all have something meaningful to act on.
 */
export const SAMPLE_GALLERY: {
  id: string
  title: string
  type: UMLDiagramType
  lastModifiedAt: string
  favorite?: boolean
  empty?: boolean
}[] = [
  {
    id: "diagram-bank",
    title: "Banking Domain Model",
    type: "ClassDiagram",
    lastModifiedAt: "2026-06-15T10:00:00.000Z",
    favorite: true,
  },
  {
    id: "diagram-checkout",
    title: "Checkout Activity",
    type: "ActivityDiagram",
    lastModifiedAt: "2026-06-12T09:30:00.000Z",
  },
  {
    id: "diagram-auth",
    title: "Authentication Use Cases",
    type: "UseCaseDiagram",
    lastModifiedAt: "2026-06-10T14:15:00.000Z",
  },
  {
    id: "diagram-deploy",
    title: "Deployment Topology",
    type: "DeploymentDiagram",
    lastModifiedAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "diagram-empty",
    title: "Empty Sketch",
    type: "ClassDiagram",
    lastModifiedAt: "2026-05-20T16:45:00.000Z",
    empty: true,
  },
]

/** Build the playground entry the gallery filters out (mirrors store shape). */
function playgroundEntry(): PersistentModelEntity {
  const existing = usePersistenceModelStore.getState().models[playgroundModelId]
  if (existing) return existing
  const now = new Date().toISOString()
  return makePersistentEntity({
    model: makeModel({ id: playgroundModelId, title: "Playground" }),
    lastModifiedAt: now,
  })
}

/** Reset the persistence store to an empty set of models. */
export function resetPersistenceStore(): void {
  usePersistenceModelStore.setState({
    models: {},
    currentModelId: null,
    thumbnails: {},
    thumbnailRevisions: {},
    thumbnailLastModifiedAt: {},
  })
}

/**
 * Seed the store from `RecentDiagram` tiles (used by DiagramCard stories) — each
 * tile becomes a `PersistentModelEntity` keyed by its id.
 */
export function seedModels(diagrams: RecentDiagram[]): void {
  const now = new Date().toISOString()
  usePersistenceModelStore.setState({
    models: Object.fromEntries(
      diagrams.map((diagram) => [
        diagram.id,
        makePersistentEntity({
          model: makeModel({
            id: diagram.id,
            title: diagram.title,
            type: diagram.type,
          }),
          lastModifiedAt: diagram.lastModifiedAt,
          createdAt: now,
          favorite: diagram.favorite,
        }),
      ])
    ),
    currentModelId: null,
    thumbnails: {},
    thumbnailRevisions: {},
    thumbnailLastModifiedAt: {},
  })
}

/**
 * Seed the gallery store from `SAMPLE_GALLERY`-shaped rows, keeping the
 * playground entry (the gallery filters it out by id) so the store mirrors real
 * shape without polluting the grid.
 */
export function seedGallery(rows = SAMPLE_GALLERY): void {
  usePersistenceModelStore.setState({
    models: {
      [playgroundModelId]: playgroundEntry(),
      ...Object.fromEntries(
        rows.map((row) => [
          row.id,
          makePersistentEntity({
            model: makeModel({
              id: row.id,
              title: row.title,
              type: row.type,
              withContent: !row.empty,
            }),
            lastModifiedAt: row.lastModifiedAt,
            favorite: Boolean(row.favorite),
          }),
        ])
      ),
    },
    currentModelId: null,
  })
}
