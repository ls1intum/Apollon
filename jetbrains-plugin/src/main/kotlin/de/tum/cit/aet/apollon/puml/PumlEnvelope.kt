package de.tum.cit.aet.apollon.puml

/**
 * The `@startuml`/`@enduml` envelope shared by every PlantUML diagram family, regardless of what's
 * inside it: which line starts/ends the diagram, the file's line ending and body indentation, and
 * the raw body lines to hand to a family-specific parser. Extracted so [DiagramTypeDetector] and
 * every new family importer (`Object`/`UseCase`/`Component`/`Deployment` — plan §9) share one
 * implementation of this instead of five. [PlantUmlImporter] (Class) predates this file and keeps
 * its own inline copy of the same logic rather than being risked for a cosmetic refactor.
 */
data class PumlEnvelope(
    val startLine: String,
    val endLine: String,
    val eol: String,
    val indent: String,
    val body: List<String>,
)

object PumlEnvelopeReader {
    fun read(text: String): PumlEnvelope? {
        val eol = if (text.contains("\r\n")) "\r\n" else "\n"
        val lines = text.split(Regex("\r\n|\n"))
        val startIdx = lines.indexOfFirst { it.trim().lowercase().startsWith("@startuml") }
        val endIdx = lines.indexOfLast { it.trim().lowercase().startsWith("@enduml") }
        if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) return null

        val startLine = lines[startIdx].trim()
        val endLine = lines[endIdx].trim()
        val body = lines.subList(startIdx + 1, endIdx)
        val indent = body.firstNotNullOfOrNull { line -> Regex("^([ \t]+)\\S").find(line)?.groupValues?.get(1) } ?: "  "
        return PumlEnvelope(startLine, endLine, eol, indent, body)
    }
}
