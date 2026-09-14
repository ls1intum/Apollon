package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The class-diagram palette offers a `package`, four `class` variants and a note. Only the four
 * class variants were ever mapped: `toPumlDiagram` branched on `data.stereotype`/`data.isAbstract`
 * and never read `node.type`, so a package and a note were both written out as `class` lines.
 * Reported from a live session — "I added a description ... and added package ... they all display
 * as class in PUML".
 */
class ClassPackageAndAnnotationTest {
    private val withPackage =
        """
        @startuml
        package Ordering {
          class Order {
            + total: double
          }
          class OrderLine
        }
        class Customer
        Customer --> Order
        @enduml

        """.trimIndent() + "\n"

    private fun parse(source: String) = PlantUmlImporter.parse(source) as PumlParseResult.Parsed

    private fun nodesOf(model: JsonObject) = model["nodes"]!!.jsonArray.map { it.jsonObject }

    private fun nameOf(node: JsonObject) = node["data"]!!.jsonObject["name"]!!.jsonPrimitive.content

    private fun typeOf(node: JsonObject) = node["type"]!!.jsonPrimitive.content

    @Test
    fun `a package and the classes inside it are imported, not swallowed as unsupported`() {
        val parsed = parse(withPackage)
        assertEquals(listOf("Ordering"), parsed.diagram.packages.map { it.name })
        assertEquals(setOf("Order", "OrderLine", "Customer"), parsed.diagram.types.map { it.name }.toSet())
        assertEquals(0, parsed.unsupportedCount)
    }

    @Test
    fun `classes remember which package they came from`() {
        val types = parse(withPackage).diagram.types.associateBy { it.name }
        assertEquals("Ordering", types["Order"]!!.parentName)
        assertEquals("Ordering", types["OrderLine"]!!.parentName)
        assertNull(types["Customer"]!!.parentName)
    }

    @Test
    fun `a package becomes a package node whose classes are its children`() {
        val parsed = parse(withPackage)
        val model = ApollonModelMapper.toApollonModel(parsed.diagram, null, "t").model
        val nodes = nodesOf(model)
        val pkg = nodes.single { typeOf(it) == "package" }
        assertEquals("Ordering", nameOf(pkg))

        val pkgId = pkg["id"]!!.jsonPrimitive.content
        val children = nodes.filter { it["parentId"]?.jsonPrimitive?.content == pkgId }
        assertEquals(setOf("Order", "OrderLine"), children.map { nameOf(it) }.toSet())
        assertTrue(children.all { typeOf(it) == "class" })

        val customer = nodes.single { nameOf(it) == "Customer" }
        assertNull(customer["parentId"])
    }

    @Test
    fun `a package round-trips back to a package block rather than a class line`() {
        val parsed = parse(withPackage)
        val mapped = ApollonModelMapper.toApollonModel(parsed.diagram, null, "t")
        val residual = parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens)
        val exported = PlantUmlDiagramExporter.render(mapped.model, residual)

        assertTrue("expected a package block, got:\n${exported.text}", exported.text.contains("package Ordering {"))
        assertTrue("a package must never be written as a class", !exported.text.contains("class Ordering"))
        assertNull(RoundTripValidator.validate(exported.text, mapped.model))

