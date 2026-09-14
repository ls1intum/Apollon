package de.tum.cit.aet.apollon.puml

/**
 * The PlantUML text a brand-new `.puml` file starts from, one starter element per family.
 *
 * Scaffolding happens in the *PlantUML* domain rather than the Apollon one — unlike
 * `DiagramDocument.scaffoldModel`, which hands the canvas an empty `UMLModel` and lets the first
 * save serialise it. Two reasons:
 *
 *  - There is no such thing as an empty `.puml`. A bare `@startuml`/`@enduml` pair carries no
 *    keyword for [DiagramTypeDetector] to read, so reopening the file would classify it as
 *    [DiagramFamily.OTHER] and the canvas would refuse the very diagram it had just created. The
 *    family only exists on disk as long as at least one element declares it.
 *  - Writing text and letting [PlantUmlDiagramImporter] produce the model keeps one direction of
 *    truth. A hand-built model would have to reproduce each family's node shape a second time,
 *    and any drift between the two would surface as a [RoundTripValidator] rejection on the
 *    user's first edit.
 *
 * Only the families with an exporter appear here: offering the canvas's full type list would let
 * someone start a BPMN diagram that could never be written back as PlantUML.
 */
/** The picker id for a C4 starter. Not an Apollon `UMLDiagramType` — see [PumlScaffold.STARTERS] —
 *  so it is spelled out once here and mirrored by `STARTER_LABELS` in the webview. */
const val C4_STARTER_ID = "C4"

/** The picker id for a sequence-diagram starter. Not an Apollon `UMLDiagramType` either: a sequence
 *  diagram opens on the canvas as a communication diagram — see [SequenceModelMapper]. */
const val SEQUENCE_STARTER_ID = "Sequence"

object PumlScaffold {
    /**
     * Keyed by Apollon `UMLDiagramType`, the value being the `@startuml` body. Each starter is the
     * smallest text that both detects as its family and imports to one editable element.
     *
     * [C4_STARTER_ID] is the exception and is not a `UMLDiagramType` at all: C4 is a way of using
     * deployment elements rather than a notation of its own (see [C4ModelMapper]), so it has no
     * type in `library/lib/types/DiagramType.ts` for the picker to key off. It is also the one
     * starter that must be more than a single element — the `!include` line is what makes the
     * macros resolve, and one of each level makes the shape of a C4 diagram legible before the
     * first edit.
     */
    private val STARTERS: Map<String, String> =
        linkedMapOf(
            "ClassDiagram" to "class NewClass {\n}",
            "ObjectDiagram" to "object NewObject {\n}",
            "UseCaseDiagram" to "actor Actor\nusecase \"New Use Case\" as UC1\nActor --> UC1",
            "ComponentDiagram" to "component NewComponent",
            "DeploymentDiagram" to "node NewNode",
            "ActivityDiagram" to "start\n:New Action;\nstop",
            SEQUENCE_STARTER_ID to
                "participant Caller\nparticipant Callee\nCaller -> Callee : request\nCallee --> Caller : response",
            C4_STARTER_ID to
                """
                !include <C4/C4_Container>

                Person(user, "Customer", "Someone who uses the system")
                System_Boundary(system, "Software System") {
                  Container(web, "Web Application", "Technology", "Does something useful")
                  ContainerDb(db, "Database", "Technology", "Stores what the application needs")
                }
                Rel(user, web, "Uses", "HTTPS")
                Rel(web, db, "Reads from and writes to", "SQL/TCP")
                """.trimIndent(),
        )

    /** The diagram types a `.puml` can be started as, in picker order. */
    val diagramTypes: List<String> = STARTERS.keys.toList()

    /** The starter text for [diagramType], or `null` if that family has no PlantUML exporter. */
    fun textFor(diagramType: String): String? = STARTERS[diagramType]?.let { "@startuml\n$it\n@enduml\n" }
}
