package de.tum.cit.aet.apollon.puml

sealed interface PumlC4ParseResult {
    data class Rejected(val reason: String) : PumlC4ParseResult

    data class Parsed(val diagram: PumlC4Diagram, val residual: PumlResidual, val unsupportedCount: Int) : PumlC4ParseResult
}

/**
 * `.puml` text -> [PumlC4Diagram] + [PumlResidual], for files written against C4-PlantUML.
 *
 * The grammar is unusually easy for a family this expressive, because C4-PlantUML is not new
 * syntax at all: it is a set of PlantUML macros, so every line is `Macro(arg, arg, …)` with an
 * optional `{` opening a boundary. That means one regex covers the whole surface, and anything
 * this file does not have in [C4_ELEMENT_MACROS] or [C4_RELATION_MACRO] — `AddElementTag`,
 * `UpdateElementStyle`, `SHOW_LEGEND()`, the `Lay_*` layout hints — is preserved verbatim rather
 * than guessed at, exactly as in every sibling importer.
 *
 * Unlike those siblings this one nests to any depth: C4 boundaries routinely sit inside boundaries
 * (an `Enterprise_Boundary` around a `System_Boundary` around containers), so a single
 * `openContainer` would flatten a diagram's whole point. The `!include <C4/…>` line the macros
 * need is a Tier-A line and lands in the preamble untouched, which is also what makes the View tab
 * render: PlantUML's bundled `stdlib` ships C4, so nothing has to be fetched.
 */
object PlantUmlC4Importer {
    fun parse(text: String): PumlC4ParseResult {
        val envelope = PumlEnvelopeReader.read(text) ?: return PumlC4ParseResult.Rejected("does not contain an @startuml block")
        val name = envelope.startLine.removePrefix("@startuml").trim().ifEmpty { null }

        val elements = mutableListOf<PumlC4Element>()
        val relations = mutableListOf<PumlC4Relation>()
        val preamble = mutableListOf<String>()
        val postamble = mutableListOf<String>()
        val unsupported = mutableListOf<String>()
        var sawMapped = false

        val open = ArrayDeque<String>()
        var unsupportedDepth = 0
        val noteReader = PumlNoteReader()

        fun flushPostambleAsUnsupported() {
            if (postamble.isNotEmpty()) {
                unsupported += postamble
                postamble.clear()
            }
        }

        for (raw in envelope.body) {
            val trimmed = raw.trim()

            if (unsupportedDepth > 0) {
                unsupported += raw
                if (trimmed.endsWith("{")) unsupportedDepth++
                if (trimmed == "}" || trimmed.endsWith("}")) unsupportedDepth--
                continue
            }

            if (noteReader.consume(trimmed)) {
                flushPostambleAsUnsupported()
                sawMapped = true
                continue
            }

            if (trimmed.isEmpty() || isTierALine(trimmed)) {
                if (!sawMapped) preamble += raw else postamble += raw
                continue
            }

            if ((trimmed == "}" || C4_BOUNDARY_END.matches(trimmed)) && open.isNotEmpty()) {
                open.removeLast()
                continue
            }

            val call = C4_MACRO_CALL.find(trimmed)
            if (call == null) {
                flushPostambleAsUnsupported()
                unsupported += raw
                if (trimmed.endsWith("{")) unsupportedDepth++
                continue
            }

            val macro = call.groupValues[1]
            val args = C4Args.split(call.groupValues[2])
            val opensBody = call.groupValues[3] == "{"

            val kind = C4_ELEMENT_MACROS[macro]
            if (kind != null && args.size >= 2) {
                flushPostambleAsUnsupported()
                sawMapped = true
                val refId = C4Args.unquote(args[0])
                elements +=
                    PumlC4Element(
                        refId = refId,
                        displayName = C4Args.unquote(args[1]),
                        kind = kind,
                        macro = macro,
                        extras = args.drop(2),
                        parentRefId = open.lastOrNull(),
                    )
                if (opensBody) open.addLast(refId)
                continue
            }

            val relationKind = c4RelationKindOf(macro)
            if (relationKind != null && args.size >= 2) {
                flushPostambleAsUnsupported()
                sawMapped = true
                relations +=
                    PumlC4Relation(
                        sourceRefId = C4Args.unquote(args[0]),
                        targetRefId = C4Args.unquote(args[1]),
                        kind = relationKind,
                        macro = macro,
                        label = args.getOrNull(2)?.let { C4Args.unquote(it) } ?: "",
                        extras = args.drop(3),
                    )
                continue
            }

            flushPostambleAsUnsupported()
            unsupported += raw
            if (opensBody) unsupportedDepth++
        }

        open.forEach { unsupported += "' Architect Studio: unterminated boundary $it" }

        if (elements.isEmpty()) {
            return PumlC4ParseResult.Rejected("contains no C4 elements")
        }

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
        return PumlC4ParseResult.Parsed(
            PumlC4Diagram(name, elements, relations, noteReader.result()),
            residual,
            unsupported.count { it.isNotBlank() },
        )
    }
}
