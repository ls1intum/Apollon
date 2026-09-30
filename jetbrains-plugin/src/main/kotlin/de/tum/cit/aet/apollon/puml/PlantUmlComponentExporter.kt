package de.tum.cit.aet.apollon.puml

/** The exact inverse of [PlantUmlComponentImporter] — see [PlantUmlUseCaseExporter] for the
 *  container-sizing/braces contract this mirrors. */
object PlantUmlComponentExporter {
    fun render(
        diagram: PumlComponentDiagram,
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
        diagram.relations.forEach { lines += PumlRelationGrammar.renderRelationLine(it, it.arrowToken.ifBlank { "..>" }) }

        lines += PumlNotes.render(diagram.notes, indent, diagram.elements.map { it.refId }.toSet())
        lines += residual.unsupported
        lines += residual.postamble
        lines += residual.endLine
        val eol = residual.eol.ifEmpty { "\n" }
        return lines.joinToString(eol) + eol
    }

    private fun renderElement(
        element: PumlComponentElement,
        childrenByParent: Map<String?, List<PumlComponentElement>>,
        indent: String,
    ): List<String> {
        val keyword = if (element.kind == PumlComponentElementKind.SUBSYSTEM) "package" else "component"
        val header = renderDeclarationHeader(keyword, element.displayName, element.alias)
        val children = childrenByParent[element.refId].orEmpty()
        if (children.isEmpty()) return listOf(header)
        val out = mutableListOf("$header {")
        children.forEach { child -> out += renderElement(child, childrenByParent, indent).map { indent + it } }
        out += "}"
        return out
    }
}
