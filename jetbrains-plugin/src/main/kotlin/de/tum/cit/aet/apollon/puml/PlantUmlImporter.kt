package de.tum.cit.aet.apollon.puml

/**
 * `.puml` text -> [PumlDiagram] + [PumlResidual]. Pure Kotlin, no `com.intellij` import —
 * unit-testable without an IDE (spec §9).
 *
 * Deliberately conservative: PlantUML syntax this parser is not certain about is never guessed
 * at. It is preserved verbatim in [PumlResidual.unsupported] instead (spec §11) rather than risk
 * silently misinterpreting it. See the implementation plan §D for the exact grammar this
 * implements and §A11 for why this is hand-rolled rather than built on a PlantUML library.
 */
sealed interface PumlParseResult {
    data class Rejected(val reason: String) : PumlParseResult

    data class Parsed(val diagram: PumlDiagram, val residual: PumlResidual, val unsupportedCount: Int) : PumlParseResult
}

/**
 * `<keyword> ("Name"|Name) [as alias] [<<stereotype>>…] [{]`, matching PlantUML's own order — a
 * stereotype written *before* the alias is a syntax error there, so it is not accepted here either.
 * The stereotype group repeats because a declaration may carry several, and its body is `[^>]*` so
 * a parameterised one (`<<(D,orchid) Database>>`) matches too.
 */
private val TYPE_DECL =
    Regex(
        """^(abstract\s+class|abstract|class|interface|enum|entity)\s+(?:"([^"]+)"|([A-Za-z_][\w.$]*))""" +
            """(?:\s+as\s+([A-Za-z_][\w.$]*))?((?:\s*<<[^>]*>>)+)?\s*(\{)?\s*$""",
        RegexOption.IGNORE_CASE,
    )

private val PACKAGE_DECL = declarationRegex("package")

private val IDENT = Regex("""[A-Za-z_][\w.$]*""")
private val TOKEN = Regex(""""[^"]*"|\S+""")

private val TIER_A_PREFIXES =
    listOf(
        "skinparam", "!include", "!theme", "!pragma", "!define", "title", "header", "footer",
        "hide ", "show ", "scale ", "left to right direction", "top to bottom direction", "allowmixing",
    )

private val NON_CLASS_MARKERS =
    listOf("@startmindmap", "@startgantt", "@startsalt", "@startwbs", "@startjson", "@startyaml")

object PlantUmlImporter {
    fun parse(text: String): PumlParseResult {
        val eol = if (text.contains("\r\n")) "\r\n" else "\n"
        val lines = text.split(Regex("\r\n|\n"))
        val startIdx = lines.indexOfFirst { it.trim().lowercase().startsWith("@startuml") }
        val endIdx = lines.indexOfLast { it.trim().lowercase().startsWith("@enduml") }
        if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
            return PumlParseResult.Rejected("does not contain an @startuml block")
        }
        val startLine = lines[startIdx].trim()
        val endLine = lines[endIdx].trim()
        val name = startLine.removePrefix("@startuml").trim().ifEmpty { null }
        val body = lines.subList(startIdx + 1, endIdx)

        if (looksNonClass(body)) {
            return PumlParseResult.Rejected("is not a PlantUML class diagram — Architect Studio can render it in View but cannot yet edit it visually")
        }

        val indent =
            body.firstNotNullOfOrNull { line -> Regex("^([ \t]+)\\S").find(line)?.groupValues?.get(1) } ?: "  "

        val types = mutableListOf<PumlType>()
        // Each relation is kept next to the line it came from: an endpoint that turns out to be
        // undeclarable (see `resolveRelations`) has to go back into the file exactly as written
        // rather than disappear with the relation.
        val relationLines = mutableListOf<Pair<PumlRelation, String>>()
        val preamble = mutableListOf<String>()
        val postamble = mutableListOf<String>()
        val unsupported = mutableListOf<String>()
        var sawMapped = false

        var openType: OpenType? = null
        var openBlockCloser: String? = null
        var openPackage: String? = null
        val packages = mutableListOf<PumlPackage>()
        val noteReader = PumlNoteReader()

        fun flushPostambleAsUnsupported() {
            if (postamble.isNotEmpty()) {
                unsupported += postamble
                postamble.clear()
            }
        }

