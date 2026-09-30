package de.tum.cit.aet.apollon.puml

enum class PumlComponentElementKind { COMPONENT, SUBSYSTEM }

/** Only `component "Name" [as alias] { }` and `package "Name" [as alias] { }` (the subsystem
 *  boundary) are understood — PlantUML's `[Component]` bracket shorthand is not (same scoping call
 *  as [PlantUmlUseCaseImporter]'s actor/usecase-keyword-only choice: the exporter always emits
 *  keyword form, so the round trip is closed and stable rather than a partial read of a wider
 *  grammar). `componentInterface` (the provided/required "lollipop" notation) is out of scope for
 *  this iteration — plan §9/§21: Apollon's lollipop edges
 *  (`ComponentProvidedInterface`/`ComponentRequiredInterface`/...) have no single obvious PlantUML
 *  arrow-token mapping the way plain dependency arrows do, and guessing one would risk exactly the
 *  kind of silent misinterpretation this importer is built to avoid. */
data class PumlComponentElement(
    val refId: String,
    val displayName: String,
    val alias: String?,
    val kind: PumlComponentElementKind,
    val parentRefId: String? = null,
)

data class PumlComponentDiagram(
    val name: String?,
    val elements: List<PumlComponentElement>,
    val relations: List<PumlRelation>,
    val notes: List<PumlNote> = emptyList(),
)
