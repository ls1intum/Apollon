package de.tum.cit.aet.apollon.puml

/**
 * Every PlantUML diagram family Architect Studio can recognize by grammar (plan §10), independent of
 * whether it can *edit* one — see [hasImporter]. [apollonType] is the matching `UMLDiagramType` value
 * (`library/lib/types/DiagramType.ts`) for families Apollon's canvas models at all; `null` for
 * families with no Apollon model (Sequence/State/C4/...) or no importer.
 */
enum class DiagramFamily(val apollonType: String?) {
    CLASS("ClassDiagram"),
    OBJECT("ObjectDiagram"),
    USE_CASE("UseCaseDiagram"),
    COMPONENT("ComponentDiagram"),
    DEPLOYMENT("DeploymentDiagram"),
    ACTIVITY("ActivityDiagram"),

    /** UML calls a sequence diagram and a communication diagram two views of the same interaction,
     *  and the communication one is the view Apollon can draw. See [SequenceModelMapper]. */
    SEQUENCE("CommunicationDiagram"),
    STATE(null),

    /** Apollon models `CommunicationDiagram`, but PlantUML has no native grammar for it (plan §5) —
     *  the detector never returns this; it exists so rejection messages can name the concept. */
    COMMUNICATION("CommunicationDiagram"),

    /** C4 has no Apollon diagram type of its own — it is a way of using boxes and arrows, not a
     *  notation — so it maps onto the deployment palette its elements are drawn out of. See
     *  [C4ModelMapper]. */
    C4("DeploymentDiagram"),

    /** A `.puml` file that parses (has `@startuml`/`@enduml`) but matches none of the above. */
    OTHER(null),

    /** No `@startuml`/`@enduml` envelope found at all. */
    UNKNOWN(null),
    ;

    /** Families with a real `<Family>Importer`/`<Family>ModelMapper` this iteration (plan §21). */
    val hasImporter: Boolean
        get() = this in setOf(CLASS, OBJECT, USE_CASE, COMPONENT, DEPLOYMENT, C4, ACTIVITY, SEQUENCE)
}
