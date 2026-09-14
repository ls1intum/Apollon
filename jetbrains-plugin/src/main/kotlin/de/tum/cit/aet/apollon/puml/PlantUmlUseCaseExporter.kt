package de.tum.cit.aet.apollon.puml

/** The exact inverse of [PlantUmlUseCaseImporter] — see [PlantUmlExporter] (Class) for the
 *  determinism contract this mirrors. A system-boundary element is rendered with a `{ ... }` body
 *  iff it currently has at least one child (the "does this element open a body" fact isn't itself
 *  preserved — it's recomputed from the model every export, same as Class recomputes member-list
 *  braces from whether a type has any members). */
object PlantUmlUseCaseExporter {
    fun render(
        diagram: PumlUseCaseDiagram,
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
        element: PumlUseCaseElement,
        childrenByParent: Map<String?, List<PumlUseCaseElement>>,
        indent: String,
    ): List<String> {
        val keyword =
            when (element.kind) {
                PumlUseCaseElementKind.ACTOR -> "actor"
                PumlUseCaseElementKind.USE_CASE -> "usecase"
                PumlUseCaseElementKind.SYSTEM -> "rectangle"
            }
        val header = renderDeclarationHeader(keyword, element.displayName, element.alias)
        val children = childrenByParent[element.refId].orEmpty()
        if (children.isEmpty()) return listOf(header)
        val out = mutableListOf("$header {")
        children.forEach { child -> out += renderElement(child, childrenByParent, indent).map { indent + it } }
        out += "}"
        return out
    }

    private fun renderRelation(rel: PumlUseCaseRelation): String {
        val token = rel.arrowToken.ifBlank { defaultToken(rel.kind) }
        val trailingLabel =
            when (rel.kind) {
                PumlUseCaseRelationKind.INCLUDE -> "<<include>>"
                PumlUseCaseRelationKind.EXTEND -> "<<extend>>"
                else -> rel.label
            }
        val generic = PumlRelation(rel.sourceRefId, rel.targetRefId, PumlRelationKind.BIDIRECTIONAL, "", "", "", "", rel.label, token)
        return PumlRelationGrammar.renderRelationLine(generic, token, trailingLabel)
    }

    private fun defaultToken(kind: PumlUseCaseRelationKind): String =
        when (kind) {
            PumlUseCaseRelationKind.GENERALIZATION -> "--|>"
            PumlUseCaseRelationKind.INCLUDE, PumlUseCaseRelationKind.EXTEND -> "..>"
            PumlUseCaseRelationKind.ASSOCIATION -> "--"
        }
}
