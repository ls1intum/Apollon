package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The arrangement the **Auto layout** command produces — the one thing that ever moves an element
 * the user did not move themselves.
 *
 * Asserts on the *shape* of the result — what is above what, what does not overlap — rather than on
 * coordinates, so the gaps stay tunable. The exception is the determinism test, which is the whole
 * reason this is a hand-rolled layout rather than a layout engine.
 */
class PumlAutoLayoutTest {
    private fun node(
        id: String,
        width: Int = 160,
        height: Int = 60,
        parentId: String? = null,
        type: String = "class",
        x: Int = 0,
        y: Int = 0,
    ): JsonObject =
        buildJsonObject {
            put("id", id)
            put("type", type)
            put("width", width)
            put("height", height)
            put("position", buildJsonObject { put("x", x); put("y", y) })
            parentId?.let { put("parentId", it) }
            put("data", buildJsonObject { put("name", id) })
            put("measured", buildJsonObject { put("width", width); put("height", height) })
        }

    private fun edge(
        source: String,
        target: String,
        points: List<Pair<Int, Int>> = emptyList(),
    ): JsonObject =
        buildJsonObject {
            put("id", "$source->$target")
            put("source", source)
            put("target", target)
            put("type", "association")
            put("sourceHandle", "left")
            put("targetHandle", "right")
            put(
                "data",
                buildJsonObject {
                    put("label", "$source to $target")
                    put(
                        "points",
                        buildJsonArray {
                            points.forEach { (x, y) -> add(buildJsonObject { put("x", x); put("y", y) }) }
                        },
                    )
                },
            )
        }

    private fun model(
        nodes: List<JsonObject>,
        edges: List<JsonObject> = emptyList(),
    ): JsonObject =
        buildJsonObject {
            put("version", "4.0.0")
            put("id", "diagram")
            put("title", "test")
            put("type", "ClassDiagram")
            put("nodes", buildJsonArray { nodes.forEach { add(it) } })
            put("edges", buildJsonArray { edges.forEach { add(it) } })
            put("assessments", buildJsonObject {})
        }

    private fun nodeById(
        result: JsonObject,
        id: String,
    ): JsonObject =
        result["nodes"]!!.jsonArray.map { it.jsonObject }.first { it["id"]!!.jsonPrimitive.content == id }

    private fun x(
        result: JsonObject,
        id: String,
    ) = nodeById(result, id)["position"]!!.jsonObject["x"]!!.jsonPrimitive.content.toInt()

    private fun y(
        result: JsonObject,
        id: String,
    ) = nodeById(result, id)["position"]!!.jsonObject["y"]!!.jsonPrimitive.content.toInt()

    private fun widthOf(
        result: JsonObject,
        id: String,
    ) = nodeById(result, id)["width"]!!.jsonPrimitive.content.toInt()

    private fun heightOf(
        result: JsonObject,
        id: String,
    ) = nodeById(result, id)["height"]!!.jsonPrimitive.content.toInt()

    private fun boxes(
        result: JsonObject,
        parentId: String? = null,
    ) = result["nodes"]!!.jsonArray.map { it.jsonObject }
        .filter { it["parentId"]?.jsonPrimitive?.content == parentId }
        .map { node ->
            val position = node["position"]!!.jsonObject
            Triple(
                node["id"]!!.jsonPrimitive.content,
                position["x"]!!.jsonPrimitive.content.toInt() to position["y"]!!.jsonPrimitive.content.toInt(),
                node["width"]!!.jsonPrimitive.content.toInt() to node["height"]!!.jsonPrimitive.content.toInt(),
            )
        }

    private fun assertNoOverlaps(
        result: JsonObject,
        parentId: String? = null,
    ) {
        val placed = boxes(result, parentId)
        placed.forEachIndexed { i, first ->
            placed.drop(i + 1).forEach { second ->
                val apart =
                    first.second.first + first.third.first <= second.second.first ||
                        second.second.first + second.third.first <= first.second.first ||
                        first.second.second + first.third.second <= second.second.second ||
                        second.second.second + second.third.second <= first.second.second
                assertTrue("${first.first} overlaps ${second.first}: $first vs $second", apart)
            }
        }
    }

