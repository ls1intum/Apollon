import { create } from "zustand"
import { UMLModel, UMLDiagramType } from "@tumaet/apollon/react"
import { v4 as uuidv4 } from "uuid"
import { persist, devtools } from "zustand/middleware"
import {
  PlaygroundDefaultModel,
  playgroundModelId,
} from "@/constants/playgroundDefaultDiagram"

type PersistentModelEntity = {
  id: string
  model: UMLModel
  lastModifiedAt: string
}

type PersistenceModelStore = {
  models: Record<string, PersistentModelEntity>
  currentModelId: string | null
  setCurrentModelId: (id: string) => void
  createModel: (model: UMLModel) => void
  createModelByTitleAndType: (title: string, type: UMLDiagramType) => string
  updateModel: (model: UMLModel) => void
  deleteModel: (id: string) => void
  getCurrentModel: () => PersistentModelEntity | null
  /**
   * Bulk-insert models (used by the one-time legacy iOS migration). Keyed by
   * model id, so re-running is idempotent — it overwrites rather than
   * duplicating. Preserves each diagram's original last-modified timestamp and,
   * when no diagram is currently open, selects the most recently modified
   * imported diagram so migrated work is immediately visible.
   */
  importModels: (
    entries: { model: UMLModel; lastModifiedAt?: string }[]
  ) => void
}
const populateNewModel = () => ({
  id: uuidv4(),
  type: UMLDiagramType.ClassDiagram,
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
          playgroundModelId: {
            id: playgroundModelId,
            model: PlaygroundDefaultModel,
            lastModifiedAt: new Date().toISOString(),
          },
        },
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

        deleteModel: (id) => {
          set(
            (state) => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { [id]: _, ...rest } = state.models
              return { models: rest }
            },
            false,
            "deleteModel"
          )
        },

        getCurrentModel: () => {
          const currentModelId = get().currentModelId
          if (!currentModelId) return null
          return get().models[currentModelId]
        },

        importModels: (entries) => {
          if (entries.length === 0) return

          set(
            (state) => {
              const models = { ...state.models }
              let latestId: string | null = null
              let latestTime = ""

              for (const { model, lastModifiedAt } of entries) {
                models[model.id] = {
                  id: model.id,
                  model,
                  lastModifiedAt: lastModifiedAt ?? new Date().toISOString(),
                }
                // Default to the first imported diagram, then prefer the newest
                // by real ISO timestamp — so a missing timestamp never wins, but
                // something is always selectable.
                latestId ??= model.id
                if (lastModifiedAt && lastModifiedAt > latestTime) {
                  latestTime = lastModifiedAt
                  latestId = model.id
                }
              }

              return {
                models,
                // Only adopt a migrated diagram as current if the user has none
                // open yet — never steal focus from an in-progress diagram.
                currentModelId: state.currentModelId ?? latestId,
              }
            },
            false,
            "importModels"
          )
        },
      }),
      {
        name: "persistenceModelStore",
      }
    ),
    {
      name: "Standalone persistenceModelStore DevTools",
    }
  )
)
