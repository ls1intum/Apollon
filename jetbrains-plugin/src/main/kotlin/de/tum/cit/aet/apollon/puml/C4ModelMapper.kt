package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

data class C4PumlExport(
    val diagram: PumlC4Diagram,
    val typeKeywords: Map<String, String>,
    val arrowTokens: Map<String, String>,
    val elementAliases: Map<String, String>,
    val c4Extras: Map<String, String>,
)

private const val MODEL_SCHEMA_VERSION = "4.0.0"
private const val CONTAINER_PADDING = 20
private const val CONTAINER_SPACING = 20
private const val CONTAINER_HEADER = 40
private val C4_BARE_IDENT = Regex("""^[A-Za-z_][\w$]*$""")

/**
 * The C4 kind each Apollon deployment node stands for.
 *
 * C4 has no notation of its own — it is a way of *using* boxes and arrows — so the mapping is the
 * one the user asked for: draw C4 out of standard UML deployment elements and let the stereotype
 * say which C4 abstraction each box is. A container and a component get the two node types that
 * already look like software (`deploymentComponent`, `deploymentArtifact`); a person, a system, a
 * boundary and a deployment node get `deploymentNode`, whose `stereotype` field is free text and
 * renders as `«person»`/`«system»`/… in the box header.
 */
private fun apollonTypeFor(kind: C4Kind): String =
    when (kind) {
        C4Kind.CONTAINER -> "deploymentComponent"
        C4Kind.COMPONENT -> "deploymentArtifact"
        else -> "deploymentNode"
    }

private fun stereotypeFor(kind: C4Kind): String? =
    when (kind) {
        C4Kind.PERSON -> "person"
        C4Kind.SYSTEM -> "system"
        C4Kind.BOUNDARY -> "boundary"
        C4Kind.NODE -> "node"
        C4Kind.CONTAINER, C4Kind.COMPONENT -> null
    }

/** The inverse of [apollonTypeFor] + [stereotypeFor]: what the canvas is now saying this box is.
 *  Read back from the model rather than from the residual, so re-stereotyping a box on the canvas
 *  really does change which C4 macro it is written out as. */
private fun kindFor(
    nodeType: String?,
    stereotype: String?,
): C4Kind =
    when {
        nodeType == "deploymentComponent" -> C4Kind.CONTAINER
        nodeType == "deploymentArtifact" -> C4Kind.COMPONENT
        stereotype.equals("person", ignoreCase = true) -> C4Kind.PERSON
        stereotype.equals("boundary", ignoreCase = true) -> C4Kind.BOUNDARY
        stereotype.equals("node", ignoreCase = true) -> C4Kind.NODE
        stereotype.equals("device", ignoreCase = true) -> C4Kind.NODE
        else -> C4Kind.SYSTEM
    }

private fun defaultMacroFor(kind: C4Kind): String =
    when (kind) {
        C4Kind.PERSON -> "Person"
        C4Kind.SYSTEM -> "System"
        C4Kind.CONTAINER -> "Container"
        C4Kind.COMPONENT -> "Component"
        C4Kind.BOUNDARY -> "System_Boundary"
        C4Kind.NODE -> "Deployment_Node"
    }

private fun defaultSizeFor(kind: C4Kind): Size =
    when (kind) {
        C4Kind.PERSON -> Size(160, 100)
        C4Kind.SYSTEM -> Size(180, 100)
        C4Kind.CONTAINER -> Size(180, 100)
        C4Kind.COMPONENT -> Size(160, 80)
        C4Kind.BOUNDARY -> Size(240, 160)
        C4Kind.NODE -> Size(200, 140)
    }

/** Roughly the pixel width one character of the description font takes. Only ever used to guess how
 *  tall a *new* box should be — the canvas measures text properly, and a box the user has already
 *  sized keeps its remembered height. */
private const val DETAIL_CHAR_WIDTH = 6
private const val DETAIL_LINE_HEIGHT = 15
private const val DETAIL_MAX_LINES = 4

