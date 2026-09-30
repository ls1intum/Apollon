package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

data class ActivityPumlExport(
    val diagram: PumlActivityDiagram,
    val typeKeywords: Map<String, String>,
)

private const val MODEL_SCHEMA_VERSION = "4.0.0"
private const val ACTIVITY_EDGE_TYPE = "ActivityControlFlow"
private const val COLUMN_SPACING = 240
private const val ROW_SPACING = 80
private const val CANVAS_CENTER_X = 460

private fun apollonTypeFor(kind: PumlActivityNodeKind): String =
    when (kind) {
        PumlActivityNodeKind.INITIAL -> "activityInitialNode"
        PumlActivityNodeKind.FINAL -> "activityFinalNode"
        PumlActivityNodeKind.ACTION -> "activityActionNode"
        PumlActivityNodeKind.DECISION, PumlActivityNodeKind.MERGE -> "activityMergeNode"
        PumlActivityNodeKind.FORK, PumlActivityNodeKind.JOIN -> "activityForkNodeHorizontal"
    }

/** Matches the palette defaults in `library/lib/constants.ts` so a step Architect Studio creates is
 *  the same size as one the user drops on the canvas. */
private fun sizeFor(kind: PumlActivityNodeKind): Size =
    when (kind) {
        PumlActivityNodeKind.INITIAL, PumlActivityNodeKind.FINAL -> Size(50, 50)
        PumlActivityNodeKind.ACTION -> Size(160, 120)
        PumlActivityNodeKind.DECISION, PumlActivityNodeKind.MERGE -> Size(160, 120)
        PumlActivityNodeKind.FORK, PumlActivityNodeKind.JOIN -> Size(100, 20)
    }

/**
 * [PumlActivityDiagram] <-> Apollon `ActivityDiagram` JSON.
 *
 * The one thing this mapper does that its siblings do not is *recompute* two of the seven kinds
 * rather than remember them. Apollon draws a decision and a merge with the same diamond, and a fork
 * and a join with the same bar, so which half of the pair a box is cannot be read off its node
 * type. It is read off its degree instead: more than one way out makes it the opening half. That is
 * not a shortcut — it is the definition, and it means splitting or joining a flow on the canvas
 * turns the box into the right thing without the user having to say so.
 *
 * The only fact with nowhere to live in the model is the spelling of a step that has two: `stop`
 * versus `end`, `end fork` versus `end merge`. Those ride in [PumlResidual.typeKeywords] keyed by
 * node id, exactly as a class's source keyword does.
 */
