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

/**
 * What the empty-file picker may offer, keyed by the id the host sends back in a `create`
 * message. A superset of DIAGRAM_TYPES, because two of the things a `.puml` can be started as are
 * ways of *using* a notation rather than notations of their own, so they have no Apollon diagram
 * type to key off: a C4 model is drawn out of deployment elements, and a sequence diagram opens on
 * the canvas as a communication diagram. Mirrors `de.tum.cit.aet.apollon.puml.C4_STARTER_ID` /
 * `SEQUENCE_STARTER_ID` and `PumlScaffold.STARTERS`.
 */
export const STARTER_LABELS: Record<string, string> = {
  ...DIAGRAM_TYPES,
  C4: "C4 model",
  Sequence: "Sequence diagram",
}

/** [id, label] for the ids the host offered, in the host's order, skipping any this build has no
 *  label for (an older webview against a newer host). */
export const starterEntries = (ids: string[]): [string, string][] =>
  ids
    .filter((id) => id in STARTER_LABELS)
    .map((id) => [id, STARTER_LABELS[id]] as [string, string])
