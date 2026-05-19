import { ApollonEditor } from "@tumaet/apollon"
import { createContext } from "react"

export type ApollonEditorContextType = {
  editor?: ApollonEditor
  setEditor: (editor: ApollonEditor) => void
}

export const ApollonEditorContext =
  createContext<ApollonEditorContextType | null>(null)

export const {
  Consumer: ApollonEditorConsumer,
  Provider: ApollonEditorProvider,
} = ApollonEditorContext
