import { create } from "zustand"
import type { UMLModel, UMLDiagramType } from "@tumaet/apollon"
import { v4 as uuidv4 } from "uuid"
import { persist, devtools } from "zustand/middleware"
import {
  PlaygroundDefaultModel,
  playgroundModelId,
} from "@/constants/playgroundDefaultDiagram"

const PERSISTENCE_STORE_VERSION = 3

type PersistentModelEntity = {
  id: string
  model: UMLModel
  lastModifiedAt: string
  createdAt: string
  favorite: boolean
}

type PersistenceModelStore = {
  models: Record<string, PersistentModelEntity>
  thumbnails: Record<string, string>
  thumbnailRevisions: Record<string, number>
  thumbnailLastModifiedAt: Record<string, string>
  currentModelId: string | null
  setCurrentModelId: (id: string | null) => void
  createModel: (model: UMLModel) => void
  createModelByTitleAndType: (title: string, type: UMLDiagramType) => string
  updateModel: (model: UMLModel) => void
  duplicateModel: (id: string) => string
  deleteModel: (id: string) => void
  toggleFavorite: (id: string) => void
  setThumbnail: (id: string, svgString: string, lastModifiedAt?: string) => void
  getThumbnail: (id: string) => string | null
}

type PersistedPersistenceModelStore = Pick<
  PersistenceModelStore,
  "models" | "currentModelId"
> &
  Partial<
    Pick<
      PersistenceModelStore,
      "thumbnails" | "thumbnailRevisions" | "thumbnailLastModifiedAt"
    >
  >

const populateNewModel = () => ({
  id: uuidv4(),
  type: "ClassDiagram" as UMLDiagramType,
  assessments: {},
  edges: [],
  nodes: [],
  title: "",
  version: "4.0.0" as const,
})

const normalizePersistedModels = (
  models: PersistedPersistenceModelStore["models"] | undefined
): Record<string, PersistentModelEntity> => {
  if (!models) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(models).map(([id, entity]) => [
      id,
      {
        ...entity,
        favorite: Boolean(entity.favorite),
        // Backfill for existing diagrams that predate createdAt tracking.
        // lastModifiedAt is the best available approximation.
        createdAt:
          (entity as Partial<PersistentModelEntity>).createdAt ??
          entity.lastModifiedAt,
      },
    ])
  )
}

