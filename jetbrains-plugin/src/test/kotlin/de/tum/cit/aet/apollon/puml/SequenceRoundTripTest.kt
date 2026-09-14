package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Sequence-diagram counterpart of [RoundTripTest] — see its doc comment for the contract.
 *
 * The family where the canvas deliberately shows something other than the source: a `.puml`
 * sequence diagram opens as an Apollon communication diagram, because UML treats the two as views
 * of one interaction and the communication one is the view Apollon can draw. Most of what is
 * checked here is that the time order survives that translation, since a communication diagram has
 * no time axis to keep it in.
 */
class SequenceRoundTripTest {
    private val checkoutPuml =
        """
        @startuml
        actor Customer
        participant "Web Shop" as Shop
        database Inventory
        Customer -> Shop : place order
        Shop -> Inventory : reserve items
        Inventory --> Shop : reserved
        Shop --> Customer : order confirmed
        @enduml

        """.trimIndent() + "\n"

    private fun parse(source: String) = PlantUmlSequenceImporter.parse(source) as PumlSequenceParseResult.Parsed

    private fun importAndExport(
        source: String,
        previous: JsonObject? = null,
    ): Pair<JsonObject, String> {
        val parsed = PlantUmlDiagramImporter.parse(source) as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(previous, "checkout")
        val residual =
            parsed.residual.copy(
                typeKeywords = mapped.typeKeywords,
                arrowTokens = mapped.arrowTokens,
                elementAliases = mapped.elementAliases,
            )
        return mapped.model to PlantUmlDiagramExporter.render(mapped.model, residual).text
    }

    private fun exportOf(source: String) = importAndExport(source).second

    private fun bodyOf(text: String) =
        text.lines().dropWhile { !it.startsWith("@startuml") }.drop(1).takeWhile { !it.startsWith("@enduml") }

    @Test
    fun `the detector recognizes a sequence file, and the dispatcher routes it to the sequence importer`() {
        assertEquals(DiagramFamily.SEQUENCE, DiagramTypeDetector.detect(checkoutPuml))
        val parsed = PlantUmlDiagramImporter.parse(checkoutPuml) as DispatchedImport.Parsed
        assertEquals(DiagramFamily.SEQUENCE, parsed.family)
        assertEquals(0, parsed.unsupportedCount)
    }

    @Test
    fun `lifelines keep their keyword and their alias`() {
        val participants = parse(checkoutPuml).diagram.participants
        assertEquals(listOf("Customer", "Shop", "Inventory"), participants.map { it.refId })
        assertEquals(listOf("actor", "participant", "database"), participants.map { it.keyword })
        assertEquals("Web Shop", participants.single { it.refId == "Shop" }.displayName)
        assertTrue(participants.all { it.declared })
    }

    @Test
    fun `messages keep their order, direction and arrow token`() {
        val messages = parse(checkoutPuml).diagram.messages
        assertEquals(
            listOf("Customer" to "Shop", "Shop" to "Inventory", "Inventory" to "Shop", "Shop" to "Customer"),
            messages.map { it.sourceRefId to it.targetRefId },
        )
        assertEquals(listOf("->", "->", "-->", "-->"), messages.map { it.arrowToken })
        assertEquals("place order", messages.first().text)
    }

    @Test
    fun `a reversed arrow is read as the right-hand participant sending`() {
        val diagram = parse("@startuml\nAlice <- Bob : answer\n@enduml\n").diagram
        val message = diagram.messages.single()
        assertEquals("Bob", message.sourceRefId)
        assertEquals("Alice", message.targetRefId)
        // …and it is written back the way it was read, not normalised to `Bob -> Alice`.
        assertTrue(exportOf("@startuml\nAlice <- Bob : answer\n@enduml\n").contains("Alice <- Bob : answer"))
    }

    @Test
    fun `unedited import-then-export reproduces the source body`() {
        assertEquals(bodyOf(checkoutPuml), bodyOf(exportOf(checkoutPuml)))
    }

    @Test
    fun `re-exporting an unedited model twice produces byte-identical PlantUML`() {
        assertEquals(exportOf(checkoutPuml), exportOf(checkoutPuml))
    }