/**
 * The default box, grown to fit the technology marker and description it turns out to carry.
 *
 * Without this a freshly opened C4 file would clip most of its descriptions: the sizes above were
 * chosen for a box holding a name and nothing else. It is a guess rather than a measurement because
 * the mapper runs in the IDE with no font metrics; being a little too tall costs nothing, and the
 * moment the user drags a corner the remembered height wins instead.
 */
private fun detailHeight(element: PumlC4Element): Int {
    val spec = c4ArgSpecFor(element.macro)
    val technology = C4Slots.read(element.extras, spec.technology)
    val description = C4Slots.read(element.extras, spec.description)
    if (technology.isEmpty() && description.isEmpty()) return 0
    val descriptionLines =
        if (description.isEmpty()) {
            0
        } else {
            val perLine = maxOf(1, (defaultSizeFor(element.kind).width - 2 * CONTAINER_PADDING) / DETAIL_CHAR_WIDTH)
            minOf(DETAIL_MAX_LINES, (description.length + perLine - 1) / perLine)
        }
    return ((if (technology.isEmpty()) 0 else 1) + descriptionLines) * DETAIL_LINE_HEIGHT
}

private fun defaultSizeFor(element: PumlC4Element): Size {
    val base = defaultSizeFor(element.kind)
    return Size(base.width, base.height + detailHeight(element))
}

private fun apollonEdgeTypeFor(kind: C4RelationKind): String =
    when (kind) {
        C4RelationKind.DIRECTED -> "DeploymentDependency"
        C4RelationKind.BIDIRECTIONAL -> "DeploymentAssociation"
    }

private fun c4RelationKindForEdge(apollonEdgeType: String): C4RelationKind? =
    when (apollonEdgeType) {
        "DeploymentDependency" -> C4RelationKind.DIRECTED
        "DeploymentAssociation" -> C4RelationKind.BIDIRECTIONAL
        else -> null
    }

/**
 * [PumlC4Diagram] <-> Apollon `DeploymentDiagram` JSON.
 *
 * Shares the merge-by-display-name, container-sizing and `parentId`-nesting pattern of
 * [DeploymentModelMapper], with one difference that matters: nesting is recursive rather than one
 * level deep, because a C4 diagram is mostly boundaries inside boundaries.
 *
 * Three source facts have no field in the Apollon model and ride through [PumlResidual] instead,
 * keyed by node/edge id exactly like a class's source keyword does:
 * the exact macro (`typeKeywords` / `arrowTokens`), the alias every `Rel(...)` refers to
 * (`elementAliases`), and each macro's remaining arguments (`c4Extras`).
 *
 * Two of those arguments are lifted out of the residual and onto the element itself: the bracketed
 * technology marker and the description, which Apollon renders under a box's name and under a
 * relation's label. [c4ArgSpecFor] says where each macro keeps them and [C4Slots] puts an edited
 * value back in the slot it came from, so the `$sprite`/`$tags`/`$link` sitting either side of it
 * are undisturbed. Those three have no field anywhere in Apollon and stay in the residual, so the
 * Text tab is still where they change.
 */
object C4ModelMapper {
    fun toApollonModel(
        diagram: PumlC4Diagram,
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
            val type = textOf(edge["type"]) ?: return@forEach
            prevEdgesByKey.getOrPut("$srcName|$tgtName|$type") { mutableListOf() }.add(edge)
        }

        var maxBottom = 0
        prevNodes.forEach { node ->
            if (textOf(node["parentId"]) != null) return@forEach
            val y = numberOf(objOf(node["position"])?.get("y")) ?: 0
            val h = numberOf(node["height"]) ?: 0
            maxBottom = maxOf(maxBottom, y + h)
        }
        val originY = if (prevNodes.isEmpty()) 60 else maxBottom + 120

        val childrenByParent = diagram.elements.filter { it.parentRefId != null }.groupBy { it.parentRefId }
        val topLevel = diagram.elements.filter { it.parentRefId == null }
        val freshPositions =
            PumlLayout.gridPositions(topLevel.count { prevIdByName[it.displayName] == null }, 60, originY).iterator()

