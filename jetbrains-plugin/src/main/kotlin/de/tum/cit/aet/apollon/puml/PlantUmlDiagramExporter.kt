package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

private fun typeOf(model: JsonObject): String? = (model["type"] as? JsonPrimitive)?.takeIf { it.isString }?.content

data class DispatchedExport(val text: String, val residual: PumlResidual)

/**
 * The Apollon-model -> `.puml` text counterpart of [PlantUmlDiagramImporter]: dispatches on the
 * model's own `type` field (set once at import time and never changed by canvas edits) — or, for
 * C4, on the family the importer recorded on the residual, because C4 shares its Apollon type with
 * the Deployment family — to the matching family's `toPumlDiagram` + exporter, and folds the freshly recomputed
 * `typeKeywords`/`arrowTokens`/`elementAliases` back into [residual] so the *next* export starts
 * from up-to-date per-id source facts. [de.tum.cit.aet.apollon.document.PumlDocumentBridge] holds
 * the returned residual for exactly that reason.
 */
object PlantUmlDiagramExporter {
    fun render(
        model: JsonObject,
        residual: PumlResidual,
    ): DispatchedExport =
        // C4 first, and off the residual rather than the model: a C4 diagram is an Apollon
        // `DeploymentDiagram`, so the model's own type cannot tell the two apart.
        if (residual.family == DiagramFamily.C4) {
            val export = C4ModelMapper.toPumlDiagram(model, residual)
            val pruned =
                residual.copy(
                    typeKeywords = export.typeKeywords,
                    arrowTokens = export.arrowTokens,
                    elementAliases = export.elementAliases,
                    c4Extras = export.c4Extras,
                )
            DispatchedExport(PlantUmlC4Exporter.render(export.diagram, pruned), pruned)
        } else {
            when (typeOf(model)) {
                "CommunicationDiagram" -> {
                    val export = SequenceModelMapper.toPumlDiagram(model, residual)
                    val pruned =
                        residual.copy(
                            typeKeywords = export.typeKeywords,
                            arrowTokens = export.arrowTokens,
                            elementAliases = export.elementAliases,
                        )
                    DispatchedExport(PlantUmlSequenceExporter.render(export.diagram, pruned), pruned)
                }
                "ActivityDiagram" -> {
                    val export = ActivityModelMapper.toPumlDiagram(model, residual)
                    val pruned = residual.copy(typeKeywords = export.typeKeywords, arrowTokens = emptyMap())
                    DispatchedExport(PlantUmlActivityExporter.render(export.diagram, pruned), pruned)
                }
                "ObjectDiagram" -> {
                    val export = ObjectModelMapper.toPumlDiagram(model, residual)
                    val pruned = residual.copy(typeKeywords = export.typeKeywords, arrowTokens = export.arrowTokens)
                    DispatchedExport(PlantUmlObjectExporter.render(export.diagram, pruned), pruned)
                }
                "UseCaseDiagram" -> {
                    val export = UseCaseModelMapper.toPumlDiagram(model, residual)
                    val pruned =
                        residual.copy(
                            typeKeywords = export.typeKeywords,
                            arrowTokens = export.arrowTokens,
                            elementAliases = export.elementAliases,
                        )
                    DispatchedExport(PlantUmlUseCaseExporter.render(export.diagram, pruned), pruned)
                }
                "ComponentDiagram" -> {
                    val export = ComponentModelMapper.toPumlDiagram(model, residual)
                    val pruned =
                        residual.copy(
                            typeKeywords = export.typeKeywords,
                            arrowTokens = export.arrowTokens,
                            elementAliases = export.elementAliases,
                        )
                    DispatchedExport(PlantUmlComponentExporter.render(export.diagram, pruned), pruned)
                }
                "DeploymentDiagram" -> {
                    val export = DeploymentModelMapper.toPumlDiagram(model, residual)
                    val pruned =
                        residual.copy(
                            typeKeywords = export.typeKeywords,
                            arrowTokens = export.arrowTokens,
                            elementAliases = export.elementAliases,
                        )
                    DispatchedExport(PlantUmlDeploymentExporter.render(export.diagram, pruned), pruned)
                }
                else -> {
                    val export = ApollonModelMapper.toPumlDiagram(model, residual)
                    val pruned =
                        residual.copy(
                            typeKeywords = export.typeKeywords,
                            arrowTokens = export.arrowTokens,
                            elementAliases = export.elementAliases,
                            typeStereotypes = export.typeStereotypes,
                            typeBodies = export.typeBodies,
                        )
                    DispatchedExport(PlantUmlExporter.render(export.diagram, pruned), pruned)
                }
            }
        }
}
