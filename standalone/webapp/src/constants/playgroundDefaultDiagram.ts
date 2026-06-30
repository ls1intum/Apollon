import { UMLDiagramType, UMLModel } from "@tumaet/apollon"

export const playgroundModelId = "playgroundModelId"

export const PlaygroundDefaultModel: UMLModel = {
  version: "4.0.0",
  id: playgroundModelId,
  type: UMLDiagramType.ClassDiagram,
  assessments: {},
  edges: [],
  nodes: [],
  title: "Class Diagram",
}
