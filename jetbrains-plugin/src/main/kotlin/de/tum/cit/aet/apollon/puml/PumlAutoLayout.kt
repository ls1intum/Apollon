package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private fun obj(e: JsonElement?) = e as? JsonObject

private fun arr(e: JsonElement?) = e as? JsonArray

private fun text(e: JsonElement?) = (e as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun number(e: JsonElement?): Int? = (e as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt()

private const val ORIGIN_X = 60
private const val ORIGIN_Y = 60

/** Between one connected group of elements and the next, and above the block of unconnected ones.
 *  Wider than [ROW_GAP] on purpose: the break between two groups has to read as a bigger gap than
 *  the break between two rows of the same group, or they look like one tangled diagram. */
private const val GROUP_GAP = 160

/** How many unconnected siblings share one row inside a container before wrapping to the next —
 *  the same column count [PumlLayout.gridPositions] would itself pick for a dozen of them
 *  (`ceil(sqrt(12)) = 4`), reused as a fixed cap so four children still read as one row rather
 *  than the square-ish grid a per-`n` recompute would force them into. */
internal const val MAX_UNCONNECTED_PER_ROW = 4

/** Edge geometry the canvas is free to re-route, as opposed to a route the user drew by hand. */
private val EDGE_GEOMETRY_KEYS = setOf("points", "sourceAnchor", "targetAnchor")

/**
 * Re-arranges a whole canvas model: relationships decide the shape at every nesting level, and
 * anything unconnected is packed into a grid (or, inside a container, a capped row) underneath.
 *
 * Only ever reached from the **Auto layout** command — never from an import, a save or an external
 * change. The layout is the user's to manage: this rearranges everything when they ask for it, and
 * then stays out of the way, so a box they drag afterwards stays where they put it. See
 * [de.tum.cit.aet.apollon.document.PumlDocumentBridge.importFrom] for why an import must not call
 * this.
 *
 * Generalises the layered layout [ActivityModelMapper] already had for one family: back-edges left
 * out of the ranking and drawn as the arrows they are, rows from a longest-path rank, cyclic
 * leftovers parked below. Still deliberately not a layout engine (plan §D5) — no external
 * dependency, and the same model always lays out the same way, which is what lets it be tested by
 * comparing output.
 *
 * Works on the model rather than on a [PumlDiagram], so it is family-agnostic: a `.apollon` Petri
 * net arranges through exactly this path, and no family mapper needs to know it exists.
 */
object PumlAutoLayout {
    /** [model] with every node re-positioned — a container's children ranked and rowed inside it,
     *  the container itself sized to fit them, top level last — and every auto-routed edge freed to
     *  re-route.
     *
     *  Deliberately left alone:
     *   - **annotation nodes** ([isAnnotationNode]) — a title/description block is a caption placed
     *     where the author wanted it, and nothing connects to it, so it has no place in the graph;
     *   - **a node whose `parentId` chain does not cleanly terminate at a true root** — a cycle, or
     *     anything hanging off one. Writing a fresh position for it as though it were a root, while
     *     its original (cyclic) `parentId` survives untouched in the output, would have
     *     [absoluteRects] double-offset it the next time anything reads the model, so it is left
     *     with its position, size and structure exactly as it was handed in.
     */
    fun arrange(model: JsonObject): JsonObject {
        val nodes = arr(model["nodes"])?.mapNotNull { obj(it) } ?: return model
        val edges = arr(model["edges"])?.mapNotNull { obj(it) }.orEmpty()
        if (nodes.isEmpty()) return model

        val eligible = nodes.filterNot { isAnnotationNode(text(it["type"])) }
        if (eligible.isEmpty()) return model

        val order = eligible.mapIndexed { index, node -> idOf(node) to index }.toMap()
        val forest = buildForest(eligible, order)
        if (forest.roots.isEmpty()) return model

        val sizeById = mutableMapOf<String, Size>()
        eligible.forEach { node ->
            val id = idOf(node)
            if (id !in forest.childrenOf) sizeById[id] = sizeOf(node)
        }

        // Deepest container first: a container can only be sized once every one of its own
        // children — including a nested container's own already-sized children — is placed.
        val relative = mutableMapOf<String, Point>()
        forest.containersDeepestFirst().forEach { containerId ->
            val childIds = forest.childrenOf.getValue(containerId)
            val childSizes = childIds.associateWith { sizeById.getValue(it) }
            val links = projectEdges(eligible, edges, childIds.toSet(), forest.parentOf)
            val origin = PumlLayout.containerContentOrigin()
            val positions = place(childSizes, order, links, origin.x, origin.y, unconnectedInContainer = true)
            childIds.forEach { relative[it] = positions.getValue(it) }
            sizeById[containerId] = containerSize(childIds, positions, childSizes)
        }

        val rootLinks = projectEdges(eligible, edges, forest.roots.toSet(), forest.parentOf)
        val rootSizes = forest.roots.associateWith { sizeById.getValue(it) }
        val rootPositions = place(rootSizes, order, rootLinks)

        val positions = relative + rootPositions
        val resizedIds = forest.childrenOf.keys
        val repositioned =
            nodes.map { node ->
                val id = idOf(node)
                val moved = positions[id]?.let { withPosition(node, it) } ?: node
                if (id in resizedIds) withSize(moved, sizeById.getValue(id)) else moved
            }
        val rects = absoluteRects(repositioned)

        return buildJsonObject {
            model.forEach { (key, value) ->
                when (key) {
                    "nodes" -> put("nodes", JsonArray(repositioned))
                    "edges" -> put("edges", JsonArray(edges.map { freeToReroute(it, rects) }))
                    else -> put(key, value)
                }
            }
        }
    }

    /** The `parentId` tree, restricted to nodes whose chain to the top is clean. */
    private class Forest(
        val childrenOf: Map<String, List<String>>,
        val roots: List<String>,
        val parentOf: Map<String, String?>,
    ) {
        /** Every container, deepest first: post-order over the forest, so a parent always follows
         *  every one of its own descendants. */
        fun containersDeepestFirst(): List<String> {
            val out = mutableListOf<String>()
            val visited = mutableSetOf<String>()
            fun visit(id: String) {
                if (!visited.add(id)) return
                childrenOf[id].orEmpty().forEach(::visit)
                if (id in childrenOf) out += id
            }
            roots.forEach(::visit)
            return out
        }
    }

    private fun buildForest(
        eligible: List<JsonObject>,
        order: Map<String, Int>,
    ): Forest {
        val ids = eligible.map(::idOf).toSet()
        val rawParentOf = eligible.associate { idOf(it) to text(it["parentId"])?.takeIf { p -> p in ids } }
        val unrooted = unrootedIds(ids, rawParentOf)

        val rooted = ids - unrooted
        val parentOf = rooted.associateWith { rawParentOf.getValue(it) }
        val childrenOf =
            rooted.mapNotNull { id -> parentOf.getValue(id)?.let { parent -> parent to id } }
                .groupBy({ it.first }, { it.second })
                .mapValues { (_, kids) -> kids.sortedBy { order.getValue(it) } }
        val roots = rooted.filter { parentOf.getValue(it) == null }.sortedBy { order.getValue(it) }
        return Forest(childrenOf, roots, parentOf)
    }

    /**
     * Every id whose `parentId` chain does not cleanly terminate at a true root within the node
     * count — a cycle, or a node hanging off one. See [arrange]'s doc comment for why these are
     * left alone rather than treated as roots.
     */
    private fun unrootedIds(
        ids: Set<String>,
        rawParentOf: Map<String, String?>,
    ): Set<String> {
        val unrooted = mutableSetOf<String>()
        val resolved = mutableSetOf<String>()

        fun resolve(start: String) {
            if (start in unrooted || start in resolved) return
            val path = mutableListOf<String>()
            var current: String? = start
            while (current != null) {
                when {
                    current in resolved -> {
                        resolved += path
                        return
                    }
                    current in unrooted || current in path -> {
                        unrooted += path
                        unrooted += current
                        return
                    }
                    else -> {
                        path += current
                        current = rawParentOf[current]
                    }
                }
            }
            resolved += path
        }

        ids.forEach(::resolve)
        return unrooted
    }

    /**
     * The edges as one level of the layout sees them: each endpoint resolved up its `parentId`
     * chain to the closest ancestor that is a direct member of [levelIds] — a root at the top
     * level, a container's own direct child one level in — with self-links and links to something
     * outside this level (or not being laid out at all) dropped.
     */
    private fun projectEdges(
        nodes: List<JsonObject>,
        edges: List<JsonObject>,
        levelIds: Set<String>,
        parentOf: Map<String, String?>,
    ): List<Pair<String, String>> {
        fun ancestorInLevel(start: String?): String? {
            var current = start ?: return null
            // Bounded by the node count, the same guard `absoluteRects` uses: this runs on
            // whatever the canvas sent us rather than on something we built.
            repeat(nodes.size + 1) {
                if (current in levelIds) return current
                current = parentOf[current] ?: return null
            }
            return null
        }
        return edges.mapNotNull { edge ->
            val source = ancestorInLevel(text(edge["source"])) ?: return@mapNotNull null
            val target = ancestorInLevel(text(edge["target"])) ?: return@mapNotNull null
            if (source == target) null else source to target
        }
    }

    /** A container sized to its children's bounding box plus the padding on the far side from the
     *  origin [PumlLayout.containerContentOrigin] already baked into [positions] on the near side. */
    private fun containerSize(
        childIds: List<String>,
        positions: Map<String, Point>,
        sizeById: Map<String, Size>,
    ): Size {
        val right = childIds.maxOf { positions.getValue(it).x + sizeById.getValue(it).width }
        val bottom = childIds.maxOf { positions.getValue(it).y + sizeById.getValue(it).height }
        return Size(right + PumlLayout.CONTAINER_PADDING, bottom + PumlLayout.CONTAINER_PADDING)
    }

    /** Layered rows for every connected group, then a grid (or, inside a container, a capped row)
     *  for whatever nothing points at. */
    private fun place(
        sizeById: Map<String, Size>,
        order: Map<String, Int>,
        links: List<Pair<String, String>>,
        originX: Int = ORIGIN_X,
        originY: Int = ORIGIN_Y,
        unconnectedInContainer: Boolean = false,
    ): Map<String, Point> {
        val neighbours = mutableMapOf<String, MutableSet<String>>()
        links.forEach { (source, target) ->
            neighbours.getOrPut(source) { linkedSetOf() } += target
            neighbours.getOrPut(target) { linkedSetOf() } += source
        }

        val ids = sizeById.keys.sortedBy { order.getValue(it) }
        val groups = connectedGroups(ids, neighbours, order)
        val (connected, lonely) = groups.partition { it.size > 1 }

        val positions = mutableMapOf<String, Point>()
        var y = originY
        connected.forEach { group ->
            val rows = rowsFor(group.toSet(), order, links)
            y = layOutRows(rows, sizeById, positions, y, originX) + GROUP_GAP
        }

        // Everything with no relationship at all, together in one block rather than one lonely row
        // each — this is the tidied-grid half of the arrangement.
        val orphans = lonely.flatten()
        if (orphans.isNotEmpty()) {
            val origin = if (positions.isEmpty()) originY else y
            if (unconnectedInContainer) {
                // A square-ish grid recomputed per `n` would turn four siblings into a 2x2 block
                // instead of the one row a boundary with no relationships is supposed to read as
                // (plan example); a fixed cap wide enough for the grid's own column count on a
                // dozen keeps both cases right without a special case for either.
                layOutRows(orphans.chunked(MAX_UNCONNECTED_PER_ROW), sizeById, positions, origin, originX)
            } else {
                PumlLayout.gridPositions(orphans.map { sizeById.getValue(it) }, originX, origin)
                    .forEachIndexed { index, point -> positions[orphans[index]] = point }
            }
        }
        return positions
    }

    private fun connectedGroups(
        ids: List<String>,
        neighbours: Map<String, Set<String>>,
        order: Map<String, Int>,
    ): List<List<String>> {
        val seen = mutableSetOf<String>()
        return ids.mapNotNull { start ->
            if (!seen.add(start)) return@mapNotNull null
            val group = mutableListOf(start)
            val queue = ArrayDeque(listOf(start))
            while (queue.isNotEmpty()) {
                val current = queue.removeFirst()
                // Sorted so the walk order — and therefore the whole arrangement — does not depend
                // on hash iteration order.
                neighbours[current].orEmpty().sortedBy { order.getValue(it) }.forEach { next ->
                    if (seen.add(next)) {
                        group += next
                        queue.addLast(next)
                    }
                }
            }
            group
        }
    }

    /**
     * One group's nodes split into rows: rank by longest path once back-edges are out of the way,
     * then order each row by the average position of the row above it points at — the classic
     * barycentre sweep, which is what stops a two-parent child from being drawn across the diagram
     * from both of them.
     */
    private fun rowsFor(
        group: Set<String>,
        order: Map<String, Int>,
        links: List<Pair<String, String>>,
    ): List<List<String>> {
        val within = links.filter { it.first in group && it.second in group }.distinct()
        val forward = within - backLinks(group, order, within)

        val outgoing = forward.groupBy({ it.first }, { it.second })
        val indegree = group.associateWith { 0 }.toMutableMap()
        forward.forEach { (_, target) -> indegree[target] = indegree.getValue(target) + 1 }

        val rank = group.associateWith { 0 }.toMutableMap()
        val queue = ArrayDeque(group.filter { indegree.getValue(it) == 0 }.sortedBy { order.getValue(it) })
        val settled = mutableSetOf<String>()
        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            if (!settled.add(current)) continue
            outgoing[current].orEmpty().forEach { target ->
                rank[target] = maxOf(rank.getValue(target), rank.getValue(current) + 1)
                indegree[target] = indegree.getValue(target) - 1
                if (indegree.getValue(target) == 0) queue.addLast(target)
            }
        }
        // A cycle `backLinks` could not fully break leaves nodes unsettled. Park them on rows of
        // their own below the rest rather than all at rank 0, on top of each other.
        val deepest = rank.values.maxOrNull() ?: 0
        group.filter { it !in settled }.sortedBy { order.getValue(it) }
            .forEachIndexed { index, id -> rank[id] = deepest + 1 + index }

        val rows = rank.entries.groupBy({ it.value }, { it.key }).toSortedMap()
        val predecessors = forward.groupBy({ it.second }, { it.first })
        var previous = emptyList<String>()
        return rows.values.map { row ->
            val placement = previous.withIndex().associate { (index, id) -> id to index }
            previous =
                row.sortedWith(
                    compareBy(
                        { id: String ->
                            val above = predecessors[id].orEmpty().mapNotNull { placement[it] }
                            // No predecessor on the row above says nothing about where this one
                            // belongs, so leave those at the end in the model's own order.
                            if (above.isEmpty()) Double.MAX_VALUE else above.average()
                        },
                        { id: String -> order.getValue(id) },
                    ),
                )
            previous
        }
    }

    /**
     * The links to leave out of the ranking: a group with a cycle has no topological order at all,
     * so one link per cycle has to be treated as "goes back up". Found with a depth-first walk in
     * the model's own element order — a link into a node still on the current path is a back-link —
     * which is deterministic and does not care which link a user happened to draw first.
     */
    private fun backLinks(
        group: Set<String>,
        order: Map<String, Int>,
        links: List<Pair<String, String>>,
    ): Set<Pair<String, String>> {
        val outgoing = links.groupBy({ it.first }, { it.second })
        val back = mutableSetOf<Pair<String, String>>()
        val done = mutableSetOf<String>()
        val onPath = mutableSetOf<String>()

        fun walk(id: String) {
            onPath += id
            outgoing[id].orEmpty().sortedBy { order.getValue(it) }.forEach { target ->
                when {
                    target in onPath -> back += id to target
                    target !in done -> walk(target)
                }
            }
            onPath -= id
            done += id
        }

        group.sortedBy { order.getValue(it) }.forEach { if (it !in done) walk(it) }
        return back
    }

    /** Rows top to bottom, each centred on the widest row, and returns the y the next block starts at. */
    private fun layOutRows(
        rows: List<List<String>>,
        sizeById: Map<String, Size>,
        into: MutableMap<String, Point>,
        originY: Int,
        originX: Int = ORIGIN_X,
    ): Int {
        fun rowWidth(row: List<String>): Int =
            row.sumOf { sizeById.getValue(it).width } + COL_GAP * (row.size - 1).coerceAtLeast(0)

        val widest = rows.maxOfOrNull(::rowWidth) ?: 0
        var y = originY
        rows.forEach { row ->
            var x = originX + (widest - rowWidth(row)) / 2
            row.forEach { id ->
                into[id] = Point(PumlLayout.snapToGrid(x), PumlLayout.snapToGrid(y))
                x += sizeById.getValue(id).width + COL_GAP
            }
            y += (row.maxOfOrNull { sizeById.getValue(it).height } ?: 0) + ROW_GAP
        }
        return (y - ROW_GAP).coerceAtLeast(originY)
    }

    /**
     * Drops the edge's remembered geometry so the canvas routes it to where the node ended up, and
     * re-picks the sides it leaves from.
     *
     * Not optional: a non-empty `data.points` is *authoritative* in the canvas's router — it is only
     * re-projected onto the new endpoints, never recomputed (see `edgeGeometrySolver.ts`) — so an
     * arrangement that moved the nodes but kept the points would draw every relation along the
     * polyline it had before the move.
     */
    private fun freeToReroute(
        edge: JsonObject,
        rects: Map<String, Rect>,
    ): JsonObject {
        val source = rects[text(edge["source"])]
        val target = rects[text(edge["target"])]
        val handles = if (source != null && target != null) PumlLayout.chooseHandles(source, target) else null
        return buildJsonObject {
            edge.forEach { (key, value) ->
                when (key) {
                    "sourceHandle" -> put("sourceHandle", handles?.first?.let(::JsonPrimitive) ?: value)
                    "targetHandle" -> put("targetHandle", handles?.second?.let(::JsonPrimitive) ?: value)
                    "data" ->
                        put(
                            "data",
                            buildJsonObject {
                                obj(value)?.forEach { (dataKey, dataValue) ->
                                    if (dataKey !in EDGE_GEOMETRY_KEYS) put(dataKey, dataValue)
                                }
                                put("points", buildJsonArray {})
                            },
                        )
                    else -> put(key, value)
                }
            }
            if (edge["data"] == null) {
                put("data", buildJsonObject { put("points", buildJsonArray {}) })
            }
            handles?.let {
                if (edge["sourceHandle"] == null) put("sourceHandle", it.first)
                if (edge["targetHandle"] == null) put("targetHandle", it.second)
            }
        }
    }

    /** Canvas coordinates for every node, children included — what [PumlLayout.chooseHandles] needs. */
    private fun absoluteRects(nodes: List<JsonObject>): Map<String, Rect> {
        val byId = nodes.associateBy { idOf(it) }
        val resolved = mutableMapOf<String, Rect>()

        fun rectOf(id: String): Rect? {
            resolved[id]?.let { return it }
            val node = byId[id] ?: return null
            val size = sizeOf(node)
            val position = obj(node["position"])
            val x = number(position?.get("x")) ?: 0
            val y = number(position?.get("y")) ?: 0
            val parent = text(node["parentId"])
            // Guard against a `parentId` cycle: mark this id resolved before recursing, so a cycle
            // resolves to a relative rect instead of overflowing the stack.
            resolved[id] = Rect(x, y, size.width, size.height)
            val origin = parent?.takeIf { it != id }?.let { rectOf(it) }
            val rect = Rect(x + (origin?.x ?: 0), y + (origin?.y ?: 0), size.width, size.height)
            resolved[id] = rect
            return rect
        }

        byId.keys.forEach { rectOf(it) }
        return resolved
    }

    private fun withPosition(
        node: JsonObject,
        point: Point,
    ): JsonObject =
        buildJsonObject {
            node.forEach { (key, value) ->
                if (key == "position") {
                    put("position", buildJsonObject { put("x", point.x); put("y", point.y) })
                } else {
                    put(key, value)
                }
            }
            if (node["position"] == null) {
                put("position", buildJsonObject { put("x", point.x); put("y", point.y) })
            }
        }

    /** Overwrites a container's own size after re-fitting it to its children — both `width`/`height`
     *  and `measured`, since [sizeOf] prefers the latter when it is present. */
    private fun withSize(
        node: JsonObject,
        size: Size,
    ): JsonObject =
        buildJsonObject {
            node.forEach { (key, value) ->
                when (key) {
                    "width" -> put("width", size.width)
                    "height" -> put("height", size.height)
                    "measured" -> put("measured", buildJsonObject { put("width", size.width); put("height", size.height) })
                    else -> put(key, value)
                }
            }
            if (node["width"] == null) put("width", size.width)
            if (node["height"] == null) put("height", size.height)
            if (node["measured"] == null) {
                put("measured", buildJsonObject { put("width", size.width); put("height", size.height) })
            }
        }

    private fun idOf(node: JsonObject): String = text(node["id"]) ?: ""

    /** The canvas's own size for the node where it has one, falling back to the default box. The
     *  `measured` pair is what the browser laid out, so it beats the `width`/`height` an importer
     *  estimated before the node was ever rendered. */
    private fun sizeOf(node: JsonObject): Size {
        val measured = obj(node["measured"])
        val width = number(measured?.get("width")) ?: number(node["width"]) ?: PumlLayout.sizeOfRows(0).width
        val height = number(measured?.get("height")) ?: number(node["height"]) ?: PumlLayout.sizeOfRows(0).height
        return Size(width.coerceAtLeast(1), height.coerceAtLeast(1))
    }
}
