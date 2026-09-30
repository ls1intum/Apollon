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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The half of a sequence diagram a communication diagram cannot draw: `box` swimlanes,
 * `activate`/`deactivate` bars, `alt`/`else`/`end` fragments, notes, dividers.
 *
 * None of it is modelled — the canvas shows lifelines and numbered messages, and that is all. What
 * is checked here is that none of it is *lost*: each line comes back where it stood, so opening
 * such a file in Edit and saving it changes nothing. Until this, any one of them made the importer
 * refuse the file outright and the Edit tab was simply unavailable.
 */
class SequenceFragmentsTest {
    /** The shape people actually write: swimlanes at the top, activation bars around the calls,
     *  and the two outcomes in an `alt`. Indentation, blank lines and `A -> B: x` spacing are all
     *  deliberate — every one of them is a thing that must not drift. */
    private val orderPuml =
        """
        @startuml
        title Order Processing

        autonumber

        box "Client Layer"
            actor User
            participant "Web Application" as Web
        end box

        box "Business Services"
            participant "Order Service" as Order
            database "Order DB" as DB
        end box

        User -> Web: Submit Order
        activate Web

        Web -> Order: createOrder()
        activate Order

        alt Order accepted

            Order -> DB: Save Order
            DB --> Order: Updated
            Order --> Web: 201 Created

        else Order rejected

            Order -> DB: Log rejection
            DB --> Order: Updated
            Order --> Web: 409 Conflict

        end
        deactivate Order

        Web --> User: Show result
        deactivate Web
        @enduml
        """.trimIndent() + "\n"

    private fun importAndExport(
        source: String,
        edit: (JsonObject) -> JsonObject = { it },
    ): Pair<JsonObject, String> {
        val parsed = PlantUmlDiagramImporter.parse(source) as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(null, "orders")
        val residual = parsed.residual.withImported(mapped)
        val edited = edit(mapped.model)
        return edited to PlantUmlDiagramExporter.render(edited, residual).text
    }

    private fun namesIn(model: JsonObject) =
        model["nodes"]!!.jsonArray.map { it.jsonObject["data"]!!.jsonObject["name"]!!.jsonPrimitive.content }

    private fun messagesIn(model: JsonObject) =
        model["edges"]!!.jsonArray.flatMap { edge ->
            edge.jsonObject["data"]!!.jsonObject["messages"]!!.jsonArray.map { it.jsonObject["text"]!!.jsonPrimitive.content }
        }

    @Test
    fun `the file is editable and every lifeline and message reaches the canvas`() {
        assertEquals(DiagramFamily.SEQUENCE, DiagramTypeDetector.detect(orderPuml))
        val (model, _) = importAndExport(orderPuml)
        assertEquals(listOf("User", "Web Application", "Order Service", "Order DB"), namesIn(model))
        // Every message, numbered along the time axis they lose on a communication diagram.
        assertEquals(messagesIn(model).toString(), 9, messagesIn(model).size)
        assertTrue(messagesIn(model).toString(), messagesIn(model).contains("1: Submit Order"))
        assertTrue(messagesIn(model).toString(), messagesIn(model).contains("9: Show result"))
    }

    @Test
    fun `an unedited save reproduces the file byte for byte`() {
        assertEquals(orderPuml, importAndExport(orderPuml).second)
    }

    @Test
    fun `the round-trip gate accepts it`() {
        val (model, text) = importAndExport(orderPuml)
        assertNull(RoundTripValidator.validate(text, model))
    }

    /** Both branches send `DB --> Order: Updated` — same endpoints, same text. The two must not
     *  share an anchor, or whatever follows the second would be filed under the first and come
     *  back in the other branch. */
    @Test
    fun `a message sent twice keeps its two anchors apart`() {
        val parsed = PlantUmlSequenceImporter.parse(orderPuml) as PumlSequenceParseResult.Parsed
        assertEquals(
            listOf("DB|Order|Updated#0", "DB|Order|Updated#1"),
            parsed.residual.messageLines.keys.filter { it.startsWith("DB|Order|Updated#") },
        )
        // Only the second branch's `409 Conflict` is followed by the block that closes the `alt`.
        assertTrue(parsed.residual.anchoredLines.getValue("Order|Web|409 Conflict#0").contains("end"))
    }

