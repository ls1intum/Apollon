import type { UMLDiagramType } from "@tumaet/apollon"

/**
 * Display names for every diagram type, shared by the command palette and the
 * empty-file picker. `satisfies` keeps it exhaustive. Declared rather than
 * imported from the library's runtime `UMLDiagramType`, which would pull the
 * browser editor into the Node host bundle.
 */
export const DIAGRAM_TYPES = {
  ClassDiagram: "Class diagram",
  ObjectDiagram: "Object diagram",
  ActivityDiagram: "Activity diagram",
  UseCaseDiagram: "Use case diagram",
  CommunicationDiagram: "Communication diagram",
  ComponentDiagram: "Component diagram",
  DeploymentDiagram: "Deployment diagram",
  PetriNet: "Petri net",
  ReachabilityGraph: "Reachability graph",
  SyntaxTree: "Syntax tree",
  Flowchart: "Flowchart",
  BPMN: "BPMN",
  Sfc: "Sequential function chart",
} satisfies Record<UMLDiagramType, string>

export const diagramTypeEntries = (): [UMLDiagramType, string][] =>
  Object.entries(DIAGRAM_TYPES) as [UMLDiagramType, string][]
