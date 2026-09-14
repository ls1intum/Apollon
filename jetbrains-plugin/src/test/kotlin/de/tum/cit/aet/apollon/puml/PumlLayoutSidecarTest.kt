package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The committed sidecar that carries what PlantUML cannot say. The load-bearing case is the last
 * one: geometry has to survive a full `puml -> model -> sidecar -> re-import` trip, because that is
 * the trip a teammate cloning the repository makes.
 */
class PumlLayoutSidecarTest {
    private val source =
        """
        @startuml
        class Customer {
          -name : String
        }
        class Order
        Customer "1" --> "*" Order
        @enduml

        """.trimIndent() + "\n"

    private fun importFresh(previous: JsonObject? = null): JsonObject {
        val parsed = PlantUmlImporter.parse(source) as PumlParseResult.Parsed
        return ApollonModelMapper.toApollonModel(parsed.diagram, previous, "customer").model
    }

    private fun nodeNamed(
        model: JsonObject,
        name: String,
    ): JsonObject =
        model["nodes"]!!.jsonArray
            .map { it.jsonObject }
            .first { it["data"]!!.jsonObject["name"]!!.jsonPrimitive.content == name }

    private fun moveNode(
        model: JsonObject,
        name: String,
        x: Int,
        y: Int,
    ): JsonObject {
        val nodes =
            buildJsonArray {
                model["nodes"]!!.jsonArray.forEach { element ->
                    val node = element.jsonObject
                    if (node["data"]!!.jsonObject["name"]!!.jsonPrimitive.content == name) {
                        add(
                            JsonObject(
                                node.toMutableMap().apply {
                                    put("position", buildJsonObject { put("x", x); put("y", y) })
                                },
                            ),
                        )
                    } else {
                        add(node)
                    }
                }
            }
        return JsonObject(model.toMutableMap().apply { put("nodes", nodes) })
    }

    @Test
    fun `reads node geometry out of a canvas model, keyed by element name`() {
        val sidecar = PumlLayoutSidecar.fromModel(moveNode(importFresh(), "Order", 400, 250))

        assertEquals(setOf("Customer", "Order"), sidecar.nodes.keys)
        assertEquals(400, sidecar.nodes["Order"]!!.x)
        assertEquals(250, sidecar.nodes["Order"]!!.y)
    }

    @Test
    fun `records edges by endpoint name rather than by id`() {
        val sidecar = PumlLayoutSidecar.fromModel(importFresh())

        assertEquals(1, sidecar.edges.size)
        assertEquals("Customer", sidecar.edges[0].source)
        assertEquals("Order", sidecar.edges[0].target)
    }

    @Test
    fun `survives a write and read of the sidecar file`() {
        val original = PumlLayoutSidecar.fromModel(moveNode(importFresh(), "Customer", 120, 340))

        val restored = PumlLayoutSidecar.fromJson(original.toJson())

        assertEquals(original.nodes, restored.nodes)
        assertEquals(original.edges, restored.edges)
    }

    @Test
    fun `serializes nodes in a stable order so the committed file diffs cleanly`() {
        val model = importFresh()
        val sidecar = PumlLayoutSidecar.fromModel(model)

        val json = sidecar.toJson()

        assertTrue(json.indexOf("\"Customer\"") < json.indexOf("\"Order\""))
        assertEquals(json, PumlLayoutSidecar.fromJson(json).toJson())
    }

    @Test
    fun `an empty sidecar contributes no previous model, so a fresh import auto-lays out`() {
        assertNull(PumlLayoutSidecar.empty().toPreviousModel())
    }

    @Test
    fun `a sidecar from a newer plugin is ignored rather than half-read`() {
        val newer = PumlLayoutSidecar.fromModel(importFresh()).toJson().replace("\"version\": 1", "\"version\": 99")

        assertTrue(PumlLayoutSidecar.fromJson(newer).isEmpty())
    }

    @Test
    fun `restores positions on re-import, which is what makes layout travel with the repository`() {
        val moved = moveNode(importFresh(), "Order", 640, 480)
        val sidecar = PumlLayoutSidecar.fromJson(PumlLayoutSidecar.fromModel(moved).toJson())

        // The trip a second machine makes: the same `.puml`, no working file, only the sidecar.
        val reimported = importFresh(previous = sidecar.toPreviousModel())

        val order = nodeNamed(reimported, "Order")["position"]!!.jsonObject
        assertEquals(640, order["x"]!!.jsonPrimitive.content.toInt())
        assertEquals(480, order["y"]!!.jsonPrimitive.content.toInt())
        // ...and without the sidecar it would not have landed there.
        val withoutSidecar = nodeNamed(importFresh(), "Order")["position"]!!.jsonObject
        assertNotEquals(640, withoutSidecar["x"]!!.jsonPrimitive.content.toInt())
    }

    @Test
    fun `renaming a class in the source drops its saved position, matching the canvas merge`() {
        val sidecar = PumlLayoutSidecar.fromModel(moveNode(importFresh(), "Order", 640, 480))

        val parsed = PlantUmlImporter.parse(source.replace("class Order", "class Invoice")) as PumlParseResult.Parsed
        val renamed = ApollonModelMapper.toApollonModel(parsed.diagram, sidecar.toPreviousModel(), "customer").model

        val invoice = nodeNamed(renamed, "Invoice")["position"]!!.jsonObject
        assertNotEquals(640, invoice["x"]!!.jsonPrimitive.content.toInt())
    }
}
