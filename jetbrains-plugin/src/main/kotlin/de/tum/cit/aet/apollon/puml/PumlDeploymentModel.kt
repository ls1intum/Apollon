package de.tum.cit.aet.apollon.puml

enum class PumlDeploymentElementKind { NODE, COMPONENT, ARTIFACT }

/** `stereotype` mirrors Apollon's `DeploymentNodeProps.stereotype` — the source keyword used
 *  (`node` or `device`; `execution environment`/`cloud`/`database`/`storage` are out of scope this
 *  iteration, same "closed, verified grammar over a wider guessed one" call as everywhere else in
 *  plan §9). Only [PumlDeploymentElementKind.NODE] can have children — one level of nesting, same
 *  as [PlantUmlUseCaseImporter]'s `rectangle`/[PlantUmlComponentImporter]'s `package`. */
data class PumlDeploymentElement(
    val refId: String,
    val displayName: String,
    val alias: String?,
    val kind: PumlDeploymentElementKind,
    val stereotype: String = "node",
    val parentRefId: String? = null,
)

enum class PumlDeploymentRelationKind { ASSOCIATION, DEPENDENCY }

data class PumlDeploymentRelation(
    val sourceRefId: String,
    val targetRefId: String,
    val kind: PumlDeploymentRelationKind,
    val label: String = "",
    val arrowToken: String,
)

data class PumlDeploymentDiagram(
    val name: String?,
    val elements: List<PumlDeploymentElement>,
    val relations: List<PumlDeploymentRelation>,
    val notes: List<PumlNote> = emptyList(),
)

/** Reinterprets a generic arrow-shape relation as one of the two Deployment edge kinds Apollon
 *  models, or `null` if the shape is neither (generalization/realization/aggregation/composition
 *  arrows have no Deployment-diagram meaning — preserved verbatim by the caller instead of
 *  guessed at). */
fun classifyDeploymentRelation(rel: PumlRelation): PumlDeploymentRelation? =
    when (rel.kind) {
        PumlRelationKind.DEPENDENCY ->
            PumlDeploymentRelation(rel.sourceName, rel.targetName, PumlDeploymentRelationKind.DEPENDENCY, rel.label, rel.arrowToken)
        PumlRelationKind.BIDIRECTIONAL, PumlRelationKind.UNIDIRECTIONAL ->
            PumlDeploymentRelation(rel.sourceName, rel.targetName, PumlDeploymentRelationKind.ASSOCIATION, rel.label, rel.arrowToken)
        else -> null
    }