    @Test
    fun `a chain is drawn as one row per step`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(node("A"), node("B"), node("C")),
                    listOf(edge("A", "B"), edge("B", "C")),
                ),
            )
        assertTrue("B should sit below A", y(result, "A") < y(result, "B"))
        assertTrue("C should sit below B", y(result, "B") < y(result, "C"))
        assertNoOverlaps(result)
    }

    @Test
    fun `two children of one parent share a row`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(node("Root"), node("Left"), node("Right")),
                    listOf(edge("Root", "Left"), edge("Root", "Right")),
                ),
            )
        assertEquals(y(result, "Left"), y(result, "Right"))
        assertTrue(y(result, "Root") < y(result, "Left"))
        assertTrue("the row should be spread horizontally", x(result, "Left") != x(result, "Right"))
        assertNoOverlaps(result)
    }

    /** A class with a long member list is taller than its neighbours; the row below has to clear the
     *  tallest box in the row above, not an average one. */
    @Test
    fun `a tall box does not have the next row drawn through it`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(node("Root"), node("Tall", height = 400), node("Short"), node("Leaf")),
                    listOf(edge("Root", "Tall"), edge("Root", "Short"), edge("Tall", "Leaf")),
                ),
            )
        assertNoOverlaps(result)
    }

    @Test
    fun `unconnected elements are grouped below everything connected`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(node("A"), node("B"), node("Lonely"), node("AlsoLonely")),
                    listOf(edge("A", "B")),
                ),
            )
        val connectedBottom = maxOf(y(result, "A") + 60, y(result, "B") + 60)
        assertTrue("Lonely should be below the connected block", y(result, "Lonely") >= connectedBottom)
        assertTrue(y(result, "AlsoLonely") >= connectedBottom)
        assertNoOverlaps(result)
    }

    @Test
    fun `a diagram with no relationships at all still lays out as a grid`() {
        val result = PumlAutoLayout.arrange(model(listOf(node("A"), node("B"), node("C"), node("D"))))
        assertNoOverlaps(result)
        // The grid starts at the canvas origin rather than below an empty connected block.
        assertEquals(60, y(result, "A"))
    }

    /** A cycle has no topological order, so one link per cycle is treated as going back up. Without
     *  that the ranking never settles and every node ends up parked at the bottom. */
    @Test
    fun `a cycle terminates and still ranks in flow order`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(node("A"), node("B"), node("C")),
                    listOf(edge("A", "B"), edge("B", "C"), edge("C", "A")),
                ),
            )
        assertTrue(y(result, "A") < y(result, "B"))
        assertTrue(y(result, "B") < y(result, "C"))
        assertNoOverlaps(result)
    }

    @Test
    fun `a two-node cycle terminates`() {
        val result =
            PumlAutoLayout.arrange(
                model(listOf(node("A"), node("B")), listOf(edge("A", "B"), edge("B", "A"))),
            )
        assertTrue(y(result, "A") < y(result, "B"))
    }

    @Test
    fun `a self-relation is not a reason to rank a node below itself`() {
        val result =
            PumlAutoLayout.arrange(model(listOf(node("A"), node("B")), listOf(edge("A", "A"), edge("A", "B"))))
        assertTrue(y(result, "A") < y(result, "B"))
    }

    /** A lone child has nothing to rank against, so it lands at the container's own content
     *  origin — but the container itself is now sized to fit it, plus padding, rather than kept
     *  at whatever size it was handed in with. */
    @Test
    fun `a lone child sits at the container's content origin and the container shrinks to fit it`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(
                        node("Package", width = 999, height = 999, x = 999, y = 999),
                        node("Inner", parentId = "Package", x = 20, y = 60),
                        node("Other"),
                    ),
                    listOf(edge("Package", "Other")),
                ),
            )
        assertEquals(PumlLayout.CONTAINER_PADDING, x(result, "Inner"))
        assertEquals(PumlLayout.CONTAINER_HEADER, y(result, "Inner"))
        assertTrue("the container itself should have moved", x(result, "Package") != 999)
        assertEquals(160 + 2 * PumlLayout.CONTAINER_PADDING, widthOf(result, "Package"))
        assertEquals(PumlLayout.CONTAINER_HEADER + 60 + PumlLayout.CONTAINER_PADDING, heightOf(result, "Package"))
    }

    /** A relation drawn to a class *inside* a package is, for layout, a relation to the package —
     *  that is the box that ranks — but the edge itself keeps pointing at the class, not the
     *  package, so it still lands on the right box. */
    @Test
    fun `a relation to a child ranks the child's container but still points at the child`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(
                        node("Package", width = 200, height = 200),
                        node("Inner", parentId = "Package"),
                        node("Outside"),
                    ),
                    listOf(edge("Inner", "Outside")),
                ),
            )
        assertTrue("Outside should rank below the package", y(result, "Package") < y(result, "Outside"))
        assertNoOverlaps(result)
        val edge = result["edges"]!!.jsonArray.single().jsonObject
        assertEquals("Inner", edge["source"]!!.jsonPrimitive.content)
        assertEquals("Outside", edge["target"]!!.jsonPrimitive.content)
    }

    @Test
    fun `four unconnected children of a container share one row in model order`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(
                        node("Boundary", width = 10, height = 10),
                        node("A", parentId = "Boundary"),
                        node("B", parentId = "Boundary"),
                        node("C", parentId = "Boundary"),
                        node("D", parentId = "Boundary"),
                    ),
                ),
            )
        assertEquals(y(result, "A"), y(result, "B"))
        assertEquals(y(result, "A"), y(result, "C"))
        assertEquals(y(result, "A"), y(result, "D"))
        assertTrue(x(result, "A") < x(result, "B"))
        assertTrue(x(result, "B") < x(result, "C"))
        assertTrue(x(result, "C") < x(result, "D"))
        assertNoOverlaps(result, parentId = "Boundary")

        // Row width + 2x padding, header + row height + padding — the plan's own worked example.
        val rowWidth = 4 * 160 + 3 * COL_GAP
        assertEquals(rowWidth + 2 * PumlLayout.CONTAINER_PADDING, widthOf(result, "Boundary"))
        assertEquals(PumlLayout.CONTAINER_HEADER + 60 + PumlLayout.CONTAINER_PADDING, heightOf(result, "Boundary"))
    }

    @Test
    fun `twelve unconnected children of a container become a grid, not a strip`() {
        val children = (1..12).map { node("C$it", parentId = "Boundary") }
        val result = PumlAutoLayout.arrange(model(listOf(node("Boundary", width = 10, height = 10)) + children))
        assertNoOverlaps(result, parentId = "Boundary")
        val rowCount = (1..12).map { y(result, "C$it") }.distinct().size
        assertTrue("twelve children should wrap into more than one row", rowCount > 1)
    }

    @Test
    fun `connected children of a container rank in rows inside it`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(
                        node("Boundary", width = 10, height = 10),
                        node("A", parentId = "Boundary"),
                        node("B", parentId = "Boundary"),
                        node("C", parentId = "Boundary"),
                    ),
                    listOf(edge("A", "B"), edge("A", "C")),
                ),
            )
        assertEquals(y(result, "B"), y(result, "C"))
        assertTrue(y(result, "A") < y(result, "B"))
        assertNoOverlaps(result, parentId = "Boundary")
    }

    @Test
    fun `a container nested two deep is sized innermost first`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(
                        node("Outer", width = 10, height = 10),
                        node("Inner", parentId = "Outer", width = 10, height = 10),
                        node("Leaf", parentId = "Inner"),
                    ),
                ),
            )
        assertEquals(160 + 2 * PumlLayout.CONTAINER_PADDING, widthOf(result, "Inner"))
        assertEquals(PumlLayout.CONTAINER_HEADER + 60 + PumlLayout.CONTAINER_PADDING, heightOf(result, "Inner"))
        assertTrue("Outer should fit around Inner", widthOf(result, "Outer") >= widthOf(result, "Inner"))
        assertTrue("Outer should fit around Inner", heightOf(result, "Outer") >= heightOf(result, "Inner"))
        // Leaf's position is relative to Inner, not to Outer.
        assertEquals(PumlLayout.CONTAINER_PADDING, x(result, "Leaf"))
        assertEquals(PumlLayout.CONTAINER_HEADER, y(result, "Leaf"))
    }

    @Test
    fun `a child's position stays parent-relative and lands on the grid`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(
                        node("Boundary", width = 10, height = 10),
                        node("A", parentId = "Boundary", width = 137),
                        node("B", parentId = "Boundary", width = 91),
                    ),
                    listOf(edge("A", "B")),
                ),
            )
        assertEquals(0, x(result, "A") % 10)
        assertEquals(0, y(result, "A") % 10)
        assertEquals(0, x(result, "B") % 10)
        assertEquals(0, y(result, "B") % 10)
        assertTrue("A relative x should be small, not an absolute canvas coordinate", x(result, "A") < 100)
    }

    @Test
    fun `a parentId cycle terminates`() {
        val result =
            PumlAutoLayout.arrange(
                model(listOf(node("A", parentId = "B"), node("B", parentId = "A"))),
            )
        assertNoOverlaps(result)
    }

    /** A title/description block is a caption the author placed; nothing can connect to it, so it has
     *  no place in the graph and no business being moved. */
    @Test
    fun `an annotation node is left where the author put it`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(
                        node("Title", type = "titleAndDesctiption", x = 800, y = 40),
                        node("A"),
                        node("B"),
                    ),
                    listOf(edge("A", "B")),
                ),
            )
        assertEquals(800, x(result, "Title"))
        assertEquals(40, y(result, "Title"))
    }

    @Test
    fun `every edge is freed to re-route and re-picks its sides`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(node("A"), node("B")),
                    listOf(edge("A", "B", points = listOf(10 to 10, 20 to 900))),
                ),
            )
        val edge = result["edges"]!!.jsonArray.single().jsonObject
        assertEquals(0, edge["data"]!!.jsonObject["points"]!!.jsonArray.size)
        // A is directly above B, so the relation leaves the bottom and arrives at the top.
        assertEquals("bottom", edge["sourceHandle"]!!.jsonPrimitive.content)
        assertEquals("top", edge["targetHandle"]!!.jsonPrimitive.content)
        // Everything about the relation that is not geometry survives.
        assertEquals("A to B", edge["data"]!!.jsonObject["label"]!!.jsonPrimitive.content)
        assertEquals("A->B", edge["id"]!!.jsonPrimitive.content)
    }

    @Test
    fun `the same model always arranges the same way`() {
        val source =
            model(
                listOf(node("A"), node("B"), node("C"), node("D"), node("Lonely")),
                listOf(edge("A", "B"), edge("A", "C"), edge("B", "D"), edge("C", "D")),
            )
        assertEquals(PumlAutoLayout.arrange(source), PumlAutoLayout.arrange(source))
        // And arranging an arrangement changes nothing more.
        assertEquals(PumlAutoLayout.arrange(source), PumlAutoLayout.arrange(PumlAutoLayout.arrange(source)))
    }

    /** The container-recursion machinery is new, so it gets its own fixed-point check rather than
     *  relying on the root-only case above to stand in for it. */
    @Test
    fun `arranging a nested container twice, or arranging an arrangement, changes nothing more`() {
        val source =
            model(
                listOf(
                    node("Boundary", width = 10, height = 10),
                    node("A", parentId = "Boundary"),
                    node("B", parentId = "Boundary"),
                    node("C", parentId = "Boundary"),
                    node("Outside"),
                ),
                listOf(edge("A", "B"), edge("B", "C"), edge("A", "Outside")),
            )
        assertEquals(PumlAutoLayout.arrange(source), PumlAutoLayout.arrange(source))
        assertEquals(PumlAutoLayout.arrange(source), PumlAutoLayout.arrange(PumlAutoLayout.arrange(source)))
    }

    @Test
    fun `everything the model carries beyond geometry is passed through`() {
        val source = model(listOf(node("A")))
        val result = PumlAutoLayout.arrange(source)
        assertEquals("test", result["title"]!!.jsonPrimitive.content)
        assertEquals("ClassDiagram", result["type"]!!.jsonPrimitive.content)
        assertEquals("diagram", result["id"]!!.jsonPrimitive.content)
        assertNotNull(result["assessments"])
        // Node identity and content are untouched — only `position` changes.
        val node = nodeById(result, "A")
        assertEquals("A", node["data"]!!.jsonObject["name"]!!.jsonPrimitive.content)
        assertEquals(160, node["width"]!!.jsonPrimitive.content.toInt())
    }

    @Test
    fun `an empty model is handed back unchanged`() {
        val empty = model(emptyList())
        assertEquals(empty, PumlAutoLayout.arrange(empty))
    }

    /** Positions land on the 10 px grid the canvas snaps to, so a laid-out node is not half a step
     *  off the one beside it. */
    @Test
    fun `positions land on the grid`() {
        val result =
            PumlAutoLayout.arrange(
                model(
                    listOf(node("A", width = 137), node("B", width = 91), node("C", width = 213)),
                    listOf(edge("A", "B"), edge("A", "C")),
                ),
            )
        boxes(result).forEach { (id, position, _) ->
            assertEquals("$id x is off the grid", 0, position.first % 10)
            assertEquals("$id y is off the grid", 0, position.second % 10)
        }
    }

    /** The whole point of the command, on a real mapper output rather than a hand-built model: what
     *  an import leaves in a grid that ignores the relationships, one arrange ranks by them. */
    @Test
    fun `arranging a freshly imported class diagram ranks it by its relationships`() {
        val source =
            """
            @startuml
            class Customer
            class Order
            class Product
            Customer --> Order
            Order --> Product
            @enduml
            """.trimIndent()
        val parsed = PlantUmlImporter.parse(source) as PumlParseResult.Parsed
        val imported = ApollonModelMapper.toApollonModel(parsed.diagram, null, "orders").model
        val arranged = PumlAutoLayout.arrange(imported)

        fun yOf(
            model: JsonObject,
            name: String,
        ) = model["nodes"]!!.jsonArray.map { it.jsonObject }
            .first { it["data"]!!.jsonObject["name"]!!.jsonPrimitive.content == name }["position"]!!
            .jsonObject["y"]!!.jsonPrimitive.content.toInt()

        assertTrue(yOf(arranged, "Customer") < yOf(arranged, "Order"))
        assertTrue(yOf(arranged, "Order") < yOf(arranged, "Product"))
        // The mapper's grid filled rows in declaration order, so `Customer --> Order` was drawn
        // sideways along a row. That is what this replaces.
        assertEquals(yOf(imported, "Customer"), yOf(imported, "Order"))
        assertNoOverlaps(arranged)
    }
}