        val typeKeywords = mutableMapOf<String, String>()
        val elementAliases = mutableMapOf<String, String>()
        val c4Extras = mutableMapOf<String, String>()
        val idByRefId = mutableMapOf<String, String>()
        val rectById = mutableMapOf<String, Rect>()
        val newNodes = mutableListOf<JsonObject>()
        val laidOut = mutableSetOf<String>()

        /** A container the source has just introduced has no remembered size, so make one that
         *  holds the stack this is about to place inside it — all the way down. */
        fun freshSize(
            element: PumlC4Element,
            seen: Set<String>,
        ): Size {
            val children = childrenByParent[element.refId].orEmpty().filterNot { it.refId in seen }
            if (children.isEmpty()) return defaultSizeFor(element)
            val sizes = children.map { freshSize(it, seen + element.refId) }
            val width = sizes.maxOf { it.width } + 2 * CONTAINER_PADDING
            val height =
                CONTAINER_HEADER + detailHeight(element) + CONTAINER_SPACING +
                    sizes.sumOf { it.height + CONTAINER_SPACING }
            return Size(width, height)
        }

        fun emit(
            element: PumlC4Element,
            parentId: String?,
            parentOrigin: Point,
            fallback: Point,
        ) {
            // A refId that names itself as its own ancestor cannot come out of the importer's
            // stack, but a hand-edited file could contain one and it would recurse forever.
            if (!laidOut.add(element.refId)) return

            val existingId = prevIdByName[element.displayName]
            val existing = existingId?.let { prevNodeById[it] }
            val id = existingId ?: UUID.randomUUID().toString()
            idByRefId[element.refId] = id
            typeKeywords[id] = element.macro
            elementAliases[id] = element.refId
            if (element.extras.isNotEmpty()) c4Extras[id] = element.extras.joinToString(", ")

            val relative =
                if (existing != null) {
                    val p = objOf(existing["position"])
                    Point(numberOf(p?.get("x")) ?: fallback.x, numberOf(p?.get("y")) ?: fallback.y)
                } else {
                    fallback
                }
            val fresh = freshSize(element, emptySet())
            val size =
                if (existing != null) {
                    Size(numberOf(existing["width"]) ?: fresh.width, numberOf(existing["height"]) ?: fresh.height)
                } else {
                    fresh
                }
            val absolute = Point(parentOrigin.x + relative.x, parentOrigin.y + relative.y)

            val existingData = existing?.let { objOf(it["data"]) }
            val spec = c4ArgSpecFor(element.macro)
            val technology = C4Slots.read(element.extras, spec.technology)
            val description = C4Slots.read(element.extras, spec.description)
            newNodes +=
                buildJsonObject {
                    put("id", id)
                    put("width", size.width)
                    put("height", size.height)
                    put("type", apollonTypeFor(element.kind))
                    put("position", buildJsonObject { put("x", relative.x); put("y", relative.y) })
                    if (parentId != null) put("parentId", parentId)
                    put(
                        "data",
                        buildJsonObject {
                            put("name", element.displayName)
                            if (apollonTypeFor(element.kind) != "deploymentArtifact") put("isComponentHeaderShown", true)
                            stereotypeFor(element.kind)?.let { put("stereotype", it) }
                            if (technology.isNotEmpty()) put("technology", technology)
                            if (description.isNotEmpty()) put("description", description)
                            existingData?.get("fillColor")?.let { put("fillColor", it) }
                            existingData?.get("strokeColor")?.let { put("strokeColor", it) }
                            existingData?.get("textColor")?.let { put("textColor", it) }
                            existingData?.get("tags")?.let { put("tags", it) }
                        },
                    )
                    put("measured", buildJsonObject { put("width", size.width); put("height", size.height) })
                }
            rectById[id] = Rect(absolute.x, absolute.y, size.width, size.height)

            var cursorY = CONTAINER_HEADER + detailHeight(element) + CONTAINER_SPACING
            childrenByParent[element.refId].orEmpty().forEach { child ->
                emit(child, id, absolute, Point(CONTAINER_PADDING, cursorY))
                if (prevIdByName[child.displayName] == null) {
                    cursorY += freshSize(child, emptySet()).height + CONTAINER_SPACING
                }
            }
        }

