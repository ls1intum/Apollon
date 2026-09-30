package de.tum.cit.aet.apollon.protocol

/**
 * Display names for every diagram type, mirrored from the webview's
 * `shared/diagramTypes.ts` (which is itself a hand-kept mirror of the
 * library's `UMLDiagramType` — see that file for why it isn't imported at
 * runtime). Used for the New Diagram action's type picker.
 */
val DIAGRAM_TYPES: Map<String, String> =
    linkedMapOf(
        "ClassDiagram" to "Class diagram",
        "ObjectDiagram" to "Object diagram",
        "ActivityDiagram" to "Activity diagram",
        "UseCaseDiagram" to "Use case diagram",
        "CommunicationDiagram" to "Communication diagram",
        "ComponentDiagram" to "Component diagram",
        "DeploymentDiagram" to "Deployment diagram",
        "PetriNet" to "Petri net",
        "ReachabilityGraph" to "Reachability graph",
        "SyntaxTree" to "Syntax tree",
        "Flowchart" to "Flowchart",
        "BPMN" to "BPMN",
        "Sfc" to "Sequential function chart",
    )
