import type { UMLDiagramType, UMLModel } from "@tumaet/apollon"
import { uuid } from "./util"

export type { UMLDiagramType, UMLModel }

export type Diagram = {
  id: string
  title: string
  model?: UMLModel
  lastUpdate: string
  versions?: Diagram[]
  description?: string
  token?: string
}

export const createDefaultDiagram = (
  diagramType: UMLDiagramType = "ClassDiagram"
): Diagram => {
  const id = uuid()
  return {
    id,
    title: "UMLClassDiagram",
    model: {
      version: "4.0.0",
      id,
      title: "New Diagram",
      type: diagramType,
      nodes: [],
      edges: [],
      assessments: {},
    },
    lastUpdate: new Date().toISOString(),
  }
}