        for (raw in body) {
            val trimmed = raw.trim()

            if (openType != null) {
                if (trimmed == "}") {
                    types += openType.toPumlType()
                    openType = null
                } else {
                    // Everything inside the braces is kept verbatim, separators and blank lines
                    // included. A separator used to go to `residual.unsupported`, which the
                    // exporter writes *after* every type — so it was hoisted out of the class it
                    // divided and landed at the bottom of the file.
                    openType.bodyLines += trimmed
                    if (trimmed.isNotEmpty() && !SEPARATOR_LINE.matches(trimmed)) {
                        val member = parseMemberText(trimmed)
                        val apollonMember = PumlMember(member.toApollonName(), member.isMethod, member.isAbstractModifier)
                        if (member.isMethod) openType.methods += apollonMember else openType.attributes += apollonMember
                    }
                }
                continue
            }

            if (openBlockCloser != null) {
                unsupported += raw
                if (trimmed.equals(openBlockCloser, ignoreCase = true)) {
                    openBlockCloser = null
                }
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

            if (trimmed.isEmpty() || isTierA(trimmed)) {
                if (!sawMapped) preamble += raw else postamble += raw
                continue
            }

            if (openPackage != null && trimmed == "}") {
                openPackage = null
                continue
            }

            val packageMatch = matchDeclaration(PACKAGE_DECL, trimmed)
            if (packageMatch != null && packageMatch.opensBody && openPackage == null) {
                flushPostambleAsUnsupported()
                sawMapped = true
                packages += PumlPackage(packageMatch.displayName)
                openPackage = packageMatch.displayName
                continue
            }

            val typeMatch = TYPE_DECL.find(trimmed)
            if (typeMatch != null) {
                flushPostambleAsUnsupported()
                val keyword = typeMatch.groupValues[1].lowercase().replace(Regex("\\s+"), " ")
                val name0 = typeMatch.groupValues[2].ifEmpty { typeMatch.groupValues[3] }
                val alias = typeMatch.groupValues[4].ifEmpty { null }
                val stereotype = typeMatch.groupValues[5].trim().ifEmpty { null }
                val opensBody = typeMatch.groupValues[6] == "{"
                sawMapped = true
                val kind =
                    when (keyword) {
                        "abstract class", "abstract" -> PumlKind.ABSTRACT_CLASS
                        "interface" -> PumlKind.INTERFACE
                        "enum" -> PumlKind.ENUM
                        "entity" -> PumlKind.ENTITY
                        else -> PumlKind.CLASS
                    }
                if (opensBody) {
                    openType = OpenType(name0, kind, keyword, openPackage, alias, stereotype)
                } else {
                    types += PumlType(name0, kind, emptyList(), emptyList(), keyword, openPackage, alias, stereotype)
                }
                continue
            }

            val relation = tryParseRelation(trimmed)
            if (relation != null) {
                flushPostambleAsUnsupported()
                sawMapped = true
                relationLines += relation to raw
                continue
            }

            val lower = trimmed.lowercase()
            // Note syntax [PumlNoteReader] did not recognise — `note over A, B`, a legend-style
            // `note left :` with no anchor. Kept verbatim rather than guessed at.
            if (lower.startsWith("note") && !trimmed.contains(":")) {
                flushPostambleAsUnsupported()
                unsupported += raw
                openBlockCloser = "end note"
                continue
            }
            // `namespace`/`together` still go through verbatim: the first has semantics (a name
            // scope that qualifies the classes inside it) the canvas has no field for, and the
            // second is a layout hint, not a container. Only `package` maps to a real node.
            if ((lower.startsWith("namespace ") || lower.startsWith("together")) && trimmed.endsWith("{")) {
                flushPostambleAsUnsupported()
                unsupported += raw
                openBlockCloser = "}"
                continue
            }

            flushPostambleAsUnsupported()
            unsupported += raw
        }

        openType?.let { unsupported += "' Architect Studio: unterminated ${it.keyword} ${it.name}" }

        val relations = resolveRelations(relationLines, types, packages, unsupported)

        val residual =
            PumlResidual(
                startLine = startLine,
                endLine = endLine,
                eol = eol,
                indent = indent,
                preamble = preamble,
                postamble = postamble,
                unsupported = unsupported,
            )
        val diagram = PumlDiagram(name, types, relations, packages, noteReader.result())
        return PumlParseResult.Parsed(diagram, residual, unsupported.count { it.isNotBlank() })
    }

    /**
     * Gives every relation two endpoints the canvas can actually draw, or gives up on the relation
     * loudly rather than quietly.
     *
     * PlantUML declares a classifier implicitly the first time a relation names it — `Order -->
     * Customer` on its own is a two-class diagram there — so an endpoint with no declaration of its
     * own is added to [types] as a plain `class`. Before this the relation was parsed, found no
     * node to attach to in [ApollonModelMapper], and was dropped from the model, the export and the
     * validator's comparison all at once: the line vanished from the file with no warning.
     *
     * The one endpoint that cannot be declared is one whose name already appears inside a construct
     * this parser kept verbatim — a `namespace` body, say — since declaring it again would collide
     * with the copy the residual is about to write back. That relation's own line goes to
     * [unsupported] instead, so it too survives untouched.
     */
    private fun resolveRelations(
        relationLines: List<Pair<PumlRelation, String>>,
        types: MutableList<PumlType>,
        packages: List<PumlPackage>,
        unsupported: MutableList<String>,
    ): List<PumlRelation> {
        if (relationLines.isEmpty()) return emptyList()
        val declared = (types.map { it.refId } + packages.map { it.name }).toMutableSet()
        val spokenFor = unsupported.flatMap { line -> IDENT.findAll(line).map { it.value } }.toSet()

        val kept = mutableListOf<PumlRelation>()
        relationLines.forEach { (relation, raw) ->
            val missing = listOf(relation.sourceName, relation.targetName).filterNot { it in declared }
            if (missing.any { it in spokenFor }) {
                unsupported += raw
                return@forEach
            }
            missing.distinct().forEach { name ->
                types += PumlType(name, PumlKind.CLASS, emptyList(), emptyList(), "class")
                declared += name
            }
            kept += relation
        }
        return kept
    }

