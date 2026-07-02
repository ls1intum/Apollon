import { create } from "zustand"
import type { UMLModel } from "@tumaet/apollon"
import { defaultEditorOptions, type EditorOptions } from "./types"

interface Store {
  model?: UMLModel
  loadVersion: number
  options: EditorOptions
}

const useStore = create<Store>(() => ({
  model: undefined,
  loadVersion: 0,
  options: defaultEditorOptions,
}))

export default useStore
