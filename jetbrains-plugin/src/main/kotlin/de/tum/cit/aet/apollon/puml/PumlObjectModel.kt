package de.tum.cit.aet.apollon.puml

/**
 * PlantUML object diagram model (plan §6/§9). An object's body lines are `key = value` fields —
 * unlike a class member, there is no PlantUML visibility/type grammar for them, so each is kept
 * verbatim as [PumlMember.apollonName] with [PumlMember.isMethod]/[PumlMember.isAbstract] always
 * `false` (Apollon's `ObjectNodeProps.methods` exists for schema symmetry with `ClassNodeProps` but
 * PlantUML object diagrams have no method syntax to import from).
 */
data class PumlObjectInstance(val name: String, val fields: List<PumlMember>)

data class PumlObjectDiagram(
    val name: String?,
    val objects: List<PumlObjectInstance>,
    val relations: List<PumlRelation>,
    val notes: List<PumlNote> = emptyList(),
)
