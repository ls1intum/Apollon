package de.tum.cit.aet.apollon.document

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import java.util.UUID

/** The `UMLModel` wire-format line this plugin reads and writes. */
private const val MODEL_SCHEMA_VERSION = "4.0.0"

/** Older `.apollon` files nest the model under this key alongside app metadata. */
private const val MODEL_KEY = "model"

class DiagramParseError(message: String) : Exception(message)

/**
 * What a document holds, as a value rather than an exception. An empty file is
 * not a failure: it is a diagram waiting to be chosen, and the canvas says so.
 */
sealed interface DocumentState {
    data object Empty : DocumentState

    data class Model(val model: JsonObject) : DocumentState

    data class Invalid(val reason: String) : DocumentState
}

private fun isWrapped(root: JsonElement): Boolean = root is JsonObject && MODEL_KEY in root

/** Reads the model out of a `.apollon` document's text, wrapped or bare. */
fun parseModel(text: String): JsonObject {
    val root =
        try {
            Json.parseToJsonElement(text)
        } catch (e: Exception) {
            throw DiagramParseError("not valid JSON")
        }
    val candidate = if (isWrapped(root)) root.jsonObject[MODEL_KEY] else root
    val type = (candidate as? JsonObject)?.get("type")
    if (candidate !is JsonObject || type !is JsonPrimitive || !type.isString) {
        throw DiagramParseError("no UML model with a `type` field")
    }
    return candidate
}

fun readDocument(text: String): DocumentState {
    if (text.isBlank()) {
        return DocumentState.Empty
    }
    return try {
        DocumentState.Model(parseModel(text))
    } catch (e: DiagramParseError) {
        DocumentState.Invalid(e.message ?: "invalid")
    }
}

data class Formatting(val indent: String, val eol: String)

/** Match the document's own indentation and line endings rather than imposing ours. */
fun detectFormatting(text: String): Formatting {
    val eol = if (text.contains("\r\n")) "\r\n" else "\n"
    val indent = Regex("\n([ \t]+)\\S").find(text)?.groupValues?.get(1)
    return Formatting(indent ?: "  ", eol)
}

/**
 * The bytes to write for `model` given the document's current text.
 *
 * The VS Code extension edits only the model's own byte range via
 * `jsonc-parser`, preserving sibling keys, key order and untouched formatting
 * exactly. There is no Kotlin equivalent of that library, so this rewrites
 * the whole document instead (Option A from the implementation plan): sibling
 * keys of a legacy wrapped file survive with their *values* and relative
 * order intact (rebuilt via [JsonObject], which preserves insertion order),
 * but comments, trailing commas and this-key's-exact-original-formatting do
 * not. A `.apollon` file this plugin has written is always the bare shape;
 * only a file it merely opens once (written by an older tool) can still be
 * wrapped, and normalizes to bare the first time this plugin edits it.
 */
fun writeDocumentText(
    existingText: String,
    model: JsonObject,
): String {
    val formatting = detectFormatting(existingText)
    val root =
        if (existingText.isBlank()) {
            null
        } else {
            runCatching { Json.parseToJsonElement(existingText) }.getOrNull()
        }
    val output: JsonObject =
        if (root is JsonObject && MODEL_KEY in root) {
            JsonObject(root.toMutableMap().apply { put(MODEL_KEY, model) })
        } else {
            model
        }
    val printer = Json { prettyPrint = true; prettyPrintIndent = formatting.indent }
    val body = printer.encodeToString(JsonObject.serializer(), output)
    val withEol = if (formatting.eol == "\r\n") body.replace("\n", "\r\n") else body
    return "$withEol${formatting.eol}"
}

/** The model a brand-new diagram starts from. */
fun scaffoldModel(
    diagramType: String,
    title: String,
): JsonObject =
    buildJsonObject {
        put("version", MODEL_SCHEMA_VERSION)
        put("id", UUID.randomUUID().toString())
        put("title", title)
        put("type", diagramType)
        put("nodes", buildJsonArray {})
        put("edges", buildJsonArray {})
        put("assessments", buildJsonObject {})
    }

/** [scaffoldModel] as the bytes of a new `.apollon` file. */
fun scaffoldDocument(
    diagramType: String,
    title: String,
): String = writeDocumentText("", scaffoldModel(diagramType, title))

/** Sibling image path for a diagram — `diagram.apollon` -> `diagram.svg`. */
fun exportTargetPath(
    path: String,
    extension: String,
): String = Regex("\\.[^./\\\\]*$").replace(path, "") + ".$extension"

/** The diagram a path names — `.../orders.apollon` -> `orders`. */
fun diagramTitle(path: String): String =
    path.substringAfterLast('/').replace(Regex("\\.apollon$", RegexOption.IGNORE_CASE), "")
