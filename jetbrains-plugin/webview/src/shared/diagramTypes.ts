import type { UMLDiagramType } from "@tumaet/apollon"

/**
 * Display names for every diagram type, for the empty-file picker.
 * `satisfies` keeps it exhaustive. Declared rather than imported from the
 * library's runtime `UMLDiagramType` (which would still be fine to import
 * here, unlike the VS Code extension's Node host — but kept as a literal
 * to stay a hand-kept mirror of `de.tum.cit.aet.apollon.protocol.DIAGRAM_TYPES`
 * on the Kotlin side, which cannot import it at all).
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
