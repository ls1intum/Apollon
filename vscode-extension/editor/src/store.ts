import { create } from "zustand"
import { UMLModel } from "@tumaet/apollon/react"
import { defaultEditorOptions, EditorOptions } from "./types"

interface Store {
  model?: UMLModel
  // Bumped on every loadDiagram message; used as <Apollon key=...> to force a remount.
  loadVersion: number
  options: EditorOptions
}

export const useStore = create<Store>(() => ({
  model: undefined,
  loadVersion: 0,
  options: defaultEditorOptions,
}))

export default useStore
