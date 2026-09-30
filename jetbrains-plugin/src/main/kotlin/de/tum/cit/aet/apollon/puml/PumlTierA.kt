package de.tum.cit.aet.apollon.puml

/**
 * "Known-safe, never shown on the canvas" line prefixes, shared by every family importer added
 * after Class — see [PumlRelationGrammar]'s doc comment for why [PlantUmlImporter] (Class) keeps
 * its own private copy instead of being refactored onto this.
 */
val SHARED_TIER_A_PREFIXES =
    listOf(
        "skinparam", "!include", "!theme", "!pragma", "!define", "title", "header", "footer",
        "hide ", "show ", "scale ", "left to right direction", "top to bottom direction", "allowmixing",
    )

val SHARED_TIER_A_SEPARATOR_LINE = Regex("""^[-.=_]{2,}.*""")

fun isTierALine(trimmed: String): Boolean {
    if (trimmed.startsWith("'")) return true
    val lower = trimmed.lowercase()
    return SHARED_TIER_A_PREFIXES.any { lower.startsWith(it) }
}