        topLevel.forEach { element ->
            val fallback = if (prevIdByName[element.displayName] == null && freshPositions.hasNext()) freshPositions.next() else Point(60, originY)
            emit(element, null, Point(0, 0), fallback)
        }

        val arrowTokens = mutableMapOf<String, String>()
        val consumed = mutableMapOf<String, Int>()
        val newEdges = mutableListOf<JsonObject>()
        diagram.relations.forEach { relation ->
            val sourceId = idByRefId[relation.sourceRefId] ?: return@forEach
            val targetId = idByRefId[relation.targetRefId] ?: return@forEach
            val apollonType = apollonEdgeTypeFor(relation.kind)
            val key = "${relation.sourceRefId}|${relation.targetRefId}|$apollonType"
            val index = consumed.getOrDefault(key, 0)
            consumed[key] = index + 1
            val existing = prevEdgesByKey[key]?.getOrNull(index)
            val id = existing?.let { textOf(it["id"]) } ?: UUID.randomUUID().toString()
            arrowTokens[id] = relation.macro
            if (relation.extras.isNotEmpty()) c4Extras[id] = relation.extras.joinToString(", ")

            val handles =
                if (existing != null) {
                    (textOf(existing["sourceHandle"]) ?: "bottom") to (textOf(existing["targetHandle"]) ?: "top")
                } else {
                    val sourceRect = rectById[sourceId]
                    val targetRect = rectById[targetId]
                    if (sourceRect != null && targetRect != null) {
                        PumlLayout.chooseHandles(sourceRect, targetRect)
                    } else {
                        "bottom" to "top"
                    }
                }
            val existingData = existing?.let { objOf(it["data"]) }
            val spec = c4ArgSpecFor(relation.macro)
            val technology = C4Slots.read(relation.extras, spec.technology)
            val description = C4Slots.read(relation.extras, spec.description)
            newEdges +=
                buildJsonObject {
                    put("id", id)
                    put("source", sourceId)
                    put("target", targetId)
                    put("type", apollonType)
                    put("sourceHandle", handles.first)
                    put("targetHandle", handles.second)
                    put(
                        "data",
                        buildJsonObject {
                            put("points", existingData?.get("points") ?: buildJsonArray {})
                            if (relation.label.isNotEmpty()) put("label", relation.label)
                            if (technology.isNotEmpty()) put("technology", technology)
                            if (description.isNotEmpty()) put("description", description)
                            existingData?.get("strokeColor")?.let { put("strokeColor", it) }
                            existingData?.get("textColor")?.let { put("textColor", it) }
                        },
                    )
                }
        }

        val notesOrigin = Point(60, (rectById.values.maxOfOrNull { it.y + it.height } ?: originY) + 120)
        val (noteNodes, noteEdges) =
            PumlNotes.emit(
                notes = diagram.notes,
                anchorIdOf = { ref -> idByRefId[ref] },
                rectById = rectById,
                previousNote = { noteText -> prevIdByName[noteText]?.let { prevNodeById[it] } },
                previousAnchorEdge = { noteText, anchor -> prevEdgesByKey["$noteText|$anchor|$NOTE_EDGE_TYPE"]?.firstOrNull() },
                fallbackOrigin = notesOrigin,
            )

