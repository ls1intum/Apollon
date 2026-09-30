package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

private const val MODEL_SCHEMA_VERSION = "4.0.0"

data class ObjectPumlExport(val diagram: PumlObjectDiagram, val typeKeywords: Map<String, String>, val arrowTokens: Map<String, String>)

/** [PumlObjectDiagram] <-> Apollon `ObjectDiagram` JSON (`objectName` nodes, `ObjectLink` edges —
 *  `library/lib/types/nodes/NodeProps.ts:ObjectNodeProps`). Same merge-by-name-on-re-import
 *  discipline as [ApollonModelMapper] (Class), so re-importing an edited `.puml` keeps existing
 *  canvas layout/colour/ids for objects whose name didn't change. */
object ObjectModelMapper {
    fun toApollonModel(
        diagram: PumlObjectDiagram,
        previous: JsonObject?,
        title: String,
    ): MappedModel {
        val prevNodes = arrOf(previous?.get("nodes"))
        val prevEdges = arrOf(previous?.get("edges"))

        val prevIdByName = mutableMapOf<String, String>()
        val prevNodeById = mutableMapOf<String, JsonObject>()
        prevNodes.forEach { node ->
            val id = textOf(node["id"]) ?: return@forEach
            val name = textOf(objOf(node["data"])?.get("name")) ?: return@forEach
            prevIdByName[name] = id
            prevNodeById[id] = node
        }
        val prevNameById = prevIdByName.entries.associate { (name, id) -> id to name }

        val prevEdgesByKey = LinkedHashMap<String, MutableList<JsonObject>>()
        prevEdges.forEach { edge ->
            val srcName = prevNameById[textOf(edge["source"])] ?: return@forEach
            val tgtName = prevNameById[textOf(edge["target"])] ?: return@forEach
            prevEdgesByKey.getOrPut("$srcName|$tgtName") { mutableListOf() }.add(edge)
        }

        var maxBottom = 0
        prevNodes.forEach { node ->
            val y = numberOf(objOf(node["position"])?.get("y")) ?: 0
            val h = numberOf(node["height"]) ?: 0
            maxBottom = maxOf(maxBottom, y + h)
        }
        val originY = if (prevNodes.isEmpty()) 60 else maxBottom + 120
        val freshCount = diagram.objects.count { prevIdByName[it.name] == null }
        val freshPositions = PumlLayout.gridPositions(freshCount, 60, originY).iterator()

        val idByName = mutableMapOf<String, String>()
        val rectById = mutableMapOf<String, Rect>()
        val newNodes = mutableListOf<JsonObject>()

        diagram.objects.forEach { instance ->
            val existingId = prevIdByName[instance.name]
            val existing = existingId?.let { prevNodeById[it] }
            val id = existingId ?: UUID.randomUUID().toString()
            idByName[instance.name] = id

            val size = PumlLayout.sizeOfRows(instance.fields.size)
            val position =
                if (existing != null) {
                    objOf(existing["position"]) ?: buildJsonObject { put("x", 0); put("y", 0) }
                } else {
                    val p = freshPositions.next()
                    buildJsonObject { put("x", p.x); put("y", p.y) }
                }
            val width = if (existing != null) numberOf(existing["width"]) ?: size.width else size.width
            val height = if (existing != null) numberOf(existing["height"]) ?: size.height else size.height
            val existingData = existing?.let { objOf(it["data"]) }

            val data =
                buildJsonObject {
                    put("name", instance.name)
                    put("attributes", buildJsonArray { instance.fields.forEachIndexed { i, m -> add(fieldJson(m, existingData, i)) } })
                    put("methods", buildJsonArray {})
                    existingData?.get("fillColor")?.let { put("fillColor", it) }
                    existingData?.get("strokeColor")?.let { put("strokeColor", it) }
                    existingData?.get("textColor")?.let { put("textColor", it) }
                    existingData?.get("tags")?.let { put("tags", it) }
                }
            newNodes +=
                buildJsonObject {
                    put("id", id)
                    put("width", width)
                    put("height", height)
                    put("type", "objectName")
                    put("position", position)
                    put("data", data)
                    put("measured", buildJsonObject { put("width", width); put("height", height) })
                }
            rectById[id] = Rect(numberOf(position["x"]) ?: 0, numberOf(position["y"]) ?: 0, width, height)
        }

        val arrowTokens = mutableMapOf<String, String>()
        val consumed = mutableMapOf<String, Int>()
        val newEdges = mutableListOf<JsonObject>()
        diagram.relations.forEach { rel ->
            val sourceId = idByName[rel.sourceName] ?: return@forEach
            val targetId = idByName[rel.targetName] ?: return@forEach
            val key = "${rel.sourceName}|${rel.targetName}"
            val idx = consumed.getOrDefault(key, 0)
            consumed[key] = idx + 1
            val existing = prevEdgesByKey[key]?.getOrNull(idx)
            val id = existing?.let { textOf(it["id"]) } ?: UUID.randomUUID().toString()
            arrowTokens[id] = rel.arrowToken

            val handles =
                if (existing != null) {
                    (textOf(existing["sourceHandle"]) ?: "bottom") to (textOf(existing["targetHandle"]) ?: "top")
                } else {
                    val sr = rectById[sourceId]
                    val tr = rectById[targetId]
                    if (sr != null && tr != null) PumlLayout.chooseHandles(sr, tr) else "bottom" to "top"
                }
            val existingData = existing?.let { objOf(it["data"]) }
            newEdges +=
                buildJsonObject {
                    put("id", id)
                    put("source", sourceId)
                    put("target", targetId)
                    put("type", "ObjectLink")
                    put("sourceHandle", handles.first)
                    put("targetHandle", handles.second)
                    put(
                        "data",
                        buildJsonObject {
                            put("points", existingData?.get("points") ?: buildJsonArray {})
                            if (rel.sourceMultiplicity.isNotEmpty()) put("sourceMultiplicity", rel.sourceMultiplicity)
                            if (rel.sourceRole.isNotEmpty()) put("sourceRole", rel.sourceRole)
                            if (rel.targetMultiplicity.isNotEmpty()) put("targetMultiplicity", rel.targetMultiplicity)
                            if (rel.targetRole.isNotEmpty()) put("targetRole", rel.targetRole)
                            if (rel.label.isNotEmpty()) put("label", rel.label)
                            existingData?.get("fillColor")?.let { put("fillColor", it) }
                            existingData?.get("strokeColor")?.let { put("strokeColor", it) }
                            existingData?.get("textColor")?.let { put("textColor", it) }
                        },
                    )
                }
        }

        // Notes last: they anchor to elements by the identifier the source refers to them by, so
        // every element needs an id and a rectangle before a note can be placed beside one.
        val notesOrigin = Point(60, (rectById.values.maxOfOrNull { it.y + it.height } ?: originY) + 120)
        val (noteNodes, noteEdges) =
            PumlNotes.emit(
                notes = diagram.notes,
                anchorIdOf = { ref -> idByName[ref] },
                rectById = rectById,
                previousNote = { noteText -> prevIdByName[noteText]?.let { prevNodeById[it] } },
                previousAnchorEdge = { noteText, anchor -> prevEdgesByKey["$noteText|$anchor"]?.firstOrNull() },
                fallbackOrigin = notesOrigin,
            )

        val model =
            buildJsonObject {
                put("version", MODEL_SCHEMA_VERSION)
                put("id", textOf(previous?.get("id")) ?: UUID.randomUUID().toString())
                put("title", title)
                put("type", "ObjectDiagram")
                put("nodes", JsonArray(newNodes + noteNodes))
                put("edges", JsonArray(newEdges + noteEdges))
                put("assessments", objOf(previous?.get("assessments")) ?: buildJsonObject {})
            }
        return MappedModel(model, emptyMap(), arrowTokens)
    }

