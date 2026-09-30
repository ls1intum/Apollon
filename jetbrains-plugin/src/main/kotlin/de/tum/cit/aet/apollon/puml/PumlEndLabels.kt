package de.tum.cit.aet.apollon.puml

/** A PlantUML end label (`"1"`, `"* items"`, `"owner"`, ...) split into Apollon's separate
 *  multiplicity/role fields, and the exact inverse for export. `joinEndLabel(splitEndLabel(x))
 *  == x.trim()` for every `x` — that invariant is the determinism proof (see `EndLabelTest`). */
// The range alternative must come before the bare-digit one: Java/Kotlin regex alternation takes
// the first alternative that matches at all, not the longest, so "\d+" alone would otherwise win
// over "\d+..\d+" and truncate "1..*" down to just "1".
private val MULTIPLICITY = Regex("""^(\*|\d+\s*\.\.\s*(\d+|\*)|\d+)""")

fun splitEndLabel(raw: String): Pair<String, String> {
    val trimmed = raw.trim()
    val match = MULTIPLICITY.find(trimmed) ?: return "" to trimmed
    val rest = trimmed.substring(match.value.length).trim()
    return match.value to rest
}

fun joinEndLabel(
    multiplicity: String,
    role: String,
): String = listOf(multiplicity.trim(), role.trim()).filter { it.isNotEmpty() }.joinToString(" ")