        val model =
            buildJsonObject {
                put("version", MODEL_SCHEMA_VERSION)
                put("id", textOf(previous?.get("id")) ?: UUID.randomUUID().toString())
                put("title", title)
                // C4 has no Apollon diagram type of its own; the deployment palette is the one
                // whose elements it is drawn out of. See [apollonTypeFor].
                put("type", "DeploymentDiagram")
                put("nodes", buildJsonArray { (newNodes + noteNodes).forEach { add(it) } })
                put("edges", buildJsonArray { (newEdges + noteEdges).forEach { add(it) } })
                put("assessments", objOf(previous?.get("assessments")) ?: buildJsonObject {})
            }
        return MappedModel(model, typeKeywords, arrowTokens, elementAliases, c4Extras = c4Extras)
    }

    fun toPumlDiagram(
        model: JsonObject,
        residual: PumlResidual,
    ): C4PumlExport {
        val nodes =
            arrOf(model["nodes"]).filterNot { isAnnotationNode(textOf(it["type"])) || textOf(it["type"]) == NOTE_NODE_TYPE }
        val refIdById = mutableMapOf<String, String>()
        val usedRefIds = mutableSetOf<String>()

        fun freshRefId(displayName: String): String {
            val base = if (C4_BARE_IDENT.matches(displayName)) displayName else "el" + (usedRefIds.size + 1)
            var candidate = base
            var n = 1
            while (!usedRefIds.add(candidate)) candidate = "$base${n++}"
            return candidate
        }

        val typeKeywords = mutableMapOf<String, String>()
        val elementAliases = mutableMapOf<String, String>()
        val c4Extras = mutableMapOf<String, String>()

        val elements =
            nodes.map { node ->
                val id = textOf(node["id"]) ?: UUID.randomUUID().toString()
                val data = objOf(node["data"]) ?: JsonObject(emptyMap())
                val displayName = PumlName.forPuml(textOf(data["name"]))
                val kind = kindFor(textOf(node["type"]), textOf(data["stereotype"]))
                val alias = residual.elementAliases[id]
                val refId = (alias?.takeIf { C4_BARE_IDENT.matches(it) } ?: freshRefId(displayName)).also { usedRefIds.add(it) }
                refIdById[id] = refId
                elementAliases[id] = refId
                // The remembered macro only applies while the box is still the same C4 thing:
                // re-stereotyping `«person»` to `«system»` on the canvas has to change the macro.
                val remembered = residual.typeKeywords[id]
                val macro = remembered?.takeIf { C4_ELEMENT_MACROS[it] == kind } ?: defaultMacroFor(kind)
                typeKeywords[id] = macro
                // Arguments belong to the macro they were written for — `Person`'s first extra
                // argument is a description, `Container`'s is a technology. When the canvas turns a
                // box into something else the old macro's arguments would be read as different
                // things by the new one, so they go rather than being silently reinterpreted.
                val carried = if (macro == remembered) residual.c4Extras[id]?.let { C4Args.split(it) }.orEmpty() else emptyList()
                val spec = c4ArgSpecFor(macro)
                val extras =
                    C4Slots.write(carried, spec.technology, textOf(data["technology"])?.trim().orEmpty())
                        .let { C4Slots.write(it, spec.description, textOf(data["description"])?.trim().orEmpty()) }
                if (extras.isNotEmpty()) c4Extras[id] = extras.joinToString(", ")
                node to PumlC4Element(refId, displayName, kind, macro, extras)
            }

        val elementsWithParent =
            elements.map { (node, element) ->
                element.copy(parentRefId = textOf(node["parentId"])?.let { refIdById[it] })
            }

        val arrowTokens = mutableMapOf<String, String>()
        val relations =
            arrOf(model["edges"]).mapNotNull { edge ->
                val id = textOf(edge["id"]) ?: return@mapNotNull null
                val kind = c4RelationKindForEdge(textOf(edge["type"]) ?: return@mapNotNull null) ?: return@mapNotNull null
                val sourceRefId = refIdById[textOf(edge["source"])] ?: return@mapNotNull null
                val targetRefId = refIdById[textOf(edge["target"])] ?: return@mapNotNull null
                val data = objOf(edge["data"]) ?: JsonObject(emptyMap())
                val macro = residual.arrowTokens[id]?.takeIf { c4RelationKindOf(it) == kind } ?: if (kind == C4RelationKind.BIDIRECTIONAL) "BiRel" else "Rel"
                arrowTokens[id] = macro
                // Every Rel spelling shares one signature, so unlike an element's, a relation's
                // arguments survive a change of macro — a `Rel` turned into a `BiRel` still keeps
                // its technology at the same index.
                val spec = c4ArgSpecFor(macro)
                val extras =
                    C4Slots.write(residual.c4Extras[id]?.let { C4Args.split(it) }.orEmpty(), spec.technology, textOf(data["technology"])?.trim().orEmpty())
                        .let { C4Slots.write(it, spec.description, textOf(data["description"])?.trim().orEmpty()) }
                if (extras.isNotEmpty()) c4Extras[id] = extras.joinToString(", ")
                PumlC4Relation(sourceRefId, targetRefId, kind, macro, textOf(data["label"]) ?: "", extras)
            }

        val notes = PumlNotes.fromModel(model, refIdById)
        return C4PumlExport(
            PumlC4Diagram(null, elementsWithParent, relations, notes),
            typeKeywords,
            arrowTokens,
            elementAliases,
            c4Extras,
        )
    }

    /** Element name -> the `(technology, description)` pair the canvas is carrying for it. Paired
     *  with [signature] as the C4 input to [RoundTripValidator]. */
    fun detailSignature(model: JsonObject): Map<String, Pair<String, String>> =
        arrOf(model["nodes"])
            .filterNot { isAnnotationNode(textOf(it["type"])) || textOf(it["type"]) == NOTE_NODE_TYPE }
            .associate { node ->
                val data = objOf(node["data"]) ?: JsonObject(emptyMap())
                PumlName.forPuml(textOf(data["name"])) to
                    (textOf(data["technology"])?.trim().orEmpty() to textOf(data["description"])?.trim().orEmpty())
            }

    /** `(source, target, type, technology, description)` per relation, as a multiset. The relation
     *  half of [detailSignature] — see [RoundTripValidator]. */
    fun relationDetailSignature(model: JsonObject): Map<List<String>, Int> {
        val nameById = elementNamesById(model)
        return arrOf(model["edges"]).mapNotNull { edge ->
            val src = nameById[textOf(edge["source"])] ?: return@mapNotNull null
            val tgt = nameById[textOf(edge["target"])] ?: return@mapNotNull null
            val type = textOf(edge["type"]) ?: return@mapNotNull null
            if (c4RelationKindForEdge(type) == null) return@mapNotNull null
            val data = objOf(edge["data"]) ?: JsonObject(emptyMap())
            listOf(
                src,
                tgt,
                type,
                textOf(data["technology"])?.trim().orEmpty(),
                textOf(data["description"])?.trim().orEmpty(),
            )
        }.groupingBy { it }.eachCount()
    }

    /** Element-name set + `(source,target,type)` relation multiset — the C4 input to
     *  [RoundTripValidator]. */
    fun signature(model: JsonObject): Pair<Set<String>, List<Triple<String, String, String>>> {
        val nameById = elementNamesById(model)
        val relations =
            arrOf(model["edges"]).mapNotNull { edge ->
                val src = nameById[textOf(edge["source"])] ?: return@mapNotNull null
                val tgt = nameById[textOf(edge["target"])] ?: return@mapNotNull null
                val type = textOf(edge["type"]) ?: return@mapNotNull null
                if (c4RelationKindForEdge(type) == null) return@mapNotNull null
                Triple(src, tgt, type)
            }
        return nameById.values.toSet() to relations
    }

    private fun elementNamesById(model: JsonObject): Map<String, String> =
        arrOf(model["nodes"])
            .filterNot { isAnnotationNode(textOf(it["type"])) || textOf(it["type"]) == NOTE_NODE_TYPE }
            .mapNotNull { node ->
                val id = textOf(node["id"]) ?: return@mapNotNull null
                id to PumlName.forPuml(textOf(objOf(node["data"])?.get("name")))
            }.toMap()
}