    fun toPumlDiagram(
        model: JsonObject,
        residual: PumlResidual,
    ): ObjectPumlExport {
        val nodes = arrOf(model["nodes"]).filterNot { isAnnotationNode(textOf(it["type"])) || textOf(it["type"]) == NOTE_NODE_TYPE }
        val edges = arrOf(model["edges"])
        val nameById = mutableMapOf<String, String>()
        val arrowTokens = mutableMapOf<String, String>()

        val objects =
            nodes.map { node ->
                val id = textOf(node["id"]) ?: UUID.randomUUID().toString()
                val data = objOf(node["data"]) ?: JsonObject(emptyMap())
                val name = PumlName.forPuml(textOf(data["name"]))
                nameById[id] = name
                val fields = arrOfElement(data["attributes"]).mapNotNull { fieldFromJson(it) }
                PumlObjectInstance(name, fields)
            }

        val relations =
            edges.mapNotNull { edge ->
                val id = textOf(edge["id"]) ?: return@mapNotNull null
                val sourceName = nameById[textOf(edge["source"])] ?: return@mapNotNull null
                val targetName = nameById[textOf(edge["target"])] ?: return@mapNotNull null
                val data = objOf(edge["data"]) ?: JsonObject(emptyMap())
                val arrowToken = residual.arrowTokens[id] ?: "--"
                arrowTokens[id] = arrowToken
                PumlRelation(
                    sourceName = sourceName,
                    targetName = targetName,
                    kind = PumlRelationKind.BIDIRECTIONAL,
                    sourceMultiplicity = textOf(data["sourceMultiplicity"]) ?: "",
                    sourceRole = textOf(data["sourceRole"]) ?: "",
                    targetMultiplicity = textOf(data["targetMultiplicity"]) ?: "",
                    targetRole = textOf(data["targetRole"]) ?: "",
                    label = textOf(data["label"]) ?: "",
                    arrowToken = arrowToken,
                )
            }

        return ObjectPumlExport(PumlObjectDiagram(null, objects, relations, PumlNotes.fromModel(model, nameById)), emptyMap(), arrowTokens)
    }