    @Test
    fun `the swimlanes are read as grouping, not as noise`() {
        val parsed = PlantUmlSequenceImporter.parse(orderPuml) as PumlSequenceParseResult.Parsed
        assertEquals(
            listOf("""box "Client Layer"""", """box "Client Layer"""", """box "Business Services"""", """box "Business Services""""),
            parsed.diagram.participants.map { it.boxName },
        )
    }

    /** Once the canvas has changed the lifelines the verbatim block no longer describes them, so
     *  the declarations are regenerated — and the boxes have to be rebuilt around the survivors
     *  rather than dropped with the block they came from. */
    @Test
    fun `a renamed lifeline regenerates the declarations and keeps the boxes`() {
        val (_, text) =
            importAndExport(orderPuml) { model ->
                buildJsonObject {
                    model.forEach { (k, v) -> put(k, v) }
                    put(
                        "nodes",
                        buildJsonArray {
                            model["nodes"]!!.jsonArray.forEach { node ->
                                val data = node.jsonObject["data"]!!.jsonObject
                                add(
                                    if (data["name"]!!.jsonPrimitive.content != "Order DB") {
                                        node
                                    } else {
                                        renamed(node.jsonObject, "Order Store")
                                    },
                                )
                            }
                        },
                    )
                }
            }
        assertTrue(text, text.contains("""box "Business Services""""))
        assertTrue(text, text.contains("""database "Order Store" as DB"""))
        assertEquals("both boxes still close", 2, text.lines().count { it.trim() == "end box" })
    }

    /**
     * Deleting the message an `activate` hung off is the case that has nowhere good to put it. It
     * must not be dropped, and it must not be shunted past the `end` that closes the fragment it
     * opened — so it falls back to the message that now precedes it.
     */
    @Test
    fun `an anchor whose message was deleted moves up, it does not disappear`() {
        val (_, text) =
            importAndExport(orderPuml) { model ->
                buildJsonObject {
                    model.forEach { (k, v) -> put(k, v) }
                    put("edges", buildJsonArray { model["edges"]!!.jsonArray.forEach { add(withoutMessage(it.jsonObject, "createOrder()")) } })
                }
            }
        val body = text.lines()
        assertTrue(text, body.none { it.contains("createOrder()") })
        // `activate Order` and the `alt` it preceded are both still here, and still ahead of the
        // `end` that closes the fragment.
        val activate = body.indexOfFirst { it.trim() == "activate Order" }
        val alt = body.indexOfFirst { it.trim().startsWith("alt ") }
        val end = body.indexOfFirst { it.trim() == "end" }
        assertTrue("activate=$activate alt=$alt end=$end in:\n$text", activate in 0 until alt && alt < end)
    }

    private fun renamed(
        node: JsonObject,
        name: String,
    ): JsonObject =
        buildJsonObject {
            node.forEach { (k, v) -> if (k != "data") put(k, v) }
            put(
                "data",
                buildJsonObject {
                    node["data"]!!.jsonObject.forEach { (k, v) -> if (k != "name") put(k, v) }
                    put("name", name)
                },
            )
        }

    private fun withoutMessage(
        edge: JsonObject,
        text: String,
    ): JsonObject =
        buildJsonObject {
            edge.forEach { (k, v) -> if (k != "data") put(k, v) }
            put(
                "data",
                buildJsonObject {
                    val data = edge["data"]!!.jsonObject
                    data.forEach { (k, v) -> if (k != "messages") put(k, v) }
                    put(
                        "messages",
                        JsonArray(data["messages"]!!.jsonArray.filterNot { it.jsonObject["text"]!!.jsonPrimitive.content.endsWith(text) }),
                    )
                },
            )
        }
}
