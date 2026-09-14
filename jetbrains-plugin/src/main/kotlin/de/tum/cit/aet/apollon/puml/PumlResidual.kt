package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

/**
 * Everything a `.puml` file's own PlantUML source contains that the Apollon canvas cannot
 * represent, so that a save preserves it rather than dropping it.
 *
 * Every field here is re-derived from the source text on each import, so this is never persisted:
 * [de.tum.cit.aet.apollon.document.PumlDocumentBridge] holds one in memory for the open editor and
 * refreshes it whenever the document changes. Geometry, which *cannot* be re-derived, goes to
 * [PumlLayoutSidecar] instead.
 *
 * `@Serializable` is not available here — the `kotlin-serialization` compiler plugin is not
 * applied to this module (only the runtime library is on the classpath) — so this hand-rolls
 * the JSON the same way `document/DiagramDocument.kt` and `protocol/Protocol.kt` already do.
 */
data class PumlResidual(
    val startLine: String,
    val endLine: String,
    val eol: String,
    val indent: String,
    val preamble: List<String> = emptyList(),
    val postamble: List<String> = emptyList(),
    val unsupported: List<String> = emptyList(),
    /** nodeId -> the exact source keyword ("class", "abstract class", "interface", "enum", "entity"). */
    val typeKeywords: Map<String, String> = emptyMap(),
    /** edgeId -> the exact source arrow token ("-->", "--->", "<|..", ...). */
    val arrowTokens: Map<String, String> = emptyMap(),
    /** nodeId -> the source-level `as <alias>` identifier, for every family whose display name may
     *  be a quoted phrase rather than a bare identifier (Class/UseCase/Component/Deployment). A
     *  node reusing the same alias across saves is what keeps the generated PlantUML's diff small
     *  instead of renumbering aliases every export (plan § canonical-vs-generated-source). */
    val elementAliases: Map<String, String> = emptyMap(),
    /** nodeId -> the `<<stereotype>>`s on a class declaration, verbatim. The canvas reserves its
     *  own `stereotype` field for `interface`/`enumeration`, so a free-form one is carried here
     *  rather than modelled — see [PumlType.stereotype]. */
    val typeStereotypes: Map<String, String> = emptyMap(),
    /** nodeId -> the lines of a class body exactly as the source wrote them, newline-joined. Lets
     *  a save that left a class's members alone reproduce its body byte for byte — see
     *  [PumlType.bodySource]. */
    val typeBodies: Map<String, String> = emptyMap(),
    /** A sequence diagram's lifeline-declaration region exactly as written — `box`/`end box`
     *  wrappers, indentation and blank lines included. Reproduced verbatim while it still declares
     *  the same lifelines the canvas holds; see [PlantUmlSequenceExporter]. */
    val sequenceHeader: List<String> = emptyList(),
    /** Anchor key -> that message's own line, verbatim. A message inside an `alt` is indented and
     *  a file may write `A -> B: x` or `A -> B : x`; neither is anything the canvas models, so the
     *  line is reproduced as written while it still says the same thing. */
    val messageLines: Map<String, String> = emptyMap(),
    /** Anchor key -> the lines that followed that message, newline-joined and in source order.
     *  Insertion-ordered, which is what lets the exporter put back a block whose own message has
     *  since been deleted. Keys come from [SequenceAnchorKeys]; [SEQUENCE_HEAD_ANCHOR] holds the
     *  ones that came before every message. */
    val anchoredLines: Map<String, String> = emptyMap(),
    /** Activity anchor key -> the lines that stood immediately before that step, trimmed and
     *  newline-joined: swimlane markers, notes, colour directives, anything an activity source may
     *  carry that does not change the flow. Insertion-ordered, which is what lets
     *  [PlantUmlActivityExporter] flush a block whose own step has since been deleted along with the
     *  next surviving one instead of dropping it. [ACTIVITY_TAIL_ANCHOR] holds the ones that came
     *  after every step. */
    val activityAnchors: Map<String, String> = emptyMap(),
    /** The `partition`/`group` blocks an activity source wrapped its steps in, outermost first. See
     *  [PumlActivitySpan] for why these cannot travel in [activityAnchors] with everything else. */
    val activitySpans: List<PumlActivitySpan> = emptyList(),
    /** nodeId/edgeId -> the C4 macro arguments after the alias and label, verbatim and in source
     *  order. Keeping the whole list is what lets [C4Slots] change one of them — an edited
     *  technology or description — without disturbing the `$sprite`, `$tags` and `$link` around it,
     *  none of which an Apollon deployment node has a field for. See [PumlC4Element.extras]. */
    val c4Extras: Map<String, String> = emptyMap(),
    /** Which family's grammar produced this. C4 is the reason it exists: a C4 file maps onto
     *  Apollon's `DeploymentDiagram`, so the model's own `type` can no longer tell
     *  [PlantUmlDiagramExporter] which exporter to send it back through. */
    val family: DiagramFamily = DiagramFamily.OTHER,
) {
    fun toJson(): String {
        val obj =
            buildJsonObject {
                put("version", 1)
                put("startLine", startLine)
                put("endLine", endLine)
                put("eol", eol)
                put("indent", indent)
                put("preamble", stringArray(preamble))
                put("postamble", stringArray(postamble))
                put("unsupported", stringArray(unsupported))
                put("typeKeywords", stringMap(typeKeywords))
                put("arrowTokens", stringMap(arrowTokens))
                put("elementAliases", stringMap(elementAliases))
                put("typeStereotypes", stringMap(typeStereotypes))
                put("typeBodies", stringMap(typeBodies))
                put("sequenceHeader", stringArray(sequenceHeader))
                put("messageLines", stringMap(messageLines))
                put("anchoredLines", stringMap(anchoredLines))
                put("activityAnchors", stringMap(activityAnchors))
                put("activitySpans", spanArray(activitySpans))
                put("c4Extras", stringMap(c4Extras))
                put("family", family.name)
            }
        return Json { prettyPrint = true; prettyPrintIndent = "  " }.encodeToString(JsonObject.serializer(), obj) + "\n"
    }

    /**
     * The per-id source facts a fresh import just recomputed, folded back in.
     *
     * Every caller that imports and then exports has to do this, and each family only fills the
     * carriers it uses — so doing it in one place is what stops a family that gains a new carrier
     * from silently dropping it at whichever call site forgot to be updated.
     */
    fun withImported(mapped: MappedModel): PumlResidual =
        copy(
            typeKeywords = mapped.typeKeywords,
            arrowTokens = mapped.arrowTokens,
            elementAliases = mapped.elementAliases,
            typeStereotypes = mapped.typeStereotypes,
            typeBodies = mapped.typeBodies,
            c4Extras = mapped.c4Extras,
        )

    companion object {
        private const val CURRENT_VERSION = 1

        fun empty(): PumlResidual = PumlResidual(startLine = "@startuml", endLine = "@enduml", eol = "\n", indent = "  ")

        fun fromJson(text: String): PumlResidual {
            if (text.isBlank()) return empty()
            val root = Json.parseToJsonElement(text).jsonObject
            val version = (root["version"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: CURRENT_VERSION
            if (version > CURRENT_VERSION) {
                throw IllegalStateException("residual schema version $version is newer than this plugin supports")
            }
            return PumlResidual(
                startLine = root.stringOrDefault("startLine", "@startuml"),
                endLine = root.stringOrDefault("endLine", "@enduml"),
                eol = root.stringOrDefault("eol", "\n"),
                indent = root.stringOrDefault("indent", "  "),
                preamble = root.stringArray("preamble"),
                postamble = root.stringArray("postamble"),
                unsupported = root.stringArray("unsupported"),
                typeKeywords = root.stringMap("typeKeywords"),
                arrowTokens = root.stringMap("arrowTokens"),
                elementAliases = root.stringMap("elementAliases"),
                typeStereotypes = root.stringMap("typeStereotypes"),
                typeBodies = root.stringMap("typeBodies"),
                sequenceHeader = root.stringArray("sequenceHeader"),
                messageLines = root.stringMap("messageLines"),
                anchoredLines = root.stringMap("anchoredLines"),
                activityAnchors = root.stringMap("activityAnchors"),
                activitySpans = root.spanArray("activitySpans"),
                c4Extras = root.stringMap("c4Extras"),
                family =
                    runCatching { DiagramFamily.valueOf(root.stringOrDefault("family", DiagramFamily.OTHER.name)) }
                        .getOrDefault(DiagramFamily.OTHER),
            )
        }

        private fun stringArray(values: List<String>) = buildJsonArray { values.forEach { add(JsonPrimitive(it)) } }

        private fun stringMap(values: Map<String, String>) =
            buildJsonObject { values.forEach { (k, v) -> put(k, v) } }

        private fun spanArray(values: List<PumlActivitySpan>) =
            buildJsonArray {
                values.forEach { span ->
                    add(
                        buildJsonObject {
                            put("open", span.open)
                            put("close", span.close)
                            put("members", stringArray(span.members))
                        },
                    )
                }
            }

        private fun JsonObject.spanArray(key: String): List<PumlActivitySpan> =
            ((this[key] as? JsonArray) ?: JsonArray(emptyList())).mapNotNull { element ->
                val span = element as? JsonObject ?: return@mapNotNull null
                PumlActivitySpan(
                    open = span.stringOrDefault("open", ""),
                    close = span.stringOrDefault("close", ""),
                    members = span.stringArray("members"),
                )
            }

        private fun JsonObject.stringOrDefault(
            key: String,
            default: String,
        ): String = (this[key] as? JsonPrimitive)?.contentOrNull ?: default

        private fun JsonObject.stringArray(key: String): List<String> =
            ((this[key] as? JsonArray) ?: JsonArray(emptyList())).mapNotNull { (it as? JsonPrimitive)?.contentOrNull }

        private fun JsonObject.stringMap(key: String): Map<String, String> =
            ((this[key] as? JsonObject) ?: JsonObject(emptyMap())).entries.associate { (k, v) -> k to v.jsonPrimitive.content }
    }
}
