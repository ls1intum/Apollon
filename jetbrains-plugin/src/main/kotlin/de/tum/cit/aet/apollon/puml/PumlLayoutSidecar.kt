package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** Suffix appended to the `.puml` file's own name — `orders.puml` -> `orders.puml.layout.json`. */
const val LAYOUT_SIDECAR_SUFFIX = ".layout.json"

private const val CURRENT_VERSION = 1

private fun obj(e: JsonElement?) = e as? JsonObject

private fun arr(e: JsonElement?) = e as? JsonArray

private fun text(e: JsonElement?) = (e as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun number(e: JsonElement?): Int? = (e as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt()

/**
 * Canvas elements that carry no structure and have no PlantUML equivalent, so the sidecar is the
 * only place they can live. Today that is the title/description block: it is a caption for the
 * whole diagram, `library/lib/utils/connectionModes.ts` gives it `"none"` so nothing can attach to
 * it, and PlantUML's `title` is a single line rather than a placed box.
 *
 * The general UML note (`colorDescription`) used to be here too. It no longer is: it connects
 * through a `NoteLink` on the canvas and writes out as a real PlantUML `note`, so [PumlNotes]
 * carries its text and anchors in the `.puml` and only its geometry comes here — the same split as
 * every other element.
 */
val ANNOTATION_NODE_TYPES = setOf("titleAndDesctiption")

fun isAnnotationNode(type: String?): Boolean = type in ANNOTATION_NODE_TYPES

/** Where one classifier sits on the canvas, plus the cosmetics PlantUML has no syntax for. */
data class NodeLayout(
    val x: Int,
    val y: Int,
    val width: Int,
    val height: Int,
    val fillColor: String? = null,
    val strokeColor: String? = null,
    val textColor: String? = null,
)

/** How one relation is drawn. Identified the same way [ApollonModelMapper]'s re-import merge
 *  identifies it — by endpoint names plus Apollon edge type — so a sidecar entry survives the
 *  ids being re-minted on every import. */
data class EdgeLayout(
    val source: String,
    val target: String,
    val type: String,
    val sourceHandle: String,
    val targetHandle: String,
    val points: JsonArray = JsonArray(emptyList()),
    val strokeColor: String? = null,
    val textColor: String? = null,
)

/**
 * The geometry a PlantUML file cannot express, held in a file committed alongside it.
 *
 * PlantUML describes structure and leaves placement to its own layout engine, so positions, sizes,
 * waypoints and colours have nowhere to live in the `.puml` itself. Keeping them in a sibling
 * `.puml.layout.json` means a teammate who clones the repository opens the diagram arranged the way
 * it was drawn, rather than getting [PumlLayout]'s deterministic fallback grid.
 *
 * Entries are keyed by **element name**, not by node id: [ApollonModelMapper.toApollonModel] mints
 * fresh ids on every import and re-attaches previous geometry by name, so a name key is the only
 * one that survives a round trip. The consequence is the same as the canvas's own: renaming a class
 * in the source drops its saved position, because nothing connects the old name to the new one.
 */
data class PumlLayoutSidecar(
    val nodes: Map<String, NodeLayout> = emptyMap(),
    val edges: List<EdgeLayout> = emptyList(),
    /**
     * [ANNOTATION_NODE_TYPES] nodes, stored as the canvas's own JSON verbatim rather than
     * destructured into fields. Unlike [nodes], which only supplements an element the importer
     * already produced, nothing in the `.puml` will recreate these — the sidecar is their only
     * copy, so round-tripping the whole object is what keeps their text, colours and sizing.
     * A list, not a name-keyed map: two notes may legitimately read the same.
     */
    val annotations: List<JsonObject> = emptyList(),
) {
    fun isEmpty(): Boolean = nodes.isEmpty() && edges.isEmpty() && annotations.isEmpty()

    fun toJson(): String {
        val root =
            buildJsonObject {
                put("version", CURRENT_VERSION)
                put(
                    "nodes",
                    buildJsonObject {
                        // Sorted so the committed file has a stable diff regardless of node order.
                        nodes.toSortedMap().forEach { (name, layout) ->
                            put(
                                name,
                                buildJsonObject {
                                    put("x", layout.x)
                                    put("y", layout.y)
                                    put("width", layout.width)
                                    put("height", layout.height)
                                    layout.fillColor?.let { put("fillColor", it) }
                                    layout.strokeColor?.let { put("strokeColor", it) }
                                    layout.textColor?.let { put("textColor", it) }
                                },
                            )
                        }
                    },
                )
                put(
                    "edges",
                    buildJsonArray {
                        edges.forEach { edge ->
                            add(
                                buildJsonObject {
                                    put("source", edge.source)
                                    put("target", edge.target)
                                    put("type", edge.type)
                                    put("sourceHandle", edge.sourceHandle)
                                    put("targetHandle", edge.targetHandle)
                                    if (edge.points.isNotEmpty()) put("points", edge.points)
                                    edge.strokeColor?.let { put("strokeColor", it) }
                                    edge.textColor?.let { put("textColor", it) }
                                },
                            )
                        }
                    },
                )
                if (annotations.isNotEmpty()) {
                    put("annotations", JsonArray(annotations))
                }
            }
        return Json { prettyPrint = true; prettyPrintIndent = "  " }
            .encodeToString(JsonObject.serializer(), root) + "\n"
    }

    /** Puts the annotations back on a freshly imported model. The `.puml` says nothing about them,
     *  so this is the only thing that makes a note survive closing and reopening the file. */
    fun withAnnotations(model: JsonObject): JsonObject {
        if (annotations.isEmpty()) return model
        val existing = arr(model["nodes"]) ?: JsonArray(emptyList())
        return JsonObject(model.toMutableMap().apply { put("nodes", JsonArray(existing + annotations)) })
    }

    /**
     * A stand-in for the "previously open model" that [ApollonModelMapper.toApollonModel] and its
     * per-family siblings merge geometry out of. Rebuilding that shape here means the sidecar needs
     * no support in any mapper: the existing name-keyed merge does the work, and a mapper added
     * later inherits sidecar support for free.
     *
     * Node ids are the element names themselves — the merge only ever uses them to correlate
     * `data.name` with a previous entry, and the ids it hands back are discarded.
     */
    fun toPreviousModel(): JsonObject? {
        if (isEmpty()) return null
        return buildJsonObject {
            put(
                "nodes",
                buildJsonArray {
                    nodes.forEach { (name, layout) ->
                        add(
                            buildJsonObject {
                                put("id", name)
                                put("width", layout.width)
                                put("height", layout.height)
                                put("position", buildJsonObject { put("x", layout.x); put("y", layout.y) })
                                put(
                                    "data",
                                    buildJsonObject {
                                        put("name", name)
                                        layout.fillColor?.let { put("fillColor", it) }
                                        layout.strokeColor?.let { put("strokeColor", it) }
                                        layout.textColor?.let { put("textColor", it) }
                                    },
                                )
                            },
                        )
                    }
                },
            )
            put(
                "edges",
                buildJsonArray {
                    edges.forEach { edge ->
                        add(
                            buildJsonObject {
                                put("id", "${edge.source}|${edge.target}|${edge.type}")
                                put("source", edge.source)
                                put("target", edge.target)
                                put("type", edge.type)
                                put("sourceHandle", edge.sourceHandle)
                                put("targetHandle", edge.targetHandle)
                                put(
                                    "data",
                                    buildJsonObject {
                                        put("points", edge.points)
                                        edge.strokeColor?.let { put("strokeColor", it) }
                                        edge.textColor?.let { put("textColor", it) }
                                    },
                                )
                            },
                        )
                    }
                },
            )
        }
    }

    companion object {
        fun empty(): PumlLayoutSidecar = PumlLayoutSidecar()

        fun fromJson(text: String): PumlLayoutSidecar {
            if (text.isBlank()) return empty()
            val root = runCatching { obj(Json.parseToJsonElement(text)) }.getOrNull() ?: return empty()
            val version = number(root["version"]) ?: CURRENT_VERSION
            // A sidecar from a newer plugin is layout only: ignoring it costs the user their
            // arrangement for this session, where guessing at it could silently rewrite theirs.
            if (version > CURRENT_VERSION) return empty()

            val nodes =
                obj(root["nodes"])?.entries?.mapNotNull { (name, value) ->
                    val node = obj(value) ?: return@mapNotNull null
                    val x = number(node["x"]) ?: return@mapNotNull null
                    val y = number(node["y"]) ?: return@mapNotNull null
                    name to
                        NodeLayout(
                            x = x,
                            y = y,
                            width = number(node["width"]) ?: 0,
                            height = number(node["height"]) ?: 0,
                            fillColor = text(node["fillColor"]),
                            strokeColor = text(node["strokeColor"]),
                            textColor = text(node["textColor"]),
                        )
                }?.toMap() ?: emptyMap()

            val edges =
                arr(root["edges"])?.mapNotNull { value ->
                    val edge = obj(value) ?: return@mapNotNull null
                    EdgeLayout(
                        source = text(edge["source"]) ?: return@mapNotNull null,
                        target = text(edge["target"]) ?: return@mapNotNull null,
                        type = text(edge["type"]) ?: return@mapNotNull null,
                        sourceHandle = text(edge["sourceHandle"]) ?: "bottom",
                        targetHandle = text(edge["targetHandle"]) ?: "top",
                        points = arr(edge["points"]) ?: JsonArray(emptyList()),
                        strokeColor = text(edge["strokeColor"]),
                        textColor = text(edge["textColor"]),
                    )
                } ?: emptyList()

            val annotations = arr(root["annotations"])?.mapNotNull { obj(it) } ?: emptyList()

            return PumlLayoutSidecar(nodes, edges, annotations)
        }

        /** Extracts the sidecar's worth of geometry out of a live canvas model. Nodes whose name is
         *  missing are skipped — without a name there is no key that survives the next import. */
        fun fromModel(model: JsonObject): PumlLayoutSidecar {
            val allNodes = arr(model["nodes"])?.mapNotNull { obj(it) } ?: emptyList()
            // Annotations are carried whole and must not also appear under `nodes`: they are not
            // in the PlantUML, so there is no imported element for a geometry entry to attach to.
            val (annotations, modelNodes) = allNodes.partition { isAnnotationNode(text(it["type"])) }
            val nameById = mutableMapOf<String, String>()
            val nodes = mutableMapOf<String, NodeLayout>()

            modelNodes.forEach { node ->
                val id = text(node["id"]) ?: return@forEach
                val data = obj(node["data"])
                val name = text(data?.get("name")) ?: return@forEach
                nameById[id] = name
                val position = obj(node["position"])
                nodes[name] =
                    NodeLayout(
                        x = number(position?.get("x")) ?: 0,
                        y = number(position?.get("y")) ?: 0,
                        width = number(node["width"]) ?: 0,
                        height = number(node["height"]) ?: 0,
                        fillColor = text(data?.get("fillColor")),
                        strokeColor = text(data?.get("strokeColor")),
                        textColor = text(data?.get("textColor")),
                    )
            }

            val edges =
                arr(model["edges"])?.mapNotNull { obj(it) }?.mapNotNull { edge ->
                    val source = nameById[text(edge["source"])] ?: return@mapNotNull null
                    val target = nameById[text(edge["target"])] ?: return@mapNotNull null
                    val type = text(edge["type"]) ?: return@mapNotNull null
                    val data = obj(edge["data"])
                    EdgeLayout(
                        source = source,
                        target = target,
                        type = type,
                        sourceHandle = text(edge["sourceHandle"]) ?: "bottom",
                        targetHandle = text(edge["targetHandle"]) ?: "top",
                        points = arr(data?.get("points")) ?: JsonArray(emptyList()),
                        strokeColor = text(data?.get("strokeColor")),
                        textColor = text(data?.get("textColor")),
                    )
                } ?: emptyList()

            return PumlLayoutSidecar(nodes, edges, annotations)
        }
    }
}
