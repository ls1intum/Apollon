package de.tum.cit.aet.apollon.puml

/**
 * The `Name "label" ARROW "label" Name : trailing` relation-line grammar, shared by every family
 * importer added after Class (Object/UseCase/Component/Deployment — plan §9). [PlantUmlImporter]
 * (Class) predates this file and keeps its own private copy of the same logic rather than being
 * risked for a cosmetic refactor — the two are intentionally kept in sync by hand, exactly like
 * [PumlArrows]/[PumlMemberText] already are shared without Class needing to change.
 *
 * Returns a generic [PumlRelation] — [PumlRelation.kind] is [PumlArrows.classifyArrow]'s
 * shape-only classification (which end has a triangle/circle/diamond/arrowhead, dotted or not).
 * What that shape *means* is family-specific (a dotted plain arrow is a class Dependency, a
 * Component Dependency, or half of a UseCase Include/Extend depending on trailing `<<stereotype>>`
 * text) — each family's importer/mapper interprets [kind] itself rather than this file guessing.
 */
private val IDENT = Regex("""[A-Za-z_][\w.$]*""")
private val TOKEN = Regex(""""[^"]*"|\S+""")

object PumlRelationGrammar {
    fun parseRelationLine(line: String): PumlRelation? {
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

    /**
     * The exact inverse of [parseRelationLine], shared render side: mirrors end-labels around
     * [token] the same way [PlantUmlExporter] (Class) does, but lets the caller supply [token] (its
     * own family-appropriate canonical arrow when [rel]'s own `arrowToken` is blank — a brand-new,
     * canvas-created relation) and [trailingLabel] (a family may override `rel.label`, e.g. UseCase
     * splicing in `<<include>>`).
     */
    fun renderRelationLine(
        rel: PumlRelation,
        token: String,
        trailingLabel: String = rel.label,
    ): String {
        val info = classifyArrow(token) ?: return renderRelationLine(rel, "--", trailingLabel)

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
        if (trailingLabel.isNotEmpty()) line += " : $trailingLabel"
        return line
    }

    fun quoteIfNeeded(name: String): String = if (BARE_IDENT.matches(name)) name else "\"$name\""

    private val BARE_IDENT = Regex("""^[A-Za-z_][\w.$]*$""")

    private fun isQuoted(token: String) = token.length >= 2 && token.startsWith("\"") && token.endsWith("\"")

    private fun unquote(token: String) = if (isQuoted(token)) token.substring(1, token.length - 1) else token
}
