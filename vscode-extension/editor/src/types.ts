import { ApollonMode, UMLDiagramType, UMLModel } from "@tumaet/apollon/react"
import { uuid } from "./utils/uuid"

export type Diagram = {
  id: string
  title: string
  model?: UMLModel
  lastUpdate: string
  versions?: Diagram[]
  description?: string
  token?: string
}

export const defaultDiagram: Diagram = {
  id: uuid(),
  title: "UMLClassDiagram",
  model: undefined,
  lastUpdate: new Date().toISOString(),
}

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
