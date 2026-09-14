package de.tum.cit.aet.apollon.puml

/**
 * Shared member-line grammar for both directions of the converter.
 *
 * Apollon has no visibility/type/modifier fields on a member — the whole thing is free text
 * (`library/lib/constants.ts:420-470`, e.g. `"+ attribute: Type"`). PlantUML instead has real
 * syntax for it (`+name : Type`, `{static}`, `{abstract}`). This file is the one place that
 * knows how to go between the two textual conventions, so [PlantUmlImporter] and
 * [PlantUmlExporter] stay in exact agreement.
 */
private val MODIFIER_TOKEN = Regex("""\{(\w+)\}""")

/** A `--`/`..`/`==`/`__` compartment divider inside a class body. Not a member, and not something
 *  the canvas can hold — it survives through [PumlType.bodySource]. */
val SEPARATOR_LINE = Regex("""^[-.=_]{2,}.*""")

/** The members a class body's source lines declare, in the order they are written. Both sides of
 *  the converter read a body through this, so [PlantUmlExporter] can tell whether the canvas still
 *  agrees with the source it came from and reproduce it verbatim if so. */
fun membersIn(bodyLines: List<String>): List<PumlMember> =
    bodyLines.mapNotNull { line ->
        val trimmed = line.trim()
        if (trimmed.isEmpty() || SEPARATOR_LINE.matches(trimmed)) return@mapNotNull null
        val parsed = parseMemberText(trimmed)
        PumlMember(parsed.toApollonName(), parsed.isMethod, parsed.isAbstractModifier)
    }

data class ParsedMember(
    val visibility: String, // "", "+", "-", "#", "~"
    val modifiers: List<String>, // lowercase, "abstract" excluded (see isAbstractModifier)
    val isAbstractModifier: Boolean,
    val signature: String,
    val type: String?,
    val isMethod: Boolean,
)

/** Tolerant of any spacing — this is the read side of the grammar. */
fun parseMemberText(raw: String): ParsedMember {
    var text = raw.trim()
    val modifiers = mutableListOf<String>()
    var isAbstractModifier = false
    text =
        MODIFIER_TOKEN.replace(text) { m ->
            val token = m.groupValues[1].lowercase()
            if (token == "abstract") isAbstractModifier = true else modifiers += token
            " "
        }
    text = text.trim().replace(Regex("\\s+"), " ")
    var visibility = ""
    if (text.isNotEmpty() && text[0] in "+-#~") {
        visibility = text[0].toString()
        text = text.substring(1).trimStart()
    }
    val isMethod = text.contains("(")
    val (signature, type) = splitSignatureAndType(text)
    return ParsedMember(visibility, modifiers, isAbstractModifier, signature.trim(), type?.trim(), isMethod)
}

/** Splits on the first top-level (outside parentheses) colon — the return/field type separator. */
private fun splitSignatureAndType(rest: String): Pair<String, String?> {
    var depth = 0
    for (i in rest.indices) {
        when (rest[i]) {
            '(' -> depth++
            ')' -> depth--
            ':' -> if (depth == 0) return rest.substring(0, i).trim() to rest.substring(i + 1).trim()
        }
    }
    return rest.trim() to null
}

/** Apollon's own canonical spacing: `<vis> [{mod} ]signature[: type]`. */
fun ParsedMember.toApollonName(): String =
    buildString {
        if (visibility.isNotEmpty()) {
            append(visibility)
            append(' ')
        }
        if (modifiers.isNotEmpty()) {
            append(modifiers.joinToString(" ") { "{$it}" })
            append(' ')
        }
        append(signature)
        if (!type.isNullOrEmpty()) {
            append(": ")
            append(type)
        }
    }

/** PlantUML's own canonical spacing: `[{abstract} ]<vis>[ {mod} ]signature[ : type]`. */
fun ParsedMember.toPumlLine(isAbstract: Boolean): String =
    buildString {
        if (isAbstract) append("{abstract} ")
        append(visibility)
        if (modifiers.isNotEmpty()) {
            if (isNotEmpty()) append(' ')
            append(modifiers.joinToString(" ") { "{$it}" })
            append(' ')
        }
        append(signature)
        if (!type.isNullOrEmpty()) {
            append(" : ")
            append(type)
        }
    }
