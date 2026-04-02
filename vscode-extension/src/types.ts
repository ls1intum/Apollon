import { uuid } from "./util"

// Type definitions compatible with @tumaet/apollon
export type UMLDiagramType =
  | "ClassDiagram"
  | "ObjectDiagram"
  | "ActivityDiagram"
  | "UseCaseDiagram"
  | "CommunicationDiagram"
  | "ComponentDiagram"
  | "DeploymentDiagram"
  | "PetriNet"
  | "ReachabilityGraph"
  | "SyntaxTree"
  | "Flowchart"
  | "BPMN"
  | "Sfc"

export type UMLModel = {
  version: `4.${number}.${number}`
  id: string
  title: string
  type: UMLDiagramType
  nodes: unknown[]
  edges: unknown[]
  assessments: { [id: string]: unknown }
}

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

export const defaultDiagram: Diagram = createDefaultDiagram()
