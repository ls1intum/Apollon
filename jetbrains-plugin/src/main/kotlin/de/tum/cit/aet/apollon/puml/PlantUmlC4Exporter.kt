package de.tum.cit.aet.apollon.puml

/**
 * The exact inverse of [PlantUmlC4Importer] — see [PlantUmlExporter] (Class) for the determinism
 * contract this mirrors.
 *
 * Two normalisations happen on the first save of a hand-written file and are stable from then on:
 * a label is always written quoted (C4 accepts a bare word, `unquote`/`quote` is idempotent), and
 * boundaries are always closed with `}` rather than `Boundary_End()`. Everything else — the exact
 * macro name, direction suffixes, and every argument after the label — comes back as it went in.
 */
object PlantUmlC4Exporter {
    fun render(
        diagram: PumlC4Diagram,
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
        element: PumlC4Element,
        childrenByParent: Map<String?, List<PumlC4Element>>,
        indent: String,
    ): List<String> {
        val args = listOf(element.refId, C4Args.quote(element.displayName)) + element.extras
        val header = "${element.macro}(${args.joinToString(", ")})"
        val children = childrenByParent[element.refId].orEmpty()
        if (children.isEmpty()) return listOf(header)
        val body = children.flatMap { renderElement(it, childrenByParent, indent) }.map { indent + it }
        return listOf("$header {") + body + "}"
    }

    private fun renderRelation(relation: PumlC4Relation): String {
        val args =
            listOf(relation.sourceRefId, relation.targetRefId, C4Args.quote(relation.label)) + relation.extras
        return "${relation.macro}(${args.joinToString(", ")})"
    }
}
