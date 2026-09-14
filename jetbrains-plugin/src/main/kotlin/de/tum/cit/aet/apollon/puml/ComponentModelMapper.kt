package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

data class ComponentPumlExport(
    val diagram: PumlComponentDiagram,
    val typeKeywords: Map<String, String>,
    val arrowTokens: Map<String, String>,
    val elementAliases: Map<String, String>,
)

private const val MODEL_SCHEMA_VERSION = "4.0.0"
private const val CONTAINER_PADDING = 20
private const val CONTAINER_SPACING = 20
private const val CONTAINER_HEADER = 40
private val BARE_IDENT = Regex("""^[A-Za-z_][\w$]*$""")

private fun defaultSizeFor(kind: PumlComponentElementKind): Size =
    when (kind) {
        PumlComponentElementKind.COMPONENT -> Size(180, 120)
        PumlComponentElementKind.SUBSYSTEM -> Size(180, 120)
    }

private fun apollonTypeFor(kind: PumlComponentElementKind): String =
    when (kind) {
        PumlComponentElementKind.COMPONENT -> "component"
        PumlComponentElementKind.SUBSYSTEM -> "componentSubsystem"
    }

/** [PumlComponentDiagram] <-> Apollon `ComponentDiagram` JSON (`component`/`componentSubsystem`
 *  nodes, `ComponentDependency` edges — `library/lib/nodes/componentDiagram/`,
 *  `library/lib/modelElementTypes.ts`). Every relation line this family's importer accepts becomes a
 *  `ComponentDependency` edge — Apollon models no other Component-diagram edge type (besides the
 *  out-of-scope lollipop interface edges), so unlike [UseCaseModelMapper] there is no per-relation
 *  kind to classify; `arrowToken` alone (round-tripped through [PumlResidual.arrowTokens], exactly
 *  like [ObjectModelMapper]'s single-edge-type `ObjectLink`) is what keeps `-->` vs `..>` stable
 *  across a save. Merge-on-re-import, container sizing, and `parentId` nesting all follow
 *  [UseCaseModelMapper]'s pattern — see its doc comment. */
object ComponentModelMapper {
    fun toApollonModel(
        diagram: PumlComponentDiagram,
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
            if (textOf(node["parentId"]) != null) return@forEach
            val y = numberOf(objOf(node["position"])?.get("y")) ?: 0
            val h = numberOf(node["height"]) ?: 0
            maxBottom = maxOf(maxBottom, y + h)
        }
        val originY = if (prevNodes.isEmpty()) 60 else maxBottom + 120

        val topLevel = diagram.elements.filter { it.parentRefId == null }
        val childrenByParent = diagram.elements.filter { it.parentRefId != null }.groupBy { it.parentRefId }
        val freshTopLevelCount = topLevel.count { prevIdByName[it.displayName] == null }
        val freshPositions = PumlLayout.gridPositions(freshTopLevelCount, 60, originY).iterator()

        val idByRefId = mutableMapOf<String, String>()
        val elementAliases = mutableMapOf<String, String>()
        val newNodes = mutableListOf<JsonObject>()
        val rectById = mutableMapOf<String, Rect>()

        fun buildNode(
            element: PumlComponentElement,
            position: Point,
            size: Size,
            existing: JsonObject?,
            id: String,
            parentId: String?,
        ): JsonObject {
            val existingData = existing?.let { objOf(it["data"]) }
            val data =
                buildJsonObject {
                    put("name", element.displayName)
                    if (element.kind == PumlComponentElementKind.COMPONENT) put("isComponentHeaderShown", true)
                    if (element.kind == PumlComponentElementKind.SUBSYSTEM) put("isComponentSubsystemHeaderShown", true)
                    existingData?.get("fillColor")?.let { put("fillColor", it) }
                    existingData?.get("strokeColor")?.let { put("strokeColor", it) }
                    existingData?.get("textColor")?.let { put("textColor", it) }
                    existingData?.get("tags")?.let { put("tags", it) }
                }
            return buildJsonObject {
                put("id", id)
                put("width", size.width)
                put("height", size.height)
                put("type", apollonTypeFor(element.kind))
                put("position", buildJsonObject { put("x", position.x); put("y", position.y) })
                if (parentId != null) put("parentId", parentId)
                put("data", data)
                put("measured", buildJsonObject { put("width", size.width); put("height", size.height) })
            }
        }

