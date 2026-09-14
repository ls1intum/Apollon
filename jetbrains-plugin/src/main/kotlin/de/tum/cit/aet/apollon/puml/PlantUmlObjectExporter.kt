package de.tum.cit.aet.apollon.puml

/** The exact inverse of [PlantUmlObjectImporter] — see [PlantUmlExporter] (Class) for the
 *  determinism contract this mirrors. */
object PlantUmlObjectExporter {
    fun render(
        diagram: PumlObjectDiagram,
        residual: PumlResidual,
    ): String {
        val indent = residual.indent.ifEmpty { "  " }
        val lines = mutableListOf<String>()
        lines += residual.startLine
        lines += residual.preamble
        diagram.objects.forEach { lines += renderObject(it, indent) }
        diagram.relations.forEach { lines += PumlRelationGrammar.renderRelationLine(it, it.arrowToken.ifBlank { "--" }) }
        lines += PumlNotes.render(diagram.notes, indent, diagram.objects.map { it.name }.toSet())
        lines += residual.unsupported
        lines += residual.postamble
        lines += residual.endLine
        val eol = residual.eol.ifEmpty { "\n" }
        return lines.joinToString(eol) + eol
    }

    private fun renderObject(
        instance: PumlObjectInstance,
        indent: String,
    ): List<String> {
        val header = "object ${PumlRelationGrammar.quoteIfNeeded(instance.name)}"
        if (instance.fields.isEmpty()) return listOf(header)
        val out = mutableListOf("$header {")
        instance.fields.forEach { out += indent + it.apollonName }
        out += "}"
        return out
    }
}
