package de.tum.cit.aet.apollon.puml

/**
 * Arrow-token grammar shared by [PlantUmlImporter] and [PlantUmlExporter] (plan §D3). The
 * Apollon canvas always puts the relationship's decoration (triangle/diamond/arrowhead) on the
 * edge's `target` node (`library/lib/utils/edgeUtils.ts:183-246`) — [decoratedSide] records
 * which side of the *original PlantUML line* carried it, which is exactly the information needed
 * to invert the mapping on export.
 */
enum class Side { LEFT, RIGHT, NONE }

data class ArrowInfo(val kind: PumlRelationKind, val decoratedSide: Side)

private val ARROW = Regex("""^(<\||<|o|\*)?(-{2,}|\.{2,})(\|>|>|o|\*)?$""")

/** Null for anything not in the supported grammar — including both-ends-decorated combinations
 *  like `<-->` or `<|--|>`, which are deliberately Tier B (plan §D3). */
fun classifyArrow(token: String): ArrowInfo? {
    val m = ARROW.matchEntire(token) ?: return null
    val left = m.groupValues[1]
    val body = m.groupValues[2]
    val right = m.groupValues[3]
    val isDot = body.startsWith(".")

    fun symbol(s: String) =
        when (s) {
            "<|", "|>" -> "TRIANGLE"
            "<", ">" -> "ARROW"
            "o" -> "CIRCLE"
            "*" -> "DIAMOND"
            else -> "NONE"
        }
    val leftSym = symbol(left)
    val rightSym = symbol(right)
    if (leftSym != "NONE" && rightSym != "NONE") return null

    val (symbol, side) =
        when {
            leftSym != "NONE" -> leftSym to Side.LEFT
            rightSym != "NONE" -> rightSym to Side.RIGHT
            else -> "NONE" to Side.NONE
        }
    val kind =
        when {
            symbol == "TRIANGLE" && !isDot -> PumlRelationKind.INHERITANCE
            symbol == "TRIANGLE" && isDot -> PumlRelationKind.REALIZATION
            symbol == "DIAMOND" && !isDot -> PumlRelationKind.COMPOSITION
            symbol == "CIRCLE" && !isDot -> PumlRelationKind.AGGREGATION
            symbol == "ARROW" && !isDot -> PumlRelationKind.UNIDIRECTIONAL
            symbol == "ARROW" && isDot -> PumlRelationKind.DEPENDENCY
            symbol == "NONE" && !isDot -> PumlRelationKind.BIDIRECTIONAL
            symbol == "NONE" && isDot -> PumlRelationKind.DEPENDENCY
            else -> return null
        }
    return ArrowInfo(kind, side)
}

/** The token a brand-new relation (no residual entry yet) is exported with — decoration on the
 *  right, so `source --|> target` reads left-to-right in the generated text. */
fun canonicalArrowToken(kind: PumlRelationKind): String =
    when (kind) {
        PumlRelationKind.INHERITANCE -> "--|>"
        PumlRelationKind.REALIZATION -> "..|>"
        PumlRelationKind.COMPOSITION -> "--*"
        PumlRelationKind.AGGREGATION -> "--o"
        PumlRelationKind.UNIDIRECTIONAL -> "-->"
        PumlRelationKind.BIDIRECTIONAL -> "--"
        PumlRelationKind.DEPENDENCY -> "..>"
    }
