package de.tum.cit.aet.apollon.protocol

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

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
    data class Init(val model: JsonElement?, val autoExport: AutoExport) : HostMessage

    data class Invalid(val reason: String) : HostMessage

    data class AutoExportChanged(val autoExport: AutoExport) : HostMessage

    data class ExternalUpdate(val model: JsonElement?) : HostMessage

    data class Export(val format: ExportFormat, val requestId: Int) : HostMessage
}

fun HostMessage.toJson(): JsonObject =
    when (this) {
        is HostMessage.Init ->
            buildJsonObject {
                put("type", "init")
                put("model", model ?: JsonNull)
                put("autoExport", autoExport.name)
            }
        is HostMessage.Invalid ->
            buildJsonObject {
                put("type", "invalid")
                put("reason", reason)
            }
        is HostMessage.AutoExportChanged ->
            buildJsonObject {
                put("type", "autoExportChanged")
                put("autoExport", autoExport.name)
            }
        is HostMessage.ExternalUpdate ->
            buildJsonObject {
                put("type", "externalUpdate")
                put("model", model ?: JsonNull)
            }
        is HostMessage.Export ->
            buildJsonObject {
                put("type", "export")
                put("format", format.name)
                put("requestId", requestId)
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
        } catch (e: Exception) {
            throw ProtocolException("malformed webview message: ${e.message}")
        }
    if (root !is JsonObject) {
        throw ProtocolException("webview message is not a JSON object")
    }
    return when (val type = root["type"]?.jsonPrimitive?.content) {
        "ready" -> WebviewMessage.Ready
        "modelChanged" ->
            WebviewMessage.ModelChanged(
                root["model"] as? JsonObject
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
                requestId = root.intField("requestId"),
                format = ExportFormat.valueOf(root["format"]!!.jsonPrimitive.content),
                payload = root["payload"]!!.jsonPrimitive.content,
            )
        "exportFailed" ->
            WebviewMessage.ExportFailed(
                requestId = root.intField("requestId"),
                reason = root["reason"]?.jsonPrimitive?.content ?: "unknown error",
            )
        else -> throw ProtocolException("unknown webview message type: $type")
    }
}

private fun JsonObject.intField(key: String): Int =
    (this[key] as? JsonPrimitive)?.content?.toIntOrNull()
        ?: throw ProtocolException("missing or non-numeric field: $key")
