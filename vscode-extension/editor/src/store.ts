import { create } from "zustand"
import { ApollonOptions, UMLModel } from "@tumaet/apollon"
import { defaultEditorOptions } from "./types"

interface Store {
  model?: UMLModel
  createNewEditor: boolean
  options: ApollonOptions
}

export const useStore = create<Store>(() => ({
  model: undefined,
  createNewEditor: false,
  options: defaultEditorOptions,
}))

export default useStore
