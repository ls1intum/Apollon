package de.tum.cit.aet.apollon.puml

private val BARE_IDENT = Regex("""^[A-Za-z_][\w.$]*$""")

/**
 * [PumlDiagram] + [PumlResidual] -> `.puml` text. The exact inverse of [PlantUmlImporter],
 * deterministic (plan §D3/§D4): the same diagram + residual always renders to the same bytes, so
 * `puml -> model -> puml` twice in a row without an edit produces byte-identical output
 * (`RoundTripTest`).
 */
object PlantUmlExporter {
    fun render(
        diagram: PumlDiagram,
        residual: PumlResidual,
    ): String {
        val indent = residual.indent.ifEmpty { "  " }
        val lines = mutableListOf<String>()
        lines += residual.startLine
        lines += residual.preamble
        val byPackage = diagram.types.filter { it.parentName != null }.groupBy { it.parentName }
        diagram.types.filter { it.parentName == null }.forEach { lines += renderType(it, indent) }
        // Packages last among the declarations, so a class moved out of one produces a small diff
        // rather than reordering every top-level declaration around it.
        diagram.packages.forEach { pkg ->
            lines += "package ${quoteIfNeeded(pkg.name)} {"
            byPackage[pkg.name].orEmpty().forEach { type -> lines += renderType(type, indent).map { indent + it } }
            lines += "}"
        }
        diagram.relations.forEach { lines += renderRelation(it) }
        lines += PumlNotes.render(diagram.notes, indent, diagram.types.map { it.refId }.toSet() + diagram.packages.map { it.name })
        lines += residual.unsupported
        lines += residual.postamble
        lines += residual.endLine
        val eol = residual.eol.ifEmpty { "\n" }
        return lines.joinToString(eol) + eol
    }

    private fun renderType(
        type: PumlType,
        indent: String,
    ): List<String> {
        val header = renderHeader(type)
        // The body the source had, if the canvas still agrees with it. Re-rendering unconditionally
        // would rewrite `-id : Long` as `- id : Long`, hoist every method below every attribute and
        // drop the `--` separators between them — a whole-file diff on the first save after a drag.
        if (type.bodySource.isNotEmpty() && bodyStillMatches(type)) {
            return listOf("$header {") + type.bodySource.map { if (it.isEmpty()) "" else indent + it } + "}"
        }
        if (type.attributes.isEmpty() && type.methods.isEmpty()) {
            return listOf(header)
        }
        val out = mutableListOf("$header {")
        type.attributes.forEach { out += indent + parseMemberText(it.apollonName).toPumlLine(it.isAbstract) }
        type.methods.forEach { out += indent + parseMemberText(it.apollonName).toPumlLine(it.isAbstract) }
        out += "}"
        return out
    }

    /**
     * Whether [PumlType.bodySource] still declares exactly the members the canvas holds.
     *
     * Compared per compartment rather than as one list, because the two sides order members
     * differently on purpose: the source may interleave attributes and methods, while the canvas
     * keeps them in two arrays. Only their *contents* have to agree — if they do, the source's
     * interleaving is the one to reproduce.
     */
    private fun bodyStillMatches(type: PumlType): Boolean {
        val declared = membersIn(type.bodySource)
        return declared.filterNot { it.isMethod } == type.attributes && declared.filter { it.isMethod } == type.methods
    }

    /** `keyword "Name" as Alias <<stereotype>>` — PlantUML's own order, and its own requirement
     *  that an aliased declaration quote its display name. */
    private fun renderHeader(type: PumlType): String =
        buildString {
            append(type.keyword)
            append(' ')
            append(if (type.alias != null) "\"${type.name}\"" else quoteIfNeeded(type.name))
            type.alias?.let {
                append(" as ")
                append(it)
            }
            type.stereotype?.let {
                append(' ')
                append(it)
            }
        }

    private fun renderRelation(rel: PumlRelation): String {
        val token = rel.arrowToken.ifBlank { canonicalArrowToken(rel.kind) }
        val info = classifyArrow(token) ?: classifyArrow(canonicalArrowToken(rel.kind))!!

        var leftName = rel.sourceName
        var rightName = rel.targetName
        var leftMult = rel.sourceMultiplicity
        var leftRole = rel.sourceRole
        var rightMult = rel.targetMultiplicity
        var rightRole = rel.targetRole
        if (info.decoratedSide == Side.LEFT) {
            leftName = rel.targetName
            rightName = rel.sourceName
            leftMult = rel.targetMultiplicity
            leftRole = rel.targetRole
            rightMult = rel.sourceMultiplicity
            rightRole = rel.sourceRole
        }

        val leftLabel = joinEndLabel(leftMult, leftRole)
        val rightLabel = joinEndLabel(rightMult, rightRole)
        val parts = mutableListOf(quoteIfNeeded(leftName))
        if (leftLabel.isNotEmpty()) parts += "\"$leftLabel\""
        parts += token
        if (rightLabel.isNotEmpty()) parts += "\"$rightLabel\""
        parts += quoteIfNeeded(rightName)
        var line = parts.joinToString(" ")
        if (rel.label.isNotEmpty()) line += " : ${rel.label}"
        return line
    }

    private fun quoteIfNeeded(name: String): String = if (BARE_IDENT.matches(name)) name else "\"$name\""
}
