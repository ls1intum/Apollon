package de.tum.cit.aet.apollon.puml

private val NODE_DECL = declarationRegex("node|device")
private val COMPONENT_DECL = declarationRegex("component")
private val ARTIFACT_DECL = declarationRegex("artifact")

sealed interface PumlDeploymentParseResult {
    data class Rejected(val reason: String) : PumlDeploymentParseResult

    data class Parsed(val diagram: PumlDeploymentDiagram, val residual: PumlResidual, val unsupportedCount: Int) : PumlDeploymentParseResult
}

/** `.puml` text -> [PumlDeploymentDiagram] + [PumlResidual]. `node`/`device` open a one-level
 *  container body holding `component`/`artifact` children (a nested `node`/`device`, like a nested
 *  `rectangle`/`package` in the sibling families, is preserved verbatim instead of guessed at — see
 *  [PlantUmlUseCaseImporter]'s doc comment for the shared reasoning). */
object PlantUmlDeploymentImporter {
    fun parse(text: String): PumlDeploymentParseResult {
        val envelope = PumlEnvelopeReader.read(text) ?: return PumlDeploymentParseResult.Rejected("does not contain an @startuml block")
        val name = envelope.startLine.removePrefix("@startuml").trim().ifEmpty { null }

        val elements = mutableListOf<PumlDeploymentElement>()
        val relations = mutableListOf<PumlDeploymentRelation>()
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

            val nodeMatch = matchDeclaration(NODE_DECL, trimmed)
            if (nodeMatch != null) {
                if (openContainer != null) {
                    flushPostambleAsUnsupported()
                    unsupported += raw
                    if (nodeMatch.opensBody) unsupportedDepth++
                    continue
                }
                flushPostambleAsUnsupported()
                sawMapped = true
                val refId = refIdOf(nodeMatch)
                elements +=
                    PumlDeploymentElement(refId, nodeMatch.displayName, nodeMatch.alias, PumlDeploymentElementKind.NODE, nodeMatch.keyword, null)
                if (nodeMatch.opensBody) openContainer = refId
                continue
            }

            val componentMatch = matchDeclaration(COMPONENT_DECL, trimmed)
            if (componentMatch != null) {
                flushPostambleAsUnsupported()
                sawMapped = true
                elements +=
                    PumlDeploymentElement(
                        refIdOf(componentMatch),
                        componentMatch.displayName,
                        componentMatch.alias,
                        PumlDeploymentElementKind.COMPONENT,
                        parentRefId = openContainer,
                    )
                if (componentMatch.opensBody) unsupportedDepth++
                continue
            }

            val artifactMatch = matchDeclaration(ARTIFACT_DECL, trimmed)
            if (artifactMatch != null) {
                flushPostambleAsUnsupported()
                sawMapped = true
                elements +=
                    PumlDeploymentElement(
                        refIdOf(artifactMatch),
                        artifactMatch.displayName,
                        artifactMatch.alias,
                        PumlDeploymentElementKind.ARTIFACT,
                        parentRefId = openContainer,
                    )
                if (artifactMatch.opensBody) unsupportedDepth++
                continue
            }

            val generic = PumlRelationGrammar.parseRelationLine(trimmed)
            val classified = generic?.let { classifyDeploymentRelation(it) }
            if (classified != null) {
                flushPostambleAsUnsupported()
                sawMapped = true
                relations += classified
                continue
            }

            flushPostambleAsUnsupported()
            unsupported += raw
            if (trimmed.endsWith("{")) unsupportedDepth++
        }

        if (openContainer != null) unsupported += "' Architect Studio: unterminated node $openContainer"

        if (!sawMapped) return PumlDeploymentParseResult.Rejected("contains no node, component or artifact declarations")

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
        return PumlDeploymentParseResult.Parsed(PumlDeploymentDiagram(name, elements, relations, noteReader.result()), residual, unsupported.count { it.isNotBlank() })
    }
}
