package de.tum.cit.aet.apollon.puml

enum class PumlUseCaseElementKind { USE_CASE, ACTOR, SYSTEM }

/**
 * One UseCase-diagram element. [refId] is what relation lines reference — the explicit `as` alias
 * when one was given, otherwise [displayName] itself *if* it's already a legal bare PlantUML
 * identifier (`PumlRelationGrammar`'s `IDENT`/quoting rules — a quoted, multi-word display name with
 * no alias has no legal way to be referenced from a relation line, so such an element can still be
 * declared/imported, just not connected; see [PlantUmlUseCaseImporter]'s doc comment).
 * [parentRefId] is set for actors/use cases declared inside a `rectangle { ... }` system boundary —
 * one level of nesting only (plan §9's scoping call, matching the "don't rush a shaky implementation
 * of more grammar than can be verified" principle).
 */
data class PumlUseCaseElement(
    val refId: String,
    val displayName: String,
    val alias: String?,
    val kind: PumlUseCaseElementKind,
    val parentRefId: String? = null,
)

enum class PumlUseCaseRelationKind { ASSOCIATION, INCLUDE, EXTEND, GENERALIZATION }

data class PumlUseCaseRelation(
    val sourceRefId: String,
    val targetRefId: String,
    val kind: PumlUseCaseRelationKind,
    val label: String = "",
    val arrowToken: String,
)

data class PumlUseCaseDiagram(
    val name: String?,
    val elements: List<PumlUseCaseElement>,
    val relations: List<PumlUseCaseRelation>,
    val notes: List<PumlNote> = emptyList(),
)

/** Reinterprets a generic arrow-shape relation ([PumlRelationGrammar.parseRelationLine]) as one of
 *  the four UseCase edge kinds Apollon models, or `null` if the shape/trailing-stereotype
 *  combination isn't one of them (an undecorated dependency with no `<<include>>`/`<<extend>>` text
 *  is genuinely ambiguous — plan's "never misinterpret" rule, caller preserves the raw line
 *  verbatim instead of guessing). */
fun classifyUseCaseRelation(rel: PumlRelation): PumlUseCaseRelation? {
    val stereotype = rel.label.trim().lowercase()
    return when (rel.kind) {
        PumlRelationKind.INHERITANCE ->
            PumlUseCaseRelation(rel.sourceName, rel.targetName, PumlUseCaseRelationKind.GENERALIZATION, "", rel.arrowToken)
        PumlRelationKind.BIDIRECTIONAL, PumlRelationKind.UNIDIRECTIONAL ->
            PumlUseCaseRelation(rel.sourceName, rel.targetName, PumlUseCaseRelationKind.ASSOCIATION, rel.label, rel.arrowToken)
        PumlRelationKind.DEPENDENCY ->
            when (stereotype) {
                "<<include>>", "include" -> PumlUseCaseRelation(rel.sourceName, rel.targetName, PumlUseCaseRelationKind.INCLUDE, "", rel.arrowToken)
                "<<extend>>", "extend" -> PumlUseCaseRelation(rel.sourceName, rel.targetName, PumlUseCaseRelationKind.EXTEND, "", rel.arrowToken)
                else -> null
            }
        else -> null
    }
}
