import { ApollonMode, UMLDiagramType } from "@tumaet/apollon/react"

export type EditorOptions = {
  type: UMLDiagramType
  mode?: ApollonMode
  readonly?: boolean
  enablePopups?: boolean
}

export const defaultEditorOptions: EditorOptions = {
  type: UMLDiagramType.ClassDiagram,
  mode: ApollonMode.Modelling,
  readonly: false,
  enablePopups: true,
}
