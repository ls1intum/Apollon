package de.tum.cit.aet.apollon.puml

/**
 * The `@startuml`...`@enduml` envelope of a `.puml` file, split from its body — shared by
 * [DiagramTypeDetector] and every non-Class family importer (plan §7's router). [PlantUmlImporter]
 * (the Class-diagram pipeline) keeps its own copy of this extraction inline rather than being
 * changed to use this one: it is already shipped and tested, and this file changing shape must
 * never be able to regress it (plan §7.1).
 */
data class PumlBlock(
    val name: String?,
    val startLine: String,
    val endLine: String,
    val eol: String,
    val indent: String,
    val body: List<String>,
)

object PumlBlockExtractor {
    fun extract(text: String): PumlBlock? {
        val eol = if (text.contains("\r\n")) "\r\n" else "\n"
        val lines = text.split(Regex("\r\n|\n"))
        val startIdx = lines.indexOfFirst { it.trim().lowercase().startsWith("@startuml") }
        val endIdx = lines.indexOfLast { it.trim().lowercase().startsWith("@enduml") }
        if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) return null

        val startLine = lines[startIdx].trim()
        val endLine = lines[endIdx].trim()
        val name = startLine.removePrefix("@startuml").trim().ifEmpty { null }
        val body = lines.subList(startIdx + 1, endIdx)
        val indent = body.firstNotNullOfOrNull { line -> Regex("^([ \t]+)\\S").find(line)?.groupValues?.get(1) } ?: "  "
        return PumlBlock(name, startLine, endLine, eol, indent, body)
    }
}
