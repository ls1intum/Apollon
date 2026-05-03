import { create } from "zustand"
import type { UMLModel, UMLDiagramType } from "@tumaet/apollon"
import { v4 as uuidv4 } from "uuid"
import { persist, devtools } from "zustand/middleware"
import {
  PlaygroundDefaultModel,
  playgroundModelId,
} from "@/constants/playgroundDefaultDiagram"

const PERSISTENCE_STORE_VERSION = 1

type PersistentModelEntity = {
  id: string
  model: UMLModel
  lastModifiedAt: string
}

type PersistenceModelStore = {
  models: Record<string, PersistentModelEntity>
  thumbnails: Record<string, string>
  thumbnailRevisions: Record<string, number>
  currentModelId: string | null
  setCurrentModelId: (id: string) => void
  createModel: (model: UMLModel) => void
  createModelByTitleAndType: (title: string, type: UMLDiagramType) => string
  updateModel: (model: UMLModel) => void
  duplicateModel: (id: string) => string
  deleteModel: (id: string) => void
  setThumbnail: (id: string, svgString: string) => void
  getThumbnail: (id: string) => string | null
  getCurrentModel: () => PersistentModelEntity | null
}

type PersistedPersistenceModelStore = Pick<
  PersistenceModelStore,
  "models" | "currentModelId"
> &
  Partial<Pick<PersistenceModelStore, "thumbnails" | "thumbnailRevisions">>

const populateNewModel = () => ({
  id: uuidv4(),
  type: "ClassDiagram" as UMLDiagramType,
  assessments: {},
  edges: [],
  nodes: [],
  title: "",
  version: "4.0.0" as const,
})

export const usePersistenceModelStore = create<PersistenceModelStore>()(
  devtools(
    persist(
      (set, get) => ({
        models: {
          [playgroundModelId]: {
            id: playgroundModelId,
            model: PlaygroundDefaultModel,
            lastModifiedAt: new Date().toISOString(),
          },
        },
        thumbnails: {},
        thumbnailRevisions: {},
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
              return {
                models: rest,
                thumbnails: thumbnailRest,
                thumbnailRevisions: revisionRest,
              }
            },
            false,
            "deleteModel"
          )
        },

        setThumbnail: (id, svgString) =>
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
            }),
            false,
            "setThumbnail"
          ),

        getThumbnail: (id) => get().thumbnails[id] ?? null,

        getCurrentModel: () => {
          const currentModelId = get().currentModelId
          if (!currentModelId) return null
          return get().models[currentModelId]
        },
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
            thumbnails: {},
            thumbnailRevisions: {},
          }
        },
      }
    ),
    {
      name: "Standalone persistenceModelStore DevTools",
    }
  )
)
