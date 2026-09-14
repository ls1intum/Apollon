package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

/** The Apollon model schema version this converter writes — matches `DiagramDocument.scaffoldModel`. */
private const val MODEL_SCHEMA_VERSION = "4.0.0"

/** Inset, gap and title-bar allowance used to lay a fresh `package` out around its classes —
 *  the same three the Component family's subsystem container uses. */
private const val PACKAGE_PADDING = 20
private const val PACKAGE_SPACING = 20
private const val PACKAGE_HEADER = 40

data class MappedModel(
    val model: JsonObject,
    val typeKeywords: Map<String, String>,
    val arrowTokens: Map<String, String>,
    /** nodeId -> source `as <alias>` — see [PumlResidual.elementAliases]. */
    val elementAliases: Map<String, String> = emptyMap(),
    /** nodeId/edgeId -> C4 macro arguments the canvas has no field for — see [PumlResidual.c4Extras]. */
    val c4Extras: Map<String, String> = emptyMap(),
    /** nodeId -> a class declaration's `<<stereotype>>`s — see [PumlResidual.typeStereotypes]. */
    val typeStereotypes: Map<String, String> = emptyMap(),
    /** nodeId -> a class body's source lines — see [PumlResidual.typeBodies]. */
    val typeBodies: Map<String, String> = emptyMap(),
)

data class PumlExport(
    val diagram: PumlDiagram,
    val typeKeywords: Map<String, String>,
    val arrowTokens: Map<String, String>,
    val elementAliases: Map<String, String> = emptyMap(),
    val typeStereotypes: Map<String, String> = emptyMap(),
    val typeBodies: Map<String, String> = emptyMap(),
)

private fun obj(e: JsonElement?) = e as? JsonObject

private fun arr(e: JsonElement?) = e as? JsonArray