        topLevel.forEach { element ->
            val existingId = prevIdByName[element.displayName]
            val existing = existingId?.let { prevNodeById[it] }
            val id = existingId ?: UUID.randomUUID().toString()
            idByRefId[element.refId] = id
            element.alias?.let { elementAliases[id] = it }

            val children = childrenByParent[element.refId].orEmpty()
            val position =
                if (existing != null) {
                    val p = objOf(existing["position"]) ?: buildJsonObject { put("x", 0); put("y", 0) }
                    Point(numberOf(p["x"]) ?: 0, numberOf(p["y"]) ?: 0)
                } else {
                    freshPositions.next()
                }
            val size =
                when {
                    existing != null ->
                        Size(
                            numberOf(existing["width"]) ?: defaultSizeFor(element.kind).width,
                            numberOf(existing["height"]) ?: defaultSizeFor(element.kind).height,
                        )
                    element.kind == PumlComponentElementKind.SUBSYSTEM && children.isNotEmpty() -> freshContainerSize(children)
                    else -> defaultSizeFor(element.kind)
                }
            newNodes += buildNode(element, position, size, existing, id, null)
            rectById[id] = Rect(position.x, position.y, size.width, size.height)

            if (element.kind == PumlComponentElementKind.SUBSYSTEM) {
                var cursorY = CONTAINER_HEADER + CONTAINER_SPACING
                children.forEach { child ->
                    val childExistingId = prevIdByName[child.displayName]
                    val childExisting = childExistingId?.let { prevNodeById[it] }
                    val childId = childExistingId ?: UUID.randomUUID().toString()
                    idByRefId[child.refId] = childId
                    child.alias?.let { elementAliases[childId] = it }

                    val childSize: Size
                    val childRelativePosition: Point
                    if (childExisting != null) {
                        val p = objOf(childExisting["position"]) ?: buildJsonObject { put("x", CONTAINER_PADDING); put("y", cursorY) }
                        childRelativePosition = Point(numberOf(p["x"]) ?: CONTAINER_PADDING, numberOf(p["y"]) ?: cursorY)
                        childSize =
                            Size(
                                numberOf(childExisting["width"]) ?: defaultSizeFor(child.kind).width,
                                numberOf(childExisting["height"]) ?: defaultSizeFor(child.kind).height,
                            )
                    } else {
                        childSize = defaultSizeFor(child.kind)
                        childRelativePosition = Point(CONTAINER_PADDING, cursorY)
                        cursorY += childSize.height + CONTAINER_SPACING
                    }
                    newNodes += buildNode(child, childRelativePosition, childSize, childExisting, childId, id)
                    rectById[childId] =
                        Rect(position.x + childRelativePosition.x, position.y + childRelativePosition.y, childSize.width, childSize.height)
                }
            }
        }