    @Test
    fun `the canvas gets one object per lifeline and one link per pair that talks`() {
        val (model, _) = importAndExport(checkoutPuml)
        val nodes = (model["nodes"] as JsonArray).map { it as JsonObject }
        val edges = (model["edges"] as JsonArray).map { it as JsonObject }

        assertEquals("CommunicationDiagram", (model["type"] as JsonPrimitive).content)
        assertEquals(3, nodes.size)
        assertTrue(nodes.all { (it["type"] as JsonPrimitive).content == "communicationObjectName" })
        // Four messages, but only two pairs talk — Customer/Shop and Shop/Inventory.
        assertEquals(2, edges.size)
        assertTrue(edges.all { (it["type"] as JsonPrimitive).content == "CommunicationLink" })
    }

    @Test
    fun `messages are numbered on the canvas, which is where their order now lives`() {
        val (model, _) = importAndExport(checkoutPuml)
        assertEquals(
            listOf("1: place order", "4: order confirmed", "2: reserve items", "3: reserved"),
            messageTexts(model),
        )
    }

    @Test
    fun `a reply carried the other way down a link keeps its direction`() {
        val (model, _) = importAndExport(checkoutPuml)
        val messages =
            (model["edges"] as JsonArray).flatMap { edge ->
                ((edge as JsonObject)["data"] as JsonObject)["messages"] as JsonArray
            }.map { it as JsonObject }
        val reply = messages.single { (it["text"] as JsonPrimitive).content.startsWith("3:") }
        assertEquals("source", (reply["direction"] as JsonPrimitive).content)
    }

    @Test
    fun `renumbering a message on the canvas reorders the sequence diagram`() {
        val parsed = PlantUmlDiagramImporter.parse(checkoutPuml) as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(null, "checkout")
        val residual =
            parsed.residual.copy(
                typeKeywords = mapped.typeKeywords,
                arrowTokens = mapped.arrowTokens,
                elementAliases = mapped.elementAliases,
            )
        // Swap the two numbers on the Shop/Inventory link: 2 becomes 3 and 3 becomes 2.
        val swapped =
            mapMessages(mapped.model) { text ->
                when {
                    text.startsWith("2:") -> text.replaceFirst("2:", "3:")
                    text.startsWith("3:") -> text.replaceFirst("3:", "2:")
                    else -> text
                }
            }
        val exported = PlantUmlDiagramExporter.render(swapped, residual).text
        val messages = parse(exported).diagram.messages
        assertEquals(listOf("place order", "reserved", "reserve items", "order confirmed"), messages.map { it.text })
    }

    @Test
    fun `a participant that was never declared does not grow a declaration line`() {
        val source = "@startuml\nAlice -> Bob : hi\nBob --> Alice : hello\n@enduml\n"
        val diagram = parse(source).diagram
        assertTrue(diagram.participants.none { it.declared })
        assertEquals(bodyOf(source), bodyOf(exportOf(source)))
    }

    @Test
    fun `a participant declared after its first use keeps its position`() {
        val source = "@startuml\nAlice -> Bob : hi\nparticipant Bob\n@enduml\n"
        val participants = parse(source).diagram.participants
        assertEquals(listOf("Alice", "Bob"), participants.map { it.refId })
        assertTrue(participants.single { it.refId == "Bob" }.declared)
    }

    /**
     * These used to reject the whole file. A communication diagram still cannot draw any of them,
     * but each one now stays exactly where it stood — which is what makes such a file editable at
     * all, and is checked properly in [SequenceFragmentsTest].
     */
    @Test
    fun `constructs a communication diagram cannot draw no longer reject the file`() {
        listOf(
            "A -> B : x\nalt ok\nA -> B : y\nend",
            "A -> B : x\nactivate B",
            "A -> B : x\nnote right : hello",
            "autonumber\nA -> B : x",
            "A -> B : x\n== Phase two ==\nA -> B : y",
            "create B\nA -> B : new",
        ).forEach { body ->
            val source = "@startuml\n$body\n@enduml\n"
            val result = PlantUmlSequenceImporter.parse(source)
            assertTrue("rejected:\n$body", result is PumlSequenceParseResult.Parsed)
            assertEquals("not reproduced:\n$body", source, exportOf(source))
        }
    }

