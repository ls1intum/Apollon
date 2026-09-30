package de.tum.cit.aet.apollon.puml

/** The exact inverse of [PlantUmlDeploymentImporter] — see [PlantUmlUseCaseExporter] for the
 *  container-sizing/braces contract this mirrors. A `NODE` element's [PumlDeploymentElement.stereotype]
 *  ("node" or "device") is rendered back as its own declaration keyword. */
object PlantUmlDeploymentExporter {
    fun render(
        diagram: PumlDeploymentDiagram,
        residual: PumlResidual,
    ): String {
        val indent = residual.indent.ifEmpty { "  " }
        val lines = mutableListOf<String>()
        lines += residual.startLine
        lines += residual.preamble

        val childrenByParent = diagram.elements.filter { it.parentRefId != null }.groupBy { it.parentRefId }
        diagram.elements.filter { it.parentRefId == null }.forEach { element ->
            lines += renderElement(element, childrenByParent, indent)
        }
        diagram.relations.forEach { lines += renderRelation(it) }

        lines += PumlNotes.render(diagram.notes, indent, diagram.elements.map { it.refId }.toSet())
        lines += residual.unsupported
        lines += residual.postamble
        lines += residual.endLine
        val eol = residual.eol.ifEmpty { "\n" }
        return lines.joinToString(eol) + eol
    }

    private fun renderElement(
        element: PumlDeploymentElement,
        childrenByParent: Map<String?, List<PumlDeploymentElement>>,
        indent: String,
    ): List<String> {
        val keyword =
            when (element.kind) {
                PumlDeploymentElementKind.NODE -> element.stereotype.ifBlank { "node" }
                PumlDeploymentElementKind.COMPONENT -> "component"
                PumlDeploymentElementKind.ARTIFACT -> "artifact"
            }
        val header = renderDeclarationHeader(keyword, element.displayName, element.alias)
        val children = childrenByParent[element.refId].orEmpty()
        if (children.isEmpty()) return listOf(header)
        val out = mutableListOf("$header {")
        children.forEach { child -> out += renderElement(child, childrenByParent, indent).map { indent + it } }
        out += "}"
        return out
    }

    private fun renderRelation(rel: PumlDeploymentRelation): String {
        val token = rel.arrowToken.ifBlank { defaultToken(rel.kind) }
        val generic = PumlRelation(rel.sourceRefId, rel.targetRefId, PumlRelationKind.BIDIRECTIONAL, "", "", "", "", rel.label, token)
        return PumlRelationGrammar.renderRelationLine(generic, token, rel.label)
    }

    private fun defaultToken(kind: PumlDeploymentRelationKind): String =
        when (kind) {
            PumlDeploymentRelationKind.DEPENDENCY -> "..>"
            PumlDeploymentRelationKind.ASSOCIATION -> "--"
        }
}
