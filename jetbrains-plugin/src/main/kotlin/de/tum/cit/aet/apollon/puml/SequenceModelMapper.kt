package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

data class SequencePumlExport(
    val diagram: PumlSequenceDiagram,
    val typeKeywords: Map<String, String>,
    val arrowTokens: Map<String, String>,
    val elementAliases: Map<String, String>,
)

private const val MODEL_SCHEMA_VERSION = "4.0.0"
private const val COMMUNICATION_NODE_TYPE = "communicationObjectName"
private const val COMMUNICATION_EDGE_TYPE = "CommunicationLink"
private val PARTICIPANT_SIZE = Size(160, 70)

/** `1: place order`, `2.1: reserve` — the sequence number UML puts in front of a communication
 *  message, and the only place a communication diagram can keep time order. */
private val MESSAGE_NUMBER = Regex("""^\s*(\d+(?:\.\d+)*)\s*:?\s*(.*)$""", RegexOption.DOT_MATCHES_ALL)

/**
 * [PumlSequenceDiagram] <-> Apollon `CommunicationDiagram` JSON.
 *
 * The mapping UML itself makes: a sequence diagram and a communication diagram describe the same
 * interaction, one along a time axis and one along the links between participants. Apollon can draw
 * the second, so a `.puml` sequence diagram opens as one — same lifelines, one link per pair that
 * talks, every message hanging off the link that carries it.
 *
 * What the time axis gave away for free, the numbers now carry. A communication diagram has no
 * up-and-down, so message order lives in the `1:`/`2:` prefix on each message, which is exactly what
 * UML numbers them for. [toPumlDiagram] reads those numbers back to recover the order, which means
 * renumbering messages on the canvas really does reorder the sequence diagram — and it also means
 * that stripping the numbers off would lose the ordering, so they are written on every message
 * whether or not the source had any.
 */