    /** Object-name set + `(source,target)` link-pair multiset — the Object-diagram input to
     *  [RoundTripValidator]. */
    fun signature(model: JsonObject): Pair<Set<String>, List<Triple<String, String, String>>> {
        val nodes = arrOf(model["nodes"]).filterNot { isAnnotationNode(textOf(it["type"])) || textOf(it["type"]) == NOTE_NODE_TYPE }
        val nameById = mutableMapOf<String, String>()
        val names =
            nodes.mapNotNull { node ->
                val id = textOf(node["id"]) ?: return@mapNotNull null
                val name = PumlName.forPuml(textOf(objOf(node["data"])?.get("name")))
                nameById[id] = name
                name
            }.toSet()
        val relations =
            arrOf(model["edges"]).mapNotNull { edge ->
                val src = nameById[textOf(edge["source"])] ?: return@mapNotNull null
                val tgt = nameById[textOf(edge["target"])] ?: return@mapNotNull null
                Triple(src, tgt, "ObjectLink")
            }
        return names to relations
    }

    private fun fieldJson(
        member: PumlMember,
        existingData: JsonObject?,
        index: Int,
    ): JsonObject {
        val existing = arrOfElement(existingData?.get("attributes")).getOrNull(index) as? JsonObject
        val id = existing?.let { textOf(it["id"]) } ?: UUID.randomUUID().toString()
        return buildJsonObject {
            put("id", id)
            put("name", member.apollonName)
        }
    }

    private fun fieldFromJson(element: kotlinx.serialization.json.JsonElement): PumlMember? {
        val obj = element as? JsonObject ?: return null
        val name = textOf(obj["name"]) ?: return null
        return PumlMember(name, isMethod = false, isAbstract = false)
    }
}

// Small local JSON helpers, duplicated from ApollonModelMapper's file-private ones rather than
// exported from there — keeps each family mapper self-contained and independently testable.
internal fun objOf(e: kotlinx.serialization.json.JsonElement?) = e as? JsonObject

internal fun arrOfElement(e: kotlinx.serialization.json.JsonElement?): List<kotlinx.serialization.json.JsonElement> =
    (e as? JsonArray) ?: JsonArray(emptyList())

internal fun arrOf(e: kotlinx.serialization.json.JsonElement?): List<JsonObject> = arrOfElement(e).mapNotNull { it as? JsonObject }

internal fun textOf(e: kotlinx.serialization.json.JsonElement?) = (e as? JsonPrimitive)?.takeIf { it.isString }?.content

internal fun numberOf(e: kotlinx.serialization.json.JsonElement?): Int? = (e as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt()