        val reparsed = parse(exported.text)
        assertEquals(listOf("Ordering"), reparsed.diagram.packages.map { it.name })
        assertEquals("Ordering", reparsed.diagram.types.single { it.name == "Order" }.parentName)
    }

    private fun modelWithNote(): JsonObject =
        buildJsonObject {
            put("version", "4.0.0")
            put("id", "m")
            put("title", "t")
            put("type", "ClassDiagram")
            put(
                "nodes",
                buildJsonArray {
                    add(
                        buildJsonObject {
                            put("id", "c1")
                            put("type", "class")
                            put("width", 200)
                            put("height", 100)
                            put("position", buildJsonObject { put("x", 0); put("y", 0) })
                            put(
                                "data",
                                buildJsonObject {
                                    put("name", "Order")
                                    put("attributes", buildJsonArray {})
                                    put("methods", buildJsonArray {})
                                },
                            )
                        },
                    )
                    add(
                        buildJsonObject {
                            put("id", "n1")
                            put("type", "colorDescription")
                            put("width", 160)
                            put("height", 50)
                            put("position", buildJsonObject { put("x", 400); put("y", 40) })
                            put("data", buildJsonObject { put("name", "Cancellation only while DRAFT") })
                        },
                    )
                },
            )
            put(
                "edges",
                buildJsonArray {
                    add(
                        buildJsonObject {
                            put("id", "e1")
                            put("source", "n1")
                            put("target", "c1")
                            put("type", "NoteLink")
                            put("sourceHandle", "left")
                            put("targetHandle", "right")
                            put("data", buildJsonObject { put("points", buildJsonArray {}) })
                        },
                    )
                },
            )
            put("assessments", buildJsonObject {})
        }

    @Test
    fun `a note is written into the PlantUML as a note anchored to what it annotates`() {
        val model = modelWithNote()
        val exported = PlantUmlDiagramExporter.render(model, PumlResidual.empty())
        assertTrue("expected an anchored note, got:\n${exported.text}", exported.text.contains("note right of Order : Cancellation only while DRAFT"))
        assertTrue("a note must never be written as a class", !exported.text.contains("class \"Cancellation"))
        assertTrue(exported.text.contains("class Order"))
        assertNull("the note must not make the round trip fail", RoundTripValidator.validate(exported.text, model))
    }

    @Test
    fun `a note comes back on the next import, anchored to the same element`() {
        val exported = PlantUmlDiagramExporter.render(modelWithNote(), PumlResidual.empty())
        val reparsed = parse(exported.text)
        val note = reparsed.diagram.notes.single()
        assertEquals("Cancellation only while DRAFT", note.text)
        assertEquals(listOf("Order"), note.attachments)

        val mapped = ApollonModelMapper.toApollonModel(reparsed.diagram, null, "t")
        val nodes = nodesOf(mapped.model)
        val noteNode = nodes.single { typeOf(it) == "colorDescription" }
        assertEquals("Cancellation only while DRAFT", nameOf(noteNode))

        val edge = mapped.model["edges"]!!.jsonArray.single().jsonObject
        assertEquals("NoteLink", edge["type"]!!.jsonPrimitive.content)
        assertEquals(noteNode["id"]!!.jsonPrimitive.content, edge["source"]!!.jsonPrimitive.content)
        assertEquals(
            nodes.single { nameOf(it) == "Order" }["id"]!!.jsonPrimitive.content,
            edge["target"]!!.jsonPrimitive.content,
        )
    }

    @Test
    fun `the side a note is written on follows where it sits on the canvas`() {
        val leftOfOrder =
            JsonObject(
                modelWithNote().toMutableMap().apply {
                    put(
                        "nodes",
                        buildJsonArray {
                            nodesOf(modelWithNote()).forEach { node ->
                                if (typeOf(node) != "colorDescription") {
                                    add(node)
                                } else {
                                    add(
                                        JsonObject(
                                            node.toMutableMap().apply {
                                                put("position", buildJsonObject { put("x", -400); put("y", 40) })
                                            },
                                        ),
                                    )
                                }
                            }
                        },
                    )
                },
            )
        val exported = PlantUmlDiagramExporter.render(leftOfOrder, PumlResidual.empty())
        assertTrue("expected the note on the left, got:\n${exported.text}", exported.text.contains("note left of Order :"))
    }

    @Test
    fun `a note text that would terminate its own block is written in the escaped form`() {
        val model = modelWithNote()
        val awkward =
            JsonObject(
                model.toMutableMap().apply {
                    put(
                        "nodes",
                        buildJsonArray {
                            nodesOf(model).forEach { node ->
                                if (typeOf(node) != "colorDescription") {
                                    add(node)
                                } else {
                                    add(
                                        JsonObject(
                                            node.toMutableMap().apply {
                                                put("data", buildJsonObject { put("name", "first\nend note\nsecond") })
                                            },
                                        ),
                                    )
                                }
                            }
                        },
                    )
                },
            )
        val exported = PlantUmlDiagramExporter.render(awkward, PumlResidual.empty())
        // A bare `end note` line inside the block would close it early and orphan the rest.
        assertTrue("the block form must not be used here:\n${exported.text}", !exported.text.contains("\nend note"))
        assertEquals("first\nend note\nsecond", parse(exported.text).diagram.notes.single().text)
    }

    @Test
    fun `an empty sidecar still reports itself empty once annotations are in the picture`() {
        assertTrue(PumlLayoutSidecar.empty().isEmpty())
        assertNotNull(PumlLayoutSidecar.fromJson(PumlLayoutSidecar.empty().toJson()))
        assertTrue(PumlLayoutSidecar(annotations = listOf(buildJsonObject { put("id", "x") })).isEmpty().not())
    }

    @Test
    fun `a note is geometry in the sidecar now, not a whole annotation`() {
        val sidecar = PumlLayoutSidecar.fromModel(modelWithNote())
        // Its text and its anchor are in the .puml; only where it sits is the sidecar's business.
        assertTrue(sidecar.annotations.isEmpty())
        assertEquals(setOf("Order", "Cancellation only while DRAFT"), sidecar.nodes.keys)
        assertEquals(400, sidecar.nodes["Cancellation only while DRAFT"]!!.x)
    }
}