    @Test
    fun `a lifeline the user moved keeps its position when the file is re-imported`() {
        val (first, _) = importAndExport(checkoutPuml)
        val moved =
            JsonObject(
                first.toMutableMap().apply {
                    put(
                        "nodes",
                        JsonArray(
                            (first["nodes"] as JsonArray).map { element ->
                                val node = element as JsonObject
                                if (nameOf(node) != "Inventory") {
                                    node
                                } else {
                                    JsonObject(
                                        node.toMutableMap().apply {
                                            put("position", JsonObject(mapOf("x" to JsonPrimitive(820), "y" to JsonPrimitive(30))))
                                        },
                                    )
                                }
                            },
                        ),
                    )
                },
            )
        val (second, _) = importAndExport(checkoutPuml, previous = moved)
        val inventory = (second["nodes"] as JsonArray).map { it as JsonObject }.single { nameOf(it) == "Inventory" }
        assertEquals("820", ((inventory["position"] as JsonObject)["x"] as JsonPrimitive).content)
    }

    @Test
    fun `the round trip validator accepts an unedited sequence diagram`() {
        val (model, exported) = importAndExport(checkoutPuml)
        assertNull(RoundTripValidator.validate(exported, model))
    }

    @Test
    fun `the validator refuses a candidate whose messages came back in a different order`() {
        val (model, exported) = importAndExport(checkoutPuml)
        val lines = exported.lines().toMutableList()
        val first = lines.indexOfFirst { it.contains("place order") }
        val second = lines.indexOfFirst { it.contains("reserve items") }
        lines[first] = lines[second].also { lines[second] = lines[first] }
        assertNotNull(RoundTripValidator.validate(lines.joinToString("\n"), model))
    }

    @Test
    fun `the starter is a diagram the canvas can hold and the exporter can write back`() {
        val starter = PumlScaffold.textFor(SEQUENCE_STARTER_ID)!!
        assertEquals(DiagramFamily.SEQUENCE, DiagramTypeDetector.detect(starter))
        val (model, exported) = importAndExport(starter)
        assertNull(RoundTripValidator.validate(exported, model))
        assertEquals(bodyOf(starter), bodyOf(exported))
    }

    @Test
    fun `a note added on the canvas refuses the save rather than vanishing from the file`() {
        val (model, exported) = importAndExport(checkoutPuml)
        val withNote =
            JsonObject(
                model.toMutableMap().apply {
                    put(
                        "nodes",
                        JsonArray(
                            (model["nodes"] as JsonArray) +
                                JsonObject(
                                    mapOf(
                                        "id" to JsonPrimitive("note-1"),
                                        "type" to JsonPrimitive(NOTE_NODE_TYPE),
                                        "width" to JsonPrimitive(160),
                                        "height" to JsonPrimitive(50),
                                        "position" to JsonObject(mapOf("x" to JsonPrimitive(0), "y" to JsonPrimitive(0))),
                                        "data" to JsonObject(mapOf("name" to JsonPrimitive("Worth remembering"))),
                                    ),
                                ),
                        ),
                    )
                },
            )
        val refusal = RoundTripValidator.validate(exported, withNote)
        assertNotNull(refusal)
        assertTrue(refusal!!.contains("notes cannot be written into"))
    }

    private fun nameOf(node: JsonObject) = ((node["data"] as JsonObject)["name"] as? JsonPrimitive)?.content

    private fun messageTexts(model: JsonObject): List<String> =
        (model["edges"] as JsonArray).flatMap { edge ->
            (((edge as JsonObject)["data"] as JsonObject)["messages"] as JsonArray).map {
                ((it as JsonObject)["text"] as JsonPrimitive).content
            }
        }

    private fun mapMessages(
        model: JsonObject,
        transform: (String) -> String,
    ): JsonObject {
        val edges =
            (model["edges"] as JsonArray).map { element ->
                val edge = element as JsonObject
                val data = edge["data"] as JsonObject
                val messages =
                    (data["messages"] as JsonArray).map { messageElement ->
                        val message = messageElement as JsonObject
                        JsonObject(
                            message.toMutableMap().apply {
                                put("text", JsonPrimitive(transform((message["text"] as JsonPrimitive).content)))
                            },
                        )
                    }
                JsonObject(
                    edge.toMutableMap().apply {
                        put("data", JsonObject(data.toMutableMap().apply { put("messages", JsonArray(messages)) }))
                    },
                )
            }
        return JsonObject(model.toMutableMap().apply { put("edges", JsonArray(edges)) })
    }
}