        val arrowTokens = mutableMapOf<String, String>()
        val consumed = mutableMapOf<String, Int>()
        val newEdges = mutableListOf<JsonObject>()
        diagram.relations.forEach { rel ->
            val sourceId = idByRefId[rel.sourceName] ?: return@forEach
            val targetId = idByRefId[rel.targetName] ?: return@forEach
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
                    put("type", "ComponentDependency")
                    put("sourceHandle", handles.first)
                    put("targetHandle", handles.second)
                    put(
                        "data",
                        buildJsonObject {
                            put("points", existingData?.get("points") ?: buildJsonArray {})
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
                anchorIdOf = { ref -> idByRefId[ref] },
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
                put("type", "ComponentDiagram")
                put("nodes", buildJsonArray { (newNodes + noteNodes).forEach { add(it) } })
                put("edges", buildJsonArray { (newEdges + noteEdges).forEach { add(it) } })
                put("assessments", objOf(previous?.get("assessments")) ?: buildJsonObject {})
            }
        return MappedModel(model, emptyMap(), arrowTokens, elementAliases)
    }

    fun toPumlDiagram(
        model: JsonObject,
        residual: PumlResidual,
    ): ComponentPumlExport {
        val nodes = arrOf(model["nodes"]).filterNot { isAnnotationNode(textOf(it["type"])) || textOf(it["type"]) == NOTE_NODE_TYPE }
        val edges = arrOf(model["edges"])
        val refIdById = mutableMapOf<String, String>()
        val usedRefIds = mutableSetOf<String>()

        fun freshRefId(displayName: String): String {
            val base = if (BARE_IDENT.matches(displayName)) displayName else "el" + (usedRefIds.size + 1)
            var candidate = base
            var n = 1
            while (!usedRefIds.add(candidate)) candidate = "$base${n++}"
            return candidate
        }

        val elementAliases = mutableMapOf<String, String>()
        val elements =
            nodes.map { node ->
                val id = textOf(node["id"]) ?: UUID.randomUUID().toString()
                val type = textOf(node["type"]) ?: "component"
                val kind = if (type == "componentSubsystem") PumlComponentElementKind.SUBSYSTEM else PumlComponentElementKind.COMPONENT
                val data = objOf(node["data"]) ?: JsonObject(emptyMap())
                val displayName = PumlName.forPuml(textOf(data["name"]))
                val alias = residual.elementAliases[id]
                val refId = (alias ?: displayName.takeIf { BARE_IDENT.matches(it) } ?: freshRefId(displayName)).also { usedRefIds.add(it) }
                refIdById[id] = refId
                if (alias != null) elementAliases[id] = alias
                node to PumlComponentElement(refId, displayName, alias, kind, null)
            }

        val elementsWithParent =
            elements.map { (node, element) ->
                val parentId = textOf(node["parentId"])
                element.copy(parentRefId = parentId?.let { refIdById[it] })
            }

        val arrowTokens = mutableMapOf<String, String>()
        val relations =
            edges.mapNotNull { edge ->
                val id = textOf(edge["id"]) ?: return@mapNotNull null
                if (textOf(edge["type"]) != "ComponentDependency") return@mapNotNull null
                val sourceRefId = refIdById[textOf(edge["source"])] ?: return@mapNotNull null
                val targetRefId = refIdById[textOf(edge["target"])] ?: return@mapNotNull null
                val data = objOf(edge["data"]) ?: JsonObject(emptyMap())
                val arrowToken = residual.arrowTokens[id] ?: "..>"
                arrowTokens[id] = arrowToken
                PumlRelation(
                    sourceName = sourceRefId,
                    targetName = targetRefId,
                    kind = PumlRelationKind.DEPENDENCY,
                    sourceMultiplicity = "",
                    sourceRole = "",
                    targetMultiplicity = "",
                    targetRole = "",
                    label = textOf(data["label"]) ?: "",
                    arrowToken = arrowToken,
                )
            }

        return ComponentPumlExport(PumlComponentDiagram(null, elementsWithParent, relations, PumlNotes.fromModel(model, refIdById)), emptyMap(), arrowTokens, elementAliases)
    }

    /** Element-name set + `(source,target)` dependency-pair multiset — the Component-diagram input
     *  to [RoundTripValidator]. */
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
                Triple(src, tgt, "ComponentDependency")
            }
        return names to relations
    }

    private fun freshContainerSize(children: List<PumlComponentElement>): Size {
        val width = (children.maxOfOrNull { defaultSizeFor(it.kind).width } ?: 180) + 2 * CONTAINER_PADDING
        val height = CONTAINER_HEADER + CONTAINER_SPACING + children.sumOf { defaultSizeFor(it.kind).height + CONTAINER_SPACING }
        return Size(width, height)
    }
}