private fun text(e: JsonElement?) = (e as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun flag(e: JsonElement?) = (e as? JsonPrimitive)?.content == "true"

private fun number(e: JsonElement?): Int? = (e as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt()

/**
 * The only file that knows both the [PumlDiagram] vocabulary and the Apollon `UMLModel` JSON
 * shape (plan §1, context §1). [toApollonModel] additionally performs the plan's §A6 merge: a
 * re-import keeps every existing node's id/position/size/colour when its classifier name still
 * exists in the new parse, so editing one line of a `.puml` file never discards the user's canvas
 * layout.
 */
object ApollonModelMapper {
    fun toApollonModel(
        diagram: PumlDiagram,
        previous: JsonObject?,
        title: String,
    ): MappedModel {
        val prevNodes = arr(previous?.get("nodes"))?.mapNotNull { obj(it) } ?: emptyList()
        val prevEdges = arr(previous?.get("edges"))?.mapNotNull { obj(it) } ?: emptyList()

        val prevIdByName = mutableMapOf<String, String>()
        val prevNodeById = mutableMapOf<String, JsonObject>()
        prevNodes.forEach { node ->
            val id = text(node["id"]) ?: return@forEach
            val name = text(obj(node["data"])?.get("name")) ?: return@forEach
            prevIdByName[name] = id
            prevNodeById[id] = node
        }
        val prevNameById = prevIdByName.entries.associate { (name, id) -> id to name }

        val prevEdgesByKey = LinkedHashMap<String, MutableList<JsonObject>>()
        prevEdges.forEach { edge ->
            val srcName = prevNameById[text(edge["source"])] ?: return@forEach
            val tgtName = prevNameById[text(edge["target"])] ?: return@forEach
            val type = text(edge["type"]) ?: return@forEach
            prevEdgesByKey.getOrPut("$srcName|$tgtName|$type") { mutableListOf() }.add(edge)
        }

        var maxBottom = 0
        prevNodes.forEach { node ->
            val y = number(obj(node["position"])?.get("y")) ?: 0
            val h = number(node["height"]) ?: 0
            maxBottom = maxOf(maxBottom, y + h)
        }
        val originY = if (prevNodes.isEmpty()) 60 else maxBottom + 120
        // Packages take a grid slot of their own; their children are placed inside them instead.
        // The grid is sized by the boxes that will go in it, so a class with a long member list
        // pushes the row below it down rather than being drawn on top of it.
        val typesByPackage = diagram.types.filter { it.parentName != null }.groupBy { it.parentName }
        val freshSizes =
            diagram.types.filter { it.parentName == null && prevIdByName[it.name] == null }.map { PumlLayout.sizeOf(it) } +
                diagram.packages.filter { prevIdByName[it.name] == null }
                    .map { freshPackageSize(typesByPackage[it.name].orEmpty()) }
        val freshPositions = PumlLayout.gridPositions(freshSizes, 60, originY).iterator()

        val typeKeywords = mutableMapOf<String, String>()
        val elementAliases = mutableMapOf<String, String>()
        val typeStereotypes = mutableMapOf<String, String>()
        val typeBodies = mutableMapOf<String, String>()
        // Keyed by [PumlType.refId] — an alias where a type has one — because that is what a
        // relation line and a note anchor name it by.
        val idByRef = mutableMapOf<String, String>()
        val rectById = mutableMapOf<String, Rect>()
        val newNodes = mutableListOf<JsonObject>()

        fun emitType(
            type: PumlType,
            id: String,
            existing: JsonObject?,
            position: JsonObject,
            width: Int,
            height: Int,
            parentId: String?,
        ) {
            typeKeywords[id] = type.keyword
            type.alias?.let { elementAliases[id] = it }
            type.stereotype?.let { typeStereotypes[id] = it }
            if (type.bodySource.isNotEmpty()) typeBodies[id] = type.bodySource.joinToString("\n")
            idByRef[type.refId] = id
            val existingData = existing?.let { obj(it["data"]) }
            val data =
                buildJsonObject {
                    put("name", type.name)
                    when (type.kind) {
                        PumlKind.INTERFACE -> put("stereotype", "interface")
                        PumlKind.ENUM -> put("stereotype", "enumeration")
                        PumlKind.ABSTRACT_CLASS -> put("isAbstract", true)
                        else -> {}
                    }
                    put("attributes", buildJsonArray { type.attributes.forEachIndexed { i, m -> add(memberJson(m, existingData, "attributes", i)) } })
                    put("methods", buildJsonArray { type.methods.forEachIndexed { i, m -> add(memberJson(m, existingData, "methods", i)) } })
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
                    put("type", "class")
                    put("position", position)
                    // React Flow reads a child's position as relative to its parent, which is also
                    // how the Component/Deployment families already store nesting.
                    if (parentId != null) put("parentId", parentId)
                    put("data", data)
                    put("measured", buildJsonObject { put("width", width); put("height", height) })
                }
        }

        diagram.types.filter { it.parentName == null }.forEach { type ->
            val existingId = prevIdByName[type.name]
            val existing = existingId?.let { prevNodeById[it] }
            val id = existingId ?: UUID.randomUUID().toString()
            val size = PumlLayout.sizeOf(type)
            val position =
                if (existing != null) {
                    obj(existing["position"]) ?: buildJsonObject { put("x", 0); put("y", 0) }
                } else {
                    val p = freshPositions.next()
                    buildJsonObject { put("x", p.x); put("y", p.y) }
                }
            val width = if (existing != null) number(existing["width"]) ?: size.width else size.width
            val height = if (existing != null) number(existing["height"]) ?: size.height else size.height
            emitType(type, id, existing, position, width, height, null)
            rectById[id] = Rect(number(position["x"]) ?: 0, number(position["y"]) ?: 0, width, height)
        }

        diagram.packages.forEach { pkg ->
            val children = typesByPackage[pkg.name].orEmpty()
            val existingId = prevIdByName[pkg.name]
            val existing = existingId?.let { prevNodeById[it] }
            val pkgId = existingId ?: UUID.randomUUID().toString()
            idByRef[pkg.name] = pkgId

            val pkgPosition =
                if (existing != null) {
                    obj(existing["position"]) ?: buildJsonObject { put("x", 0); put("y", 0) }
                } else {
                    val p = freshPositions.next()
                    buildJsonObject { put("x", p.x); put("y", p.y) }
                }
            val fresh = freshPackageSize(children)
            val pkgWidth = if (existing != null) number(existing["width"]) ?: fresh.width else fresh.width
            val pkgHeight = if (existing != null) number(existing["height"]) ?: fresh.height else fresh.height
            val existingPkgData = existing?.let { obj(it["data"]) }
            newNodes +=
                buildJsonObject {
                    put("id", pkgId)
                    put("width", pkgWidth)
                    put("height", pkgHeight)
                    put("type", "package")
                    put("position", pkgPosition)
                    put(
                        "data",
                        buildJsonObject {
                            put("name", pkg.name)
                            existingPkgData?.get("fillColor")?.let { put("fillColor", it) }
                            existingPkgData?.get("strokeColor")?.let { put("strokeColor", it) }
                            existingPkgData?.get("textColor")?.let { put("textColor", it) }
                        },
                    )
                    put("measured", buildJsonObject { put("width", pkgWidth); put("height", pkgHeight) })
                }
            val pkgX = number(pkgPosition["x"]) ?: 0
            val pkgY = number(pkgPosition["y"]) ?: 0
            rectById[pkgId] = Rect(pkgX, pkgY, pkgWidth, pkgHeight)

            var cursorY = PACKAGE_HEADER + PACKAGE_SPACING
            children.forEach { type ->
                val childExistingId = prevIdByName[type.name]
                val childExisting = childExistingId?.let { prevNodeById[it] }
                val childId = childExistingId ?: UUID.randomUUID().toString()
                val size = PumlLayout.sizeOf(type)
                val position: JsonObject
                val width: Int
                val height: Int
                if (childExisting != null) {
                    position = obj(childExisting["position"]) ?: buildJsonObject { put("x", PACKAGE_PADDING); put("y", cursorY) }
                    width = number(childExisting["width"]) ?: size.width
                    height = number(childExisting["height"]) ?: size.height
                } else {
                    position = buildJsonObject { put("x", PACKAGE_PADDING); put("y", cursorY) }
                    width = size.width
                    height = size.height
                }
                // Advanced for a remembered child too, not only a fresh one: a package that mixes
                // the two would otherwise stack every fresh class at the same y, on top of each
                // other and on top of whichever remembered class already sits there.
                cursorY = maxOf(cursorY, (number(position["y"]) ?: cursorY) + height) + PACKAGE_SPACING
                emitType(type, childId, childExisting, position, width, height, pkgId)
                rectById[childId] =
                    Rect(pkgX + (number(position["x"]) ?: 0), pkgY + (number(position["y"]) ?: 0), width, height)
            }
        }

        val arrowTokens = mutableMapOf<String, String>()
        val consumed = mutableMapOf<String, Int>()
        val newEdges = mutableListOf<JsonObject>()
        diagram.relations.forEach { rel ->
            val sourceId = idByRef[rel.sourceName] ?: return@forEach
            val targetId = idByRef[rel.targetName] ?: return@forEach
            val apollonType = apollonEdgeType(rel.kind)
            val key = "${rel.sourceName}|${rel.targetName}|$apollonType"
            val idx = consumed.getOrDefault(key, 0)
            consumed[key] = idx + 1
            val existing = prevEdgesByKey[key]?.getOrNull(idx)
            val id = existing?.let { text(it["id"]) } ?: UUID.randomUUID().toString()
            arrowTokens[id] = rel.arrowToken

            val handles =
                if (existing != null) {
                    (text(existing["sourceHandle"]) ?: "bottom") to (text(existing["targetHandle"]) ?: "top")
                } else {
                    val sr = rectById[sourceId]
                    val tr = rectById[targetId]
                    if (sr != null && tr != null) PumlLayout.chooseHandles(sr, tr) else "bottom" to "top"
                }
            val existingData = existing?.let { obj(it["data"]) }
            val edge =
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
            newEdges += edge
        }

        // Notes last: they anchor to elements by name, so every classifier and package has to
        // have an id and a rectangle before a note can be placed beside one.
        val notesOrigin = Point(60, (rectById.values.maxOfOrNull { it.y + it.height } ?: originY) + 120)
        val (noteNodes, noteEdges) =
            PumlNotes.emit(
                notes = diagram.notes,
                anchorIdOf = { name -> idByRef[name] },
                rectById = rectById,
                previousNote = { noteText -> prevIdByName[noteText]?.let { prevNodeById[it] } },
                previousAnchorEdge = { noteText, anchor -> prevEdgesByKey["$noteText|$anchor|$NOTE_EDGE_TYPE"]?.firstOrNull() },
                fallbackOrigin = notesOrigin,
            )

        val model =
            buildJsonObject {
                put("version", MODEL_SCHEMA_VERSION)
                put("id", text(previous?.get("id")) ?: UUID.randomUUID().toString())
                put("title", title)
                put("type", "ClassDiagram")
                put("nodes", JsonArray(newNodes + noteNodes))
                put("edges", JsonArray(newEdges + noteEdges))
                put("assessments", obj(previous?.get("assessments")) ?: buildJsonObject {})
            }
        return MappedModel(
            model,
            typeKeywords,
            arrowTokens,
            elementAliases,
            typeStereotypes = typeStereotypes,
            typeBodies = typeBodies,
        )
    }

    /** Also returns the [PumlResidual] carrier maps narrowed to the ids still present in [model] —
     *  callers persist these back onto the residual so a deleted node/edge's keyword, arrow token,
     *  alias, stereotype or body doesn't linger forever (spec §11). */
    fun toPumlDiagram(
        model: JsonObject,
        residual: PumlResidual,
    ): PumlExport {
        val nodes =
            (arr(model["nodes"])?.mapNotNull { obj(it) } ?: emptyList())
                .filterNot { isAnnotationNode(text(it["type"])) || text(it["type"]) == NOTE_NODE_TYPE }
        val edges = arr(model["edges"])?.mapNotNull { obj(it) } ?: emptyList()
        // Relations and note anchors are written with the name the *source* uses for a type, which
        // is its alias where it has one — see [PumlType.refId].
        val refIdById = mutableMapOf<String, String>()
        val typeKeywords = mutableMapOf<String, String>()
        val arrowTokens = mutableMapOf<String, String>()
        val elementAliases = mutableMapOf<String, String>()
        val typeStereotypes = mutableMapOf<String, String>()
        val typeBodies = mutableMapOf<String, String>()

        // A `package` node is a grouping, not a classifier: it becomes a `package X { ... }` block
        // and never a `class` line. Before this split every node type in the palette — package and
        // note alike — fell through to PumlKind.CLASS and was written out as a class.
        val packageNodes = nodes.filter { text(it["type"]) == "package" }
        val packageNameById =
            packageNodes.mapNotNull { node ->
                val id = text(node["id"]) ?: return@mapNotNull null
                id to PumlName.forPuml(text(obj(node["data"])?.get("name")))
            }.toMap()
        packageNameById.forEach { (id, name) -> refIdById[id] = name }

        val types =
            nodes.filterNot { text(it["type"]) == "package" }.map { node ->
                val id = text(node["id"]) ?: UUID.randomUUID().toString()
                val data = obj(node["data"]) ?: JsonObject(emptyMap())
                val name = PumlName.forPuml(text(data["name"]))
                // An alias only stays valid while it still names something: a node renamed on the
                // canvas keeps its alias (that is the point — relation lines go on referencing it),
                // but a node the canvas has just created has none and gets its name instead.
                val alias = residual.elementAliases[id]
                refIdById[id] = alias ?: name
                alias?.let { elementAliases[id] = it }
                residual.typeStereotypes[id]?.let { typeStereotypes[id] = it }
                val bodySource = residual.typeBodies[id]?.split("\n").orEmpty()
                if (bodySource.isNotEmpty()) typeBodies[id] = bodySource.joinToString("\n")
                val stereotype = text(data["stereotype"])
                val isAbstractClass = flag(data["isAbstract"])
                val kind =
                    when (stereotype) {
                        "interface" -> PumlKind.INTERFACE
                        "enumeration" -> PumlKind.ENUM
                        else -> if (isAbstractClass) PumlKind.ABSTRACT_CLASS else PumlKind.CLASS
                    }
                val keyword = residual.typeKeywords[id] ?: defaultKeyword(kind)
                typeKeywords[id] = keyword
                val attributes = arr(data["attributes"])?.mapNotNull { memberFromJson(it, isMethod = false) } ?: emptyList()
                val methods = arr(data["methods"])?.mapNotNull { memberFromJson(it, isMethod = true) } ?: emptyList()
                PumlType(
                    name,
                    kind,
                    attributes,
                    methods,
                    keyword,
                    packageNameById[text(node["parentId"])],
                    alias,
                    residual.typeStereotypes[id],
                    bodySource,
                )
            }

        val relations =
            edges.mapNotNull { edge ->
                val id = text(edge["id"]) ?: return@mapNotNull null
                val sourceName = refIdById[text(edge["source"])] ?: return@mapNotNull null
                val targetName = refIdById[text(edge["target"])] ?: return@mapNotNull null
                val kind = pumlRelationKind(text(edge["type"]) ?: return@mapNotNull null) ?: return@mapNotNull null
                val data = obj(edge["data"]) ?: JsonObject(emptyMap())
                val arrowToken = residual.arrowTokens[id] ?: canonicalArrowToken(kind)
                arrowTokens[id] = arrowToken
                PumlRelation(
                    sourceName = sourceName,
                    targetName = targetName,
                    kind = kind,
                    sourceMultiplicity = text(data["sourceMultiplicity"]) ?: "",
                    sourceRole = text(data["sourceRole"]) ?: "",
                    targetMultiplicity = text(data["targetMultiplicity"]) ?: "",
                    targetRole = text(data["targetRole"]) ?: "",
                    label = text(data["label"]) ?: "",
                    arrowToken = arrowToken,
                )
            }

        val packages = packageNodes.mapNotNull { node -> packageNameById[text(node["id"])] }.map { PumlPackage(it) }
        val notes = PumlNotes.fromModel(model, refIdById)
        return PumlExport(
            PumlDiagram(null, types, relations, packages, notes),
            typeKeywords,
            arrowTokens,
            elementAliases,
            typeStereotypes,
            typeBodies,
        )
    }

    /** What [RoundTripValidator] compares an exported-then-reparsed candidate against. */
    data class ClassSignature(
        /** Classifier and package display names. */
        val names: Set<String>,
        /** Display name -> that classifier's attribute lines then its method lines, in canvas
         *  order. Packages are absent; they have no members. */
        val members: Map<String, List<String>>,
        /** `(source, target, apollonEdgeType)`, by display name — a multiset, so a diagram may
         *  hold two of the same relation. */
        val relations: List<Triple<String, String, String>>,
    )

    fun signature(model: JsonObject): ClassSignature {
        // Notes are checked by none of this: their text is free-form, and a note that failed to
        // survive a round trip would block a write over something that annotates the diagram
        // rather than being part of it.
        val nodes =
            (arr(model["nodes"])?.mapNotNull { obj(it) } ?: emptyList())
                .filterNot { isAnnotationNode(text(it["type"])) || text(it["type"]) == NOTE_NODE_TYPE }
        val nameById = mutableMapOf<String, String>()
        val members = mutableMapOf<String, List<String>>()
        val names =
            nodes.mapNotNull { node ->
                val id = text(node["id"]) ?: return@mapNotNull null
                val data = obj(node["data"])
                val name = PumlName.forPuml(text(data?.get("name")))
                nameById[id] = name
                if (text(node["type"]) != "package") members[name] = memberLines(data)
                name
            }.toSet()
        val relations =
            (arr(model["edges"])?.mapNotNull { obj(it) } ?: emptyList()).mapNotNull { edge ->
                val src = nameById[text(edge["source"])] ?: return@mapNotNull null
                val tgt = nameById[text(edge["target"])] ?: return@mapNotNull null
                val type = text(edge["type"]) ?: return@mapNotNull null
                Triple(src, tgt, type)
            }
        return ClassSignature(names, members, relations)
    }

    /** The members a re-parsed [PumlType] carries, in the same shape [signature] reports — so the
     *  two can be compared directly. */
    fun memberLines(type: PumlType): List<String> = (type.attributes + type.methods).map { it.apollonName }

    private fun memberLines(data: JsonObject?): List<String> =
        (arr(data?.get("attributes")).orEmpty() + arr(data?.get("methods")).orEmpty())
            .mapNotNull { text(obj(it)?.get("name")) }

    /** A package the source has just introduced has no remembered size, so make one that holds
     *  the stack of children [toApollonModel] is about to place inside it. */
    private fun freshPackageSize(children: List<PumlType>): Size {
        val sizes = children.map { PumlLayout.sizeOf(it) }
        val width = (sizes.maxOfOrNull { it.width } ?: 180) + 2 * PACKAGE_PADDING
        val height = PACKAGE_HEADER + PACKAGE_SPACING + sizes.sumOf { it.height + PACKAGE_SPACING }
        return Size(width, maxOf(height, PACKAGE_HEADER + 2 * PACKAGE_SPACING))
    }

    private fun defaultKeyword(kind: PumlKind) =
        when (kind) {
            PumlKind.INTERFACE -> "interface"
            PumlKind.ENUM -> "enum"
            PumlKind.ABSTRACT_CLASS -> "abstract class"
            PumlKind.ENTITY -> "entity"
            PumlKind.CLASS -> "class"
        }

    private fun memberJson(
        member: PumlMember,
        existingData: JsonObject?,
        arrayKey: String,
        index: Int,
    ): JsonObject {
        val existing = arr(existingData?.get(arrayKey))?.getOrNull(index) as? JsonObject
        val id = existing?.let { text(it["id"]) } ?: UUID.randomUUID().toString()
        return buildJsonObject {
            put("id", id)
            put("name", member.apollonName)
            if (member.isAbstract) put("isAbstract", true)
        }
    }

    private fun memberFromJson(
        element: JsonElement,
        isMethod: Boolean,
    ): PumlMember? {
        val obj = element as? JsonObject ?: return null
        val name = text(obj["name"]) ?: return null
        return PumlMember(name, isMethod, flag(obj["isAbstract"]))
    }

    fun apollonEdgeType(kind: PumlRelationKind) =
        when (kind) {
            PumlRelationKind.INHERITANCE -> "ClassInheritance"
            PumlRelationKind.REALIZATION -> "ClassRealization"
            PumlRelationKind.COMPOSITION -> "ClassComposition"
            PumlRelationKind.AGGREGATION -> "ClassAggregation"
            PumlRelationKind.UNIDIRECTIONAL -> "ClassUnidirectional"
            PumlRelationKind.BIDIRECTIONAL -> "ClassBidirectional"
            PumlRelationKind.DEPENDENCY -> "ClassDependency"
        }

    private fun pumlRelationKind(apollonType: String): PumlRelationKind? =
        when (apollonType) {
            "ClassInheritance" -> PumlRelationKind.INHERITANCE
            "ClassRealization" -> PumlRelationKind.REALIZATION
            "ClassComposition" -> PumlRelationKind.COMPOSITION
            "ClassAggregation" -> PumlRelationKind.AGGREGATION
            "ClassUnidirectional" -> PumlRelationKind.UNIDIRECTIONAL
            "ClassBidirectional" -> PumlRelationKind.BIDIRECTIONAL
            "ClassDependency" -> PumlRelationKind.DEPENDENCY
            else -> null
        }
}
