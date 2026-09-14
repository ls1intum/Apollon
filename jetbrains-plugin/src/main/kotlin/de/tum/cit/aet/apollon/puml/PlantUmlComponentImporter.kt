package de.tum.cit.aet.apollon.puml

private val COMPONENT_DECL = declarationRegex("component")
private val SUBSYSTEM_DECL = declarationRegex("package")

sealed interface PumlComponentParseResult {
    data class Rejected(val reason: String) : PumlComponentParseResult

    data class Parsed(val diagram: PumlComponentDiagram, val residual: PumlResidual, val unsupportedCount: Int) : PumlComponentParseResult
}

/** `.puml` text -> [PumlComponentDiagram] + [PumlResidual]. Same one-level-nesting,
 *  brace-depth-counted-unsupported-swallow discipline as [PlantUmlUseCaseImporter] — see that
 *  file's doc comment for the reasoning, identical here for `package { ... }` subsystem
 *  boundaries. */
object PlantUmlComponentImporter {
    fun parse(text: String): PumlComponentParseResult {
        val envelope = PumlEnvelopeReader.read(text) ?: return PumlComponentParseResult.Rejected("does not contain an @startuml block")
        val name = envelope.startLine.removePrefix("@startuml").trim().ifEmpty { null }

        val elements = mutableListOf<PumlComponentElement>()
        val relations = mutableListOf<PumlRelation>()
        val preamble = mutableListOf<String>()
        val postamble = mutableListOf<String>()
        val unsupported = mutableListOf<String>()
        var sawMapped = false

        var openContainer: String? = null
        var unsupportedDepth = 0
        val noteReader = PumlNoteReader()

        fun flushPostambleAsUnsupported() {
            if (postamble.isNotEmpty()) {
                unsupported += postamble
                postamble.clear()
            }
        }

        fun refIdOf(decl: ParsedDeclaration): String = decl.alias ?: decl.displayName

        for (raw in envelope.body) {
            val trimmed = raw.trim()

            if (unsupportedDepth > 0) {
                unsupported += raw
                if (trimmed.endsWith("{")) unsupportedDepth++
                if (trimmed == "}" || trimmed.endsWith("}")) unsupportedDepth--
                continue
            }

            if (openContainer != null && trimmed == "}") {
                openContainer = null
                continue
            }

            // Before every other branch: an open note body may hold a blank line, a comment or
            // something that reads exactly like a declaration, and `N1 .. Order` is otherwise a
            // perfectly good dashed relation.
            if (noteReader.consume(trimmed)) {
                flushPostambleAsUnsupported()
                sawMapped = true
                continue
            }

            if (trimmed.isEmpty() || isTierALine(trimmed)) {
                if (!sawMapped) preamble += raw else postamble += raw
                continue
            }

            val componentMatch = matchDeclaration(COMPONENT_DECL, trimmed)
            if (componentMatch != null) {
                flushPostambleAsUnsupported()
                sawMapped = true
                elements +=
                    PumlComponentElement(
                        refIdOf(componentMatch),
                        componentMatch.displayName,
                        componentMatch.alias,
                        PumlComponentElementKind.COMPONENT,
                        openContainer,
                    )
                if (componentMatch.opensBody) unsupportedDepth++
                continue
            }

            val subsystemMatch = matchDeclaration(SUBSYSTEM_DECL, trimmed)
            if (subsystemMatch != null) {
                if (openContainer != null) {
                    flushPostambleAsUnsupported()
                    unsupported += raw
                    if (subsystemMatch.opensBody) unsupportedDepth++
                    continue
                }
                flushPostambleAsUnsupported()
                sawMapped = true
                val refId = refIdOf(subsystemMatch)
                elements += PumlComponentElement(refId, subsystemMatch.displayName, subsystemMatch.alias, PumlComponentElementKind.SUBSYSTEM, null)
                if (subsystemMatch.opensBody) openContainer = refId
                continue
            }

            val relation = PumlRelationGrammar.parseRelationLine(trimmed)
            if (relation != null) {
                flushPostambleAsUnsupported()
                sawMapped = true
                relations += relation
                continue
            }

            flushPostambleAsUnsupported()
            unsupported += raw
            if (trimmed.endsWith("{")) unsupportedDepth++
        }

        if (openContainer != null) unsupported += "' Architect Studio: unterminated package $openContainer"

        if (!sawMapped) return PumlComponentParseResult.Rejected("contains no component or package declarations")

        val residual =
            PumlResidual(
                startLine = envelope.startLine,
                endLine = envelope.endLine,
                eol = envelope.eol,
                indent = envelope.indent,
                preamble = preamble,
                postamble = postamble,
                unsupported = unsupported,
            )
        return PumlComponentParseResult.Parsed(PumlComponentDiagram(name, elements, relations, noteReader.result()), residual, unsupported.count { it.isNotBlank() })
    }
}
