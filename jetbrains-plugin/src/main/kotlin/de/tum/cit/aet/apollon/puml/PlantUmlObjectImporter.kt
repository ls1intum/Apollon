package de.tum.cit.aet.apollon.puml

/** `.puml` text -> [PumlObjectDiagram] + [PumlResidual], for `object Name { key = value ... }`
 *  bodies and object-to-object links — the Object-diagram counterpart of [PlantUmlImporter]. Same
 *  conservative discipline: an aliased (`as`) declaration is preserved verbatim rather than guessed
 *  at, exactly like Class's aliasing carve-out. */
private val OBJECT_DECL =
    Regex(
        """^object\s+(?:"([^"]+)"|([A-Za-z_][\w.$]*))(\s+as\s+\S+)?\s*(\{)?\s*$""",
        RegexOption.IGNORE_CASE,
    )

sealed interface PumlObjectParseResult {
    data class Rejected(val reason: String) : PumlObjectParseResult

    data class Parsed(val diagram: PumlObjectDiagram, val residual: PumlResidual, val unsupportedCount: Int) : PumlObjectParseResult
}

object PlantUmlObjectImporter {
    fun parse(text: String): PumlObjectParseResult {
        val envelope = PumlEnvelopeReader.read(text) ?: return PumlObjectParseResult.Rejected("does not contain an @startuml block")
        val name = envelope.startLine.removePrefix("@startuml").trim().ifEmpty { null }

        val objects = mutableListOf<PumlObjectInstance>()
        val relations = mutableListOf<PumlRelation>()
        val preamble = mutableListOf<String>()
        val postamble = mutableListOf<String>()
        val unsupported = mutableListOf<String>()
        var sawMapped = false

        var openObject: OpenObject? = null
        var openBlockCloser: String? = null
        val noteReader = PumlNoteReader()

        fun flushPostambleAsUnsupported() {
            if (postamble.isNotEmpty()) {
                unsupported += postamble
                postamble.clear()
            }
        }

        for (raw in envelope.body) {
            val trimmed = raw.trim()

            if (openObject != null) {
                when {
                    trimmed == "}" -> {
                        objects += openObject.toInstance()
                        openObject = null
                    }
                    trimmed.isEmpty() -> {}
                    SHARED_TIER_A_SEPARATOR_LINE.matches(trimmed) -> unsupported += raw
                    else -> openObject.fields += PumlMember(trimmed, isMethod = false, isAbstract = false)
                }
                continue
            }

            if (openBlockCloser != null) {
                unsupported += raw
                if (trimmed.equals(openBlockCloser, ignoreCase = true)) openBlockCloser = null
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

            val declMatch = OBJECT_DECL.find(trimmed)
            if (declMatch != null) {
                val objName = declMatch.groupValues[1].ifEmpty { declMatch.groupValues[2] }
                val hasAlias = declMatch.groupValues[3].isNotEmpty()
                val opensBody = declMatch.groupValues[4] == "{"
                if (hasAlias) {
                    flushPostambleAsUnsupported()
                    unsupported += raw
                    if (opensBody) openBlockCloser = "}"
                    continue
                }
                flushPostambleAsUnsupported()
                sawMapped = true
                if (opensBody) {
                    openObject = OpenObject(objName)
                } else {
                    objects += PumlObjectInstance(objName, emptyList())
                }
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
        }

        openObject?.let { unsupported += "' Architect Studio: unterminated object ${it.name}" }

        if (!sawMapped) return PumlObjectParseResult.Rejected("contains no object declarations")

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
        return PumlObjectParseResult.Parsed(PumlObjectDiagram(name, objects, relations, noteReader.result()), residual, unsupported.count { it.isNotBlank() })
    }
}

private data class OpenObject(val name: String, val fields: MutableList<PumlMember> = mutableListOf()) {
    fun toInstance() = PumlObjectInstance(name, fields.toList())
}
