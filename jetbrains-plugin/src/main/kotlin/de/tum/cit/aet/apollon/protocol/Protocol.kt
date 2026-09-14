package de.tum.cit.aet.apollon.protocol

import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

/** Wire field names shared by more than one message on either side of [toJson]/[parseWebviewMessage]. */
private const val FIELD_TYPE = "type"
private const val FIELD_MODEL = "model"
private const val FIELD_AUTO_EXPORT = "autoExport"
private const val FIELD_REQUEST_ID = "requestId"
private const val FIELD_FORMAT = "format"
private const val FIELD_REASON = "reason"
private const val FIELD_DIAGRAM_TYPES = "diagramTypes"

/**
 * Host <-> webview wire contract, hand-mirrored from the VS Code extension's
 * `shared/protocol.ts` (and its own webview copy of the same file). There is
 * no shared package between a Gradle/Kotlin build and a Vite/TypeScript
 * build, so the two sides are kept in sync by convention, not by import —
 * change one, change the other.
 */
enum class ExportFormat {
    svg,
    png,
}

enum class AutoExport {
    off,
    svg,
    png,
}

/** Host -> webview. */
sealed interface HostMessage {
    /**
     * [diagramTypes] narrows the empty-file picker to the types the *host* can persist, and is only
     * meaningful when [model] is `null`. A `.apollon` file sends `null` here, meaning "every type";
     * a `.puml` sends [de.tum.cit.aet.apollon.puml.PumlScaffold.diagramTypes], because the other
     * eight have no PlantUML exporter and would be unsaveable the moment they were drawn.
     */
    data class Init(
        val model: JsonElement?,
        val autoExport: AutoExport,
        val diagramTypes: List<String>? = null,
    ) : HostMessage

    data class Invalid(val reason: String) : HostMessage

    data class AutoExportChanged(val autoExport: AutoExport) : HostMessage

    data class ExternalUpdate(val model: JsonElement?) : HostMessage

    data class Export(val format: ExportFormat, val requestId: Int) : HostMessage
}

fun HostMessage.toJson(): JsonObject =
    when (this) {
        is HostMessage.Init ->
            buildJsonObject {
                put(FIELD_TYPE, "init")
                put(FIELD_MODEL, model ?: JsonNull)
                put(FIELD_AUTO_EXPORT, autoExport.name)
                // Omitted rather than sent as null when unrestricted, so the webview's
                // `?? diagramTypeEntries()` fallback covers both this and an older host.
                diagramTypes?.let { types ->
                    put(FIELD_DIAGRAM_TYPES, JsonArray(types.map { JsonPrimitive(it) }))
                }
            }
        is HostMessage.Invalid ->
            buildJsonObject {
                put(FIELD_TYPE, "invalid")
                put(FIELD_REASON, reason)
            }
        is HostMessage.AutoExportChanged ->
            buildJsonObject {
                put(FIELD_TYPE, "autoExportChanged")
                put(FIELD_AUTO_EXPORT, autoExport.name)
            }
        is HostMessage.ExternalUpdate ->
            buildJsonObject {
                put(FIELD_TYPE, "externalUpdate")
                put(FIELD_MODEL, model ?: JsonNull)
            }
        is HostMessage.Export ->
            buildJsonObject {
                put(FIELD_TYPE, "export")
                put(FIELD_FORMAT, format.name)
                put(FIELD_REQUEST_ID, requestId)
            }
    }

fun HostMessage.toJsonString(): String = Json.encodeToString(JsonObject.serializer(), toJson())

/** Webview -> host. */
sealed interface WebviewMessage {
    data object Ready : WebviewMessage

    data class ModelChanged(val model: JsonObject) : WebviewMessage

    data class Create(val diagramType: String) : WebviewMessage

    data object ReopenAsText : WebviewMessage

    data object ConfigureAutoExport : WebviewMessage

    data class ExportResult(val requestId: Int, val format: ExportFormat, val payload: String) :
        WebviewMessage

    data class ExportFailed(val requestId: Int, val reason: String) : WebviewMessage
}

class ProtocolException(message: String) : Exception(message)

/** Parses one JSON-encoded [WebviewMessage] as posted by the webview bridge. */
fun parseWebviewMessage(text: String): WebviewMessage {
    val root =
        try {
            Json.parseToJsonElement(text)
        } catch (e: SerializationException) {
            throw ProtocolException("malformed webview message: ${e.message}")
        }
    if (root !is JsonObject) {
        throw ProtocolException("webview message is not a JSON object")
    }
    return when (val type = root[FIELD_TYPE]?.jsonPrimitive?.content) {
        "ready" -> WebviewMessage.Ready
        "modelChanged" ->
            WebviewMessage.ModelChanged(
                root[FIELD_MODEL] as? JsonObject
                    ?: throw ProtocolException("modelChanged without a model"),
            )
        "create" ->
            WebviewMessage.Create(
                root["diagramType"]?.jsonPrimitive?.content
                    ?: throw ProtocolException("create without a diagramType"),
            )
        "reopenAsText" -> WebviewMessage.ReopenAsText
        "configureAutoExport" -> WebviewMessage.ConfigureAutoExport
        "exportResult" ->
            WebviewMessage.ExportResult(
                requestId = root.intField(FIELD_REQUEST_ID),
                format = ExportFormat.valueOf(root[FIELD_FORMAT]!!.jsonPrimitive.content),
                payload = root["payload"]!!.jsonPrimitive.content,
            )
        "exportFailed" ->
            WebviewMessage.ExportFailed(
                requestId = root.intField(FIELD_REQUEST_ID),
                reason = root[FIELD_REASON]?.jsonPrimitive?.content ?: "unknown error",
            )
        else -> throw ProtocolException("unknown webview message type: $type")
    }
}

private fun JsonObject.intField(key: String): Int =
    (this[key] as? JsonPrimitive)?.content?.toIntOrNull()
        ?: throw ProtocolException("missing or non-numeric field: $key")