    private fun looksNonClass(body: List<String>): Boolean {
        if (body.any { line -> NON_CLASS_MARKERS.any { line.trim().lowercase().startsWith(it) } }) return true
        return body.any { line ->
            val t = line.trim().lowercase()
            t.startsWith("participant ") || t.startsWith("actor ") || t.startsWith("usecase ")
        }
    }

    private fun isTierA(trimmed: String): Boolean {
        if (trimmed.startsWith("'")) return true
        val lower = trimmed.lowercase()
        return TIER_A_PREFIXES.any { lower.startsWith(it) }
    }

    private fun isQuoted(token: String) = token.length >= 2 && token.startsWith("\"") && token.endsWith("\"")

    private fun unquote(token: String) = if (isQuoted(token)) token.substring(1, token.length - 1) else token

    private fun tryParseRelation(line: String): PumlRelation? {
        val tokens = TOKEN.findAll(line).map { it.value }.toList()
        val arrowIndices = tokens.indices.filter { classifyArrow(tokens[it]) != null }
        if (arrowIndices.size != 1) return null
        val arrowIdx = arrowIndices[0]
        if (arrowIdx <= 0 || arrowIdx >= tokens.size - 1) return null
        val info = classifyArrow(tokens[arrowIdx]) ?: return null

        val leftTokens = tokens.subList(0, arrowIdx)
        if (leftTokens.isEmpty() || leftTokens.size > 2) return null
        val leftName = leftTokens[0]
        val leftLabelToken = leftTokens.getOrNull(1)
        if (leftLabelToken != null && !isQuoted(leftLabelToken)) return null

        val rightAll = tokens.subList(arrowIdx + 1, tokens.size)
        val colonIdx = rightAll.indexOf(":")
        val rightSide = if (colonIdx >= 0) rightAll.subList(0, colonIdx) else rightAll
        val trailing = if (colonIdx >= 0) rightAll.subList(colonIdx + 1, rightAll.size) else emptyList()
        if (rightSide.isEmpty() || rightSide.size > 2) return null
        // Unlike the left side (`Name "label"`), PlantUML puts the right side's label BEFORE its
        // class name (`"label" Name`) — mirror-imaged around the arrow.
        val rightLabelToken = if (rightSide.size == 2) rightSide[0] else null
        val rightName = rightSide.last()
        if (rightLabelToken != null && !isQuoted(rightLabelToken)) return null

        if (isQuoted(leftName) || isQuoted(rightName)) return null
        if (!IDENT.matches(leftName) || !IDENT.matches(rightName)) return null

        val (leftMult, leftRole) = splitEndLabel(leftLabelToken?.let { unquote(it) } ?: "")
        val (rightMult, rightRole) = splitEndLabel(rightLabelToken?.let { unquote(it) } ?: "")
        val label = trailing.joinToString(" ")

        val sourceName: String
        val targetName: String
        val sourceMult: String
        val sourceRole: String
        val targetMult: String
        val targetRole: String
        when (info.decoratedSide) {
            Side.LEFT -> {
                targetName = leftName
                sourceName = rightName
                targetMult = leftMult
                targetRole = leftRole
                sourceMult = rightMult
                sourceRole = rightRole
            }
            Side.RIGHT -> {
                targetName = rightName
                sourceName = leftName
                targetMult = rightMult
                targetRole = rightRole
                sourceMult = leftMult
                sourceRole = leftRole
            }
            Side.NONE -> {
                sourceName = leftName
                targetName = rightName
                sourceMult = leftMult
                sourceRole = leftRole
                targetMult = rightMult
                targetRole = rightRole
            }
        }
        return PumlRelation(sourceName, targetName, info.kind, sourceMult, sourceRole, targetMult, targetRole, label, tokens[arrowIdx])
    }
}

private data class OpenType(
    val name: String,
    val kind: PumlKind,
    val keyword: String,
    val parentName: String?,
    val alias: String?,
    val stereotype: String?,
    val attributes: MutableList<PumlMember> = mutableListOf(),
    val methods: MutableList<PumlMember> = mutableListOf(),
    val bodyLines: MutableList<String> = mutableListOf(),
) {
    fun toPumlType() =
        PumlType(name, kind, attributes.toList(), methods.toList(), keyword, parentName, alias, stereotype, bodyLines.toList())
}

