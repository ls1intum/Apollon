package de.tum.cit.aet.apollon.puml

/**
 * A `.puml` file's own name/type/description, over and above whatever [DiagramTypeDetector] can
 * infer from grammar. [type] is one of [DiagramTypeCatalog.ENTRIES]'s tags, or `null` for a file
 * that has never been given one.
 */
data class PumlDiagramMetadata(val type: String?, val name: String?, val description: String?)

/**
 * Reads and writes [PumlDiagramMetadata] as a single PlantUML comment line, right after
 * `@startuml`. A comment is the natural home for this: every family's importer treats a line
 * starting with `'` as Tier-A (see `PlantUmlImporter.isTierA`), so it lands in
 * [PumlResidual.preamble] and is reproduced verbatim on every canvas-driven save with no changes to
 * any importer or exporter — and [DiagramTypeDetector] already drops `'` lines before classifying a
 * file's grammar, so this can never be mistaken for diagram content.
 *
 * Parsing works directly off the raw document text rather than the Apollon-model round trip, so it
 * works for every family, including ones this plugin has no importer for yet.
 */
object PumlDiagramMetadataCodec {
    private const val MARKER = "@architect-studio-diagram"
    private val LINE = Regex("""^'\s*$MARKER\b(.*)$""")
    private val FIELD = Regex("""(type|name|description)="([^"]*)"""")

    fun parse(text: String): PumlDiagramMetadata {
        val tail =
            text.lineSequence()
                .map { it.trim() }
                .firstNotNullOfOrNull { line -> LINE.find(line)?.groupValues?.get(1) }
                ?: return PumlDiagramMetadata(null, null, null)
        val fields = FIELD.findAll(tail).associate { it.groupValues[1] to it.groupValues[2] }
        return PumlDiagramMetadata(fields["type"], fields["name"], fields["description"])
    }

    fun renderLine(metadata: PumlDiagramMetadata): String {
        val fields =
            buildList {
                metadata.type?.let { add("type=\"${sanitize(it)}\"") }
                add("name=\"${sanitize(metadata.name ?: "")}\"")
                add("description=\"${sanitize(metadata.description ?: "")}\"")
            }
        return "' $MARKER ${fields.joinToString(" ")}"
    }

    /** Insert [metadata] as the line right after `@startuml`, replacing this file's existing
     *  metadata line if it already has one. Returns [text] unchanged if it has no `@startuml`. */
    fun withMetadata(
        text: String,
        metadata: PumlDiagramMetadata,
    ): String {
        val lines = text.lines().toMutableList()
        val existingIndex = lines.indexOfFirst { LINE.containsMatchIn(it.trim()) }
        if (existingIndex >= 0) {
            lines[existingIndex] = renderLine(metadata)
            return lines.joinToString("\n")
        }
        val startIndex = lines.indexOfFirst { it.trim().startsWith("@startuml") }
        if (startIndex < 0) return text
        lines.add(startIndex + 1, renderLine(metadata))
        return lines.joinToString("\n")
    }

    private fun sanitize(value: String): String = value.replace("\"", "").replace("\n", " ")
}