object SequenceModelMapper {
    fun toApollonModel(
        diagram: PumlSequenceDiagram,
        previous: JsonObject?,
        title: String,
    ): MappedModel {
        val prevNodes = arrOf(previous?.get("nodes"))
        val prevIdByName = mutableMapOf<String, String>()
        val prevNodeById = mutableMapOf<String, JsonObject>()
        prevNodes.forEach { node ->
            val id = textOf(node["id"]) ?: return@forEach
            val name = textOf(objOf(node["data"])?.get("name")) ?: return@forEach
            prevIdByName[name] = id
            prevNodeById[id] = node
        }

        var maxBottom = 0
        prevNodes.forEach { node ->
            maxBottom = maxOf(maxBottom, (numberOf(objOf(node["position"])?.get("y")) ?: 0) + (numberOf(node["height"]) ?: 0))
        }
        val originY = if (prevNodes.isEmpty()) 60 else maxBottom + 120
        val freshPositions =
            PumlLayout.gridPositions(diagram.participants.count { prevIdByName[it.displayName] == null }, 60, originY).iterator()

        val typeKeywords = mutableMapOf<String, String>()
        val elementAliases = mutableMapOf<String, String>()
        val idByRefId = mutableMapOf<String, String>()
        val rectById = mutableMapOf<String, Rect>()

        val nodes =
            diagram.participants.map { participant ->
                val existingId = prevIdByName[participant.displayName]
                val existing = existingId?.let { prevNodeById[it] }
                val id = existingId ?: UUID.randomUUID().toString()
                idByRefId[participant.refId] = id
                elementAliases[id] = participant.refId
                // Only a declared lifeline gets a keyword; its absence is what tells the exporter
                // this participant was invented by PlantUML and must not grow a declaration line.
                if (participant.declared) typeKeywords[id] = participant.keyword

                val fallback = if (freshPositions.hasNext()) freshPositions.next() else Point(60, originY)
                val position =
                    objOf(existing?.get("position"))?.let { Point(numberOf(it["x"]) ?: fallback.x, numberOf(it["y"]) ?: fallback.y) }
                        ?: fallback
                val width = existing?.let { numberOf(it["width"]) } ?: PARTICIPANT_SIZE.width
                val height = existing?.let { numberOf(it["height"]) } ?: PARTICIPANT_SIZE.height
                rectById[id] = Rect(position.x, position.y, width, height)

                val existingData = existing?.let { objOf(it["data"]) }
                buildJsonObject {
                    put("id", id)
                    put("width", width)
                    put("height", height)
                    put("type", COMMUNICATION_NODE_TYPE)
                    put("position", buildJsonObject { put("x", position.x); put("y", position.y) })
                    put(
                        "data",
                        buildJsonObject {
                            put("name", participant.displayName)
                            put("attributes", existingData?.get("attributes") ?: buildJsonArray {})
                            put("methods", existingData?.get("methods") ?: buildJsonArray {})
                            existingData?.get("fillColor")?.let { put("fillColor", it) }
                            existingData?.get("strokeColor")?.let { put("strokeColor", it) }
                            existingData?.get("textColor")?.let { put("textColor", it) }
                        },
                    )
                    put("measured", buildJsonObject { put("width", width); put("height", height) })
                }
            }

        val prevEdgeByEnds =
            arrOf(previous?.get("edges")).mapNotNull { edge ->
                val source = textOf(edge["source"]) ?: return@mapNotNull null
                val target = textOf(edge["target"]) ?: return@mapNotNull null
                "$source|$target" to edge
            }.toMap()

        // One link per pair that talks, in the order the pairs first talk; the direction of each
        // individual message is a property of the message, not of the link.
        val arrowTokens = mutableMapOf<String, String>()
        val linkOrder = mutableListOf<Pair<String, String>>()
        val messagesByLink = mutableMapOf<Pair<String, String>, MutableList<Triple<String, Boolean, String>>>()
        diagram.messages.forEachIndexed { index, message ->
            val sourceId = idByRefId[message.sourceRefId] ?: return@forEachIndexed
            val targetId = idByRefId[message.targetRefId] ?: return@forEachIndexed
            val forward = linkOrder.contains(sourceId to targetId) || !linkOrder.contains(targetId to sourceId)
            val key = if (forward) sourceId to targetId else targetId to sourceId
            if (key !in linkOrder) linkOrder += key
            val numbered = if (message.text.isEmpty()) "${index + 1}" else "${index + 1}: ${message.text}"
            messagesByLink.getOrPut(key) { mutableListOf() } += Triple(numbered, forward, message.arrowToken)
        }

        val edges =
            linkOrder.map { (sourceId, targetId) ->
                val existing = prevEdgeByEnds["$sourceId|$targetId"] ?: prevEdgeByEnds["$targetId|$sourceId"]
                val id = existing?.let { textOf(it["id"]) } ?: UUID.randomUUID().toString()
                val handles =
                    if (existing != null) {
                        (textOf(existing["sourceHandle"]) ?: "right") to (textOf(existing["targetHandle"]) ?: "left")
                    } else {
                        val source = rectById[sourceId]
                        val target = rectById[targetId]
                        if (source != null && target != null) PumlLayout.chooseHandles(source, target) else "right" to "left"
                    }
                val existingData = existing?.let { objOf(it["data"]) }
                buildJsonObject {
                    put("id", id)
                    put("source", sourceId)
                    put("target", targetId)
                    put("type", COMMUNICATION_EDGE_TYPE)
                    put("sourceHandle", handles.first)
                    put("targetHandle", handles.second)
                    put(
                        "data",
                        buildJsonObject {
                            put("points", existingData?.get("points") ?: buildJsonArray {})
                            put(
                                "messages",
                                buildJsonArray {
                                    messagesByLink.getValue(sourceId to targetId).forEach { (text, forward, arrow) ->
                                        val messageId = UUID.randomUUID().toString()
                                        arrowTokens["$id#$messageId"] = arrow
                                        add(
                                            buildJsonObject {
                                                put("id", messageId)
                                                put("text", text)
                                                put("direction", if (forward) "target" else "source")
                                            },
                                        )
                                    }
                                },
                            )
                            existingData?.get("strokeColor")?.let { put("strokeColor", it) }
                            existingData?.get("textColor")?.let { put("textColor", it) }
                        },
                    )
                }
            }

        val model =
            buildJsonObject {
                put("version", MODEL_SCHEMA_VERSION)
                put("id", textOf(previous?.get("id")) ?: UUID.randomUUID().toString())
                put("title", title)
                put("type", "CommunicationDiagram")
                put("nodes", buildJsonArray { nodes.forEach { add(it) } })
                put("edges", buildJsonArray { edges.forEach { add(it) } })
                put("assessments", objOf(previous?.get("assessments")) ?: buildJsonObject {})
            }
        return MappedModel(model, typeKeywords, arrowTokens, elementAliases)
    }