export const usePersistenceModelStore = create<PersistenceModelStore>()(
  devtools(
    persist(
      (set, get) => ({
        models: {
          [playgroundModelId]: {
            id: playgroundModelId,
            model: PlaygroundDefaultModel,
            lastModifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            favorite: false,
          },
        },
        thumbnails: {},
        thumbnailRevisions: {},
        thumbnailLastModifiedAt: {},
        currentModelId: null,

        setCurrentModelId: (id) =>
          set({ currentModelId: id }, false, "setCurrentModelId"),

        createModelByTitleAndType: (title, type) => {
          const now = new Date().toISOString()
          const model: UMLModel = {
            ...populateNewModel(),
            title,
            type,
          }

          const persistentEntity: PersistentModelEntity = {
            id: model.id,
            model,
            lastModifiedAt: now,
            createdAt: now,
            favorite: false,
          }

          set(
            (state) => ({
              models: { ...state.models, [model.id]: persistentEntity },
              currentModelId: model.id,
            }),
            false,
            "createModel"
          )

          return model.id
        },

        createModel: (model) => {
          const now = new Date().toISOString()
          const persistentEntity: PersistentModelEntity = {
            id: model.id,
            model,
            lastModifiedAt: now,
            createdAt: now,
            favorite: false,
          }

          set(
            (state) => ({
              models: { ...state.models, [model.id]: persistentEntity },
              currentModelId: model.id,
            }),
            false,
            "createModel"
          )
        },

        updateModel: (model) => {
          const lastModifiedAt = new Date().toISOString()

          set(
            (state) => {
              return {
                models: {
                  ...state.models,
                  [model.id]: {
                    id: model.id,
                    model,
                    lastModifiedAt,
                    createdAt:
                      state.models[model.id]?.createdAt ?? lastModifiedAt,
                    favorite: state.models[model.id]?.favorite ?? false,
                  },
                },
              }
            },
            false,
            "updateModel"
          )
        },

        duplicateModel: (id) => {
          const sourceEntity = get().models[id]

          if (!sourceEntity) {
            return ""
          }

          const sourceModel = sourceEntity.model
          const clonedModel: UMLModel =
            typeof structuredClone === "function"
              ? structuredClone(sourceModel)
              : JSON.parse(JSON.stringify(sourceModel))

          const existingTitles = new Set(
            Object.values(get().models).map((entity) => entity.model.title)
          )
          const sourceTitle = sourceModel.title
          const defaultCopyTitle = `${sourceTitle} (Copy)`
          let copyTitle = defaultCopyTitle
          let counter = 2

          while (existingTitles.has(copyTitle)) {
            copyTitle = `${sourceTitle} (Copy ${counter})`
            counter += 1
          }

          const duplicatedId = uuidv4()
          const duplicatedModel: UMLModel = {
            ...clonedModel,
            id: duplicatedId,
            title: copyTitle,
          }
          const lastModifiedAt = new Date().toISOString()

          set(
            (state) => ({
              models: {
                ...state.models,
                [duplicatedId]: {
                  id: duplicatedId,
                  model: duplicatedModel,
                  lastModifiedAt,
                  createdAt: lastModifiedAt,
                  favorite: sourceEntity.favorite,
                },
              },
              thumbnails: state.thumbnails[id]
                ? { ...state.thumbnails, [duplicatedId]: state.thumbnails[id] }
                : state.thumbnails,
              thumbnailRevisions: state.thumbnailRevisions[id]
                ? {
                    ...state.thumbnailRevisions,
                    [duplicatedId]: state.thumbnailRevisions[id],
                  }
                : state.thumbnailRevisions,
              thumbnailLastModifiedAt: state.thumbnailLastModifiedAt[id]
                ? {
                    ...state.thumbnailLastModifiedAt,
                    [duplicatedId]: state.thumbnailLastModifiedAt[id],
                  }
                : state.thumbnailLastModifiedAt,
            }),
            false,
            "duplicateModel"
          )

          return duplicatedId
        },

        deleteModel: (id) => {
          set(
            (state) => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { [id]: _, ...rest } = state.models
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { [id]: __, ...thumbnailRest } = state.thumbnails
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { [id]: ___, ...revisionRest } = state.thumbnailRevisions
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { [id]: ____, ...thumbnailLastModifiedAtRest } =
                state.thumbnailLastModifiedAt
              return {
                models: rest,
                thumbnails: thumbnailRest,
                thumbnailRevisions: revisionRest,
                thumbnailLastModifiedAt: thumbnailLastModifiedAtRest,
              }
            },
            false,
            "deleteModel"
          )
        },

        toggleFavorite: (id) => {
          set(
            (state) => {
              const targetModel = state.models[id]
              if (!targetModel) {
                return state
              }

              return {
                models: {
                  ...state.models,
                  [id]: {
                    ...targetModel,
                    favorite: !targetModel.favorite,
                  },
                },
              }
            },
            false,
            "toggleFavorite"
          )
        },

        setThumbnail: (id, svgString, lastModifiedAt) =>
          set(
            (state) => ({
              thumbnails: {
                ...state.thumbnails,
                [id]: svgString,
              },
              thumbnailRevisions: {
                ...state.thumbnailRevisions,
                [id]: (state.thumbnailRevisions[id] ?? 0) + 1,
              },
              thumbnailLastModifiedAt: {
                ...state.thumbnailLastModifiedAt,
                [id]:
                  lastModifiedAt ??
                  state.models[id]?.lastModifiedAt ??
                  new Date().toISOString(),
              },
            }),
            false,
            "setThumbnail"
          ),

        getThumbnail: (id) => get().thumbnails[id] ?? null,
      }),
      {
        name: "persistenceModelStore",
        version: PERSISTENCE_STORE_VERSION,
        partialize: (state) => ({
          models: state.models,
          currentModelId: state.currentModelId,
        }),
        migrate: (persistedState) => {
          const state = persistedState as PersistedPersistenceModelStore
          return {
            ...state,
            models: normalizePersistedModels(state.models),
            thumbnails: {},
            thumbnailRevisions: {},
            thumbnailLastModifiedAt: {},
          }
        },
      }
    ),
    {
      name: "Standalone persistenceModelStore DevTools",
    }
  )
)