object ActivityModelMapper {
    fun toApollonModel(
        diagram: PumlActivityDiagram,
        previous: JsonObject?,
        title: String,
    ): MappedModel {
        val prevNodes = arrOf(previous?.get("nodes"))
        val prevByKey = mutableMapOf<String, JsonObject>()
        run {
            val seen = mutableMapOf<String, Int>()
            prevNodes.forEach { node ->
                val key = geometryKey(textOf(node["type"]), textOf(objOf(node["data"])?.get("name")), seen)
                prevByKey.putIfAbsent(key, node)
            }
        }

        val idByRefId = mutableMapOf<String, String>()
        val typeKeywords = mutableMapOf<String, String>()
        val positions = layout(diagram)
        val seen = mutableMapOf<String, Int>()
        val rectById = mutableMapOf<String, Rect>()

        val nodes =
            diagram.nodes.map { step ->
                val apollonType = apollonTypeFor(step.kind)
                val existing = prevByKey[geometryKey(apollonType, step.label, seen)]
                val id = existing?.let { textOf(it["id"]) } ?: UUID.randomUUID().toString()
                idByRefId[step.refId] = id
                step.keyword?.let { typeKeywords[id] = it }

                val fresh = positions.getValue(step.refId)
                val size = sizeFor(step.kind)
                val position =
                    objOf(existing?.get("position"))?.let { Point(numberOf(it["x"]) ?: fresh.x, numberOf(it["y"]) ?: fresh.y) } ?: fresh
                val width = existing?.let { numberOf(it["width"]) } ?: size.width
                val height = existing?.let { numberOf(it["height"]) } ?: size.height
                rectById[id] = Rect(position.x, position.y, width, height)

                val existingData = existing?.let { objOf(it["data"]) }
                buildJsonObject {
                    put("id", id)
                    put("width", width)
                    put("height", height)
                    put("type", apollonType)
                    put("position", buildJsonObject { put("x", position.x); put("y", position.y) })
                    put(
                        "data",
                        buildJsonObject {
                            put("name", step.label)
                            existingData?.get("fillColor")?.let { put("fillColor", it) }
                            existingData?.get("strokeColor")?.let { put("strokeColor", it) }
                            existingData?.get("textColor")?.let { put("textColor", it) }
                            existingData?.get("tags")?.let { put("tags", it) }
                        },
                    )
                    put("measured", buildJsonObject { put("width", width); put("height", height) })
                }
            }

        val prevEdges = arrOf(previous?.get("edges"))
        val prevEdgeById = prevEdges.mapNotNull { e -> textOf(e["id"])?.let { it to e } }.toMap()
        val prevEdgeByEnds =
            prevEdges.mapNotNull { edge ->
                val src = textOf(edge["source"]) ?: return@mapNotNull null
                val tgt = textOf(edge["target"]) ?: return@mapNotNull null
                "$src|$tgt" to edge
            }.toMap()

        val edges =
            diagram.flows.mapNotNull { flow ->
                val sourceId = idByRefId[flow.sourceRefId] ?: return@mapNotNull null
                val targetId = idByRefId[flow.targetRefId] ?: return@mapNotNull null
                val existing = prevEdgeByEnds["$sourceId|$targetId"]
                val id = existing?.let { textOf(it["id"]) } ?: UUID.randomUUID().toString()
                val handles =
                    if (existing != null) {
                        (textOf(existing["sourceHandle"]) ?: "bottom") to (textOf(existing["targetHandle"]) ?: "top")
                    } else {
                        val source = rectById[sourceId]
                        val target = rectById[targetId]
                        if (source != null && target != null) PumlLayout.chooseHandles(source, target) else "bottom" to "top"
                    }
                val existingData = objOf(prevEdgeById[id]?.get("data"))
                buildJsonObject {
                    put("id", id)
                    put("source", sourceId)
                    put("target", targetId)
                    put("type", ACTIVITY_EDGE_TYPE)
                    put("sourceHandle", handles.first)
                    put("targetHandle", handles.second)
                    put(
                        "data",
                        buildJsonObject {
                            put("points", existingData?.get("points") ?: buildJsonArray {})
                            if (flow.label.isNotEmpty()) put("label", flow.label)
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
                put("type", "ActivityDiagram")
                put("nodes", buildJsonArray { nodes.forEach { add(it) } })
                put("edges", buildJsonArray { edges.forEach { add(it) } })
                put("assessments", objOf(previous?.get("assessments")) ?: buildJsonObject {})
            }
        return MappedModel(model, typeKeywords, emptyMap())
    }

    fun toPumlDiagram(
        model: JsonObject,
        residual: PumlResidual,
    ): ActivityPumlExport {
        val nodes = arrOf(model["nodes"]).filterNot { isAnnotationNode(textOf(it["type"])) || textOf(it["type"]) == NOTE_NODE_TYPE }
        val flowEdges = arrOf(model["edges"]).filter { textOf(it["type"]) == ACTIVITY_EDGE_TYPE }

        val outDegree = flowEdges.groupingBy { textOf(it["source"]) }.eachCount()
        val refIdById = mutableMapOf<String, String>()
        val typeKeywords = mutableMapOf<String, String>()

        val steps =
            nodes.mapIndexedNotNull { index, node ->
                val id = textOf(node["id"]) ?: return@mapIndexedNotNull null
                val kind = kindFor(textOf(node["type"]), outDegree[id] ?: 0) ?: return@mapIndexedNotNull null
                val refId = "n${index + 1}"
                refIdById[id] = refId
                val keyword = residual.typeKeywords[id]?.takeIf { keywordFits(kind, it) }
                keyword?.let { typeKeywords[id] = it }
                // Not `PumlName.forPuml`: a step label is free text, and half of an activity
                // diagram's steps have none at all — a start node has no business being "Unnamed".
                PumlActivityNode(refId, textOf(objOf(node["data"])?.get("name")).orEmpty().trim(), kind, keyword)
            }

        val flows =
            flowEdges.mapNotNull { edge ->
                val source = refIdById[textOf(edge["source"])] ?: return@mapNotNull null
                val target = refIdById[textOf(edge["target"])] ?: return@mapNotNull null
                PumlActivityFlow(source, target, textOf(objOf(edge["data"])?.get("label")) ?: "")
            }

        return ActivityPumlExport(PumlActivityDiagram(null, steps, flows), typeKeywords)
    }

    /**
     * Step labels by kind + the flows between them, as names — the activity input to
     * [RoundTripValidator]. Labels alone would not do: half an activity diagram's steps have no
     * label at all, so a lost `stop` or merge diamond would slip through a name-set comparison.
     *
     * The flow's own label is part of it, and has to be. A decision's whole meaning is in which
     * branch says `yes` — swapping `then (yes)` and `else (no)` loses nothing a step comparison can
     * see, and reverses the diagram.
     */
    fun signature(model: JsonObject): Pair<List<String>, List<String>> {
        val export = toPumlDiagram(model, PumlResidual("@startuml", "@enduml", "\n", "  "))
        return signatureOf(export.diagram)
    }

    /** [signature]'s other half: the same reading taken off a re-parsed candidate. */
    fun signatureOf(diagram: PumlActivityDiagram): Pair<List<String>, List<String>> {
        val labelByRefId = diagram.nodes.associate { it.refId to "${it.kind}:${it.label}" }
        return diagram.nodes.map { "${it.kind}:${it.label}" }.sorted() to
            diagram.flows.mapNotNull { flow ->
                val source = labelByRefId[flow.sourceRefId] ?: return@mapNotNull null
                val target = labelByRefId[flow.targetRefId] ?: return@mapNotNull null
                "$source -> $target [${flow.label}]"
            }.sorted()
    }

    private fun kindFor(
        apollonType: String?,
        outDegree: Int,
    ): PumlActivityNodeKind? =
        when (apollonType) {
            "activityInitialNode" -> PumlActivityNodeKind.INITIAL
            "activityFinalNode" -> PumlActivityNodeKind.FINAL
            "activityActionNode", "activityObjectNode", "activity" -> PumlActivityNodeKind.ACTION
            // More than one way out makes the diamond a decision and the bar a fork; see the
            // object's doc comment for why this is recomputed rather than remembered.
            "activityMergeNode" -> if (outDegree > 1) PumlActivityNodeKind.DECISION else PumlActivityNodeKind.MERGE
            "activityForkNode", "activityForkNodeHorizontal" ->
                if (outDegree > 1) PumlActivityNodeKind.FORK else PumlActivityNodeKind.JOIN
            else -> null
        }

    /**
     * Whether a step of this kind may still carry the spelling the source wrote.
     *
     * The check matters because two of the seven kinds are recomputed rather than remembered: split
     * a flow on the canvas and a join bar becomes a fork bar, and `end merge` is then a lie. Rather
     * than write it, the spelling is dropped and the exporter falls back to the canonical form.
     */
    private fun keywordFits(
        kind: PumlActivityNodeKind,
        keyword: String,
    ): Boolean =
        when (kind) {
            PumlActivityNodeKind.FINAL -> keyword == "stop" || keyword == "end"
            PumlActivityNodeKind.JOIN -> keyword in setOf("end fork", "end merge", "end split")
            PumlActivityNodeKind.FORK -> keyword == "fork" || keyword == "split"
            PumlActivityNodeKind.DECISION -> keyword == "switch"
            // `detach`/`kill` is the absence of a final node, so it rides on the step it followed —
            // any step that can be the end of a strand.
            PumlActivityNodeKind.ACTION, PumlActivityNodeKind.MERGE -> keyword == "detach" || keyword == "kill"
            else -> false
        }

    /** Geometry is matched by type + label + how many of that pair came before, because an activity
     *  diagram routinely holds several unlabelled diamonds and two identically named actions. */
    private fun geometryKey(
        apollonType: String?,
        label: String?,
        seen: MutableMap<String, Int>,
    ): String {
        val base = "$apollonType|${label.orEmpty()}"
        val occurrence = seen.getOrDefault(base, 0)
        seen[base] = occurrence + 1
        return "$base|$occurrence"
    }

    /**
     * Rows by longest path from the start, columns spread around the canvas centre — the shape an
     * activity diagram is read in. Deliberately not a layout engine (plan §D5): the same flow always
     * lays out the same way, and once the user moves a step the remembered position wins.
     */
    private fun layout(diagram: PumlActivityDiagram): Map<String, Point> {
        // Rows come from a topological order, and a loop has no topological order — so the flows
        // that go back up are left out of the ranking and drawn as the arrows they are. Without
        // this every step from the loop head down would be "unsettled" and parked at the bottom.
        val forward = diagram.flows - diagram.backFlows()
        val outgoing = forward.outgoingBy()
        val remainingIndegree = diagram.nodes.associate { it.refId to 0 }.toMutableMap()
        forward.forEach { remainingIndegree[it.targetRefId] = (remainingIndegree[it.targetRefId] ?: 0) + 1 }

        val depth = diagram.nodes.associate { it.refId to 0 }.toMutableMap()
        val queue = ArrayDeque(diagram.nodes.filter { remainingIndegree[it.refId] == 0 }.map { it.refId })
        val settled = mutableSetOf<String>()
        while (queue.isNotEmpty()) {
            val node = queue.removeFirst()
            if (!settled.add(node)) continue
            outgoing[node].orEmpty().forEach { flow ->
                depth[flow.targetRefId] = maxOf(depth[flow.targetRefId] ?: 0, (depth[node] ?: 0) + 1)
                remainingIndegree[flow.targetRefId] = (remainingIndegree[flow.targetRefId] ?: 1) - 1
                if (remainingIndegree[flow.targetRefId] == 0) queue.addLast(flow.targetRefId)
            }
        }
        // A cycle the user drew on the canvas leaves nodes unsettled; park them below everything
        // else rather than at the origin, on top of the start node.
        val deepest = depth.values.maxOrNull() ?: 0
        diagram.nodes.filter { it.refId !in settled }.forEachIndexed { i, node -> depth[node.refId] = deepest + 1 + i }

        val byRow = diagram.nodes.groupBy { depth.getValue(it.refId) }.toSortedMap()
        val positions = mutableMapOf<String, Point>()
        var y = 60
        byRow.forEach { (_, row) ->
            val widths = row.map { sizeFor(it.kind).width }
            val total = widths.sum() + COLUMN_SPACING * (row.size - 1).coerceAtLeast(0)
            var x = CANVAS_CENTER_X - total / 2
            row.forEachIndexed { i, node ->
                positions[node.refId] = Point(x, y)
                x += widths[i] + COLUMN_SPACING
            }
            y += (row.maxOfOrNull { sizeFor(it.kind).height } ?: 0) + ROW_SPACING
        }
        return positions
    }
}