    fun toPumlDiagram(
        model: JsonObject,
        residual: PumlResidual,
    ): SequencePumlExport {
        val nodes = arrOf(model["nodes"]).filterNot { isAnnotationNode(textOf(it["type"])) || textOf(it["type"]) == NOTE_NODE_TYPE }
        val refIdById = mutableMapOf<String, String>()
        val usedRefIds = mutableSetOf<String>()
        val typeKeywords = mutableMapOf<String, String>()
        val elementAliases = mutableMapOf<String, String>()

        val participants =
            nodes.mapNotNull { node ->
                val id = textOf(node["id"]) ?: return@mapNotNull null
                val displayName = PumlName.forPuml(textOf(objOf(node["data"])?.get("name")))
                var refId = residual.elementAliases[id] ?: displayName
                while (!usedRefIds.add(refId)) refId += "_"
                refIdById[id] = refId
                elementAliases[id] = refId
                val keyword = residual.typeKeywords[id]?.takeIf { it in SEQUENCE_PARTICIPANT_KEYWORDS }
                keyword?.let { typeKeywords[id] = it }
                PumlSequenceParticipant(
                    refId = refId,
                    displayName = displayName,
                    alias = refId.takeIf { it != displayName },
                    keyword = keyword ?: "participant",
                    declared = keyword != null,
                )
            }

        val arrowTokens = mutableMapOf<String, String>()
        val collected = mutableListOf<Triple<List<Int>, Int, PumlSequenceMessage>>()
        var ordinal = 0
        arrOf(model["edges"]).filter { textOf(it["type"]) == COMMUNICATION_EDGE_TYPE }.forEach { edge ->
            val edgeId = textOf(edge["id"]) ?: return@forEach
            val sourceRefId = refIdById[textOf(edge["source"])] ?: return@forEach
            val targetRefId = refIdById[textOf(edge["target"])] ?: return@forEach
            arrOf(objOf(edge["data"])?.get("messages")).forEach { message ->
                val raw = textOf(message["text"]).orEmpty()
                val match = MESSAGE_NUMBER.find(raw)
                val number = match?.groupValues?.get(1)?.split(".")?.mapNotNull { it.toIntOrNull() } ?: emptyList()
                val body = match?.groupValues?.get(2)?.trim() ?: raw.trim()
                val forward = textOf(message["direction"]) != "source"
                val messageId = textOf(message["id"])
                val remembered = messageId?.let { residual.arrowTokens["$edgeId#$it"] }?.takeIf { isSequenceArrow(it) }
                val arrow = remembered ?: "->"
                messageId?.let { arrowTokens["$edgeId#$it"] = arrow }
                collected +=
                    Triple(
                        // An unnumbered message sorts after every numbered one rather than before
                        // them all, so adding one on the canvas appends it instead of silently
                        // becoming the first thing that happens.
                        number.ifEmpty { listOf(Int.MAX_VALUE) },
                        ordinal++,
                        if (forward) {
                            PumlSequenceMessage(sourceRefId, targetRefId, body, arrow)
                        } else {
                            PumlSequenceMessage(targetRefId, sourceRefId, body, arrow)
                        },
                    )
            }
        }

        val messages =
            collected
                .sortedWith(
                    compareBy<Triple<List<Int>, Int, PumlSequenceMessage>, List<Int>>(NUMBER_ORDER) { it.first }
                        .thenBy { it.second },
                ).map { it.third }
        return SequencePumlExport(PumlSequenceDiagram(null, participants, messages), typeKeywords, arrowTokens, elementAliases)
    }

    /** Participant names + the ordered `(source, target, text)` list — the sequence input to
     *  [RoundTripValidator]. Order is part of the signature here, unlike every other family: for an
     *  interaction it *is* the content. */
    fun signature(model: JsonObject): Pair<Set<String>, List<Triple<String, String, String>>> {
        val export = toPumlDiagram(model, PumlResidual("@startuml", "@enduml", "\n", "  "))
        val nameByRefId = export.diagram.participants.associate { it.refId to it.displayName }
        return export.diagram.participants.map { it.displayName }.toSet() to
            export.diagram.messages.map { message ->
                Triple(
                    nameByRefId[message.sourceRefId] ?: message.sourceRefId,
                    nameByRefId[message.targetRefId] ?: message.targetRefId,
                    message.text,
                )
            }
    }

    /** Lexicographic over the dotted parts, so `2` comes before `2.1` and `10` after `9`. */
    private val NUMBER_ORDER =
        Comparator<List<Int>> { a, b ->
            val shared = minOf(a.size, b.size)
            for (i in 0 until shared) {
                val diff = a[i].compareTo(b[i])
                if (diff != 0) return@Comparator diff
            }
            a.size.compareTo(b.size)
        }
}
