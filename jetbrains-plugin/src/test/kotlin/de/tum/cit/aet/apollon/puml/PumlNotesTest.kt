package de.tum.cit.aet.apollon.puml

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
 * The four `note` forms PlantUML files are actually written in, and the two the exporter picks
 * between. A note used to be an annotation with nowhere to go but the sidecar; it is now an
 * element like any other, so what matters is that each form survives the trip out and back.
 */
class PumlNotesTest {
    private fun parse(source: String) = PlantUmlImporter.parse(source) as PumlParseResult.Parsed

    private fun wrap(body: String) = "@startuml\n$body\n@enduml\n"

    @Test
    fun `the quoted alias form is read back with its anchors`() {
        val parsed = parse(wrap("""class A
class B
note "shared rule" as N1
N1 .. A
N1 .. B"""))
        val note = parsed.diagram.notes.single()
        assertEquals("shared rule", note.text)
        assertEquals(listOf("A", "B"), note.attachments)
        assertEquals(0, parsed.unsupportedCount)
    }

    @Test
    fun `an anchor line written the other way round still finds its note`() {
        val note = parse(wrap("""class A
note "hi" as N1
A .. N1""")).diagram.notes.single()
        assertEquals(listOf("A"), note.attachments)
    }

    @Test
    fun `a dashed relation between two classes is not mistaken for an anchor`() {
        val parsed = parse(wrap("""class A
class B
A .. B"""))
        assertTrue(parsed.diagram.notes.isEmpty())
        assertEquals(1, parsed.diagram.relations.size)
    }

    @Test
    fun `the block alias form keeps its line breaks`() {
        val note = parse(wrap("""class A
note as N1
  first
  second
end note
N1 .. A""")).diagram.notes.single()
        assertEquals("first\nsecond", note.text)
    }

    @Test
    fun `a note reaching two elements is written with an alias, not a side`() {
        val parsed = parse(wrap("""class A
class B
note "shared rule" as N1
N1 .. A
N1 .. B"""))
        val mapped = ApollonModelMapper.toApollonModel(parsed.diagram, null, "t")
        val exported = PlantUmlDiagramExporter.render(mapped.model, parsed.residual)
        assertTrue(exported.text, exported.text.contains("""note "shared rule" as N1"""))
        assertTrue(exported.text, exported.text.contains("N1 .. A"))
        assertTrue(exported.text, exported.text.contains("N1 .. B"))
        assertNull(RoundTripValidator.validate(exported.text, mapped.model))
        assertEquals(2, parse(exported.text).diagram.notes.single().attachments.size)
    }

    @Test
    fun `a generated alias never collides with a class of the same name`() {
        val notes = listOf(PumlNote("floating"))
        val lines = PumlNotes.render(notes, "  ", setOf("N1", "N2"))
        assertTrue(lines.toString(), lines.single().endsWith("as N3"))
    }

    @Test
    fun `a floating note survives the round trip with no anchor at all`() {
        val parsed = parse(wrap("""class A
note "just a remark" as N1"""))
        val mapped = ApollonModelMapper.toApollonModel(parsed.diagram, null, "t")
        val noteNode = mapped.model["nodes"]!!.jsonArray.map { it.jsonObject }.single { it["type"]!!.jsonPrimitive.content == NOTE_NODE_TYPE }
        assertEquals("just a remark", noteNode["data"]!!.jsonObject["name"]!!.jsonPrimitive.content)
        assertTrue(mapped.model["edges"]!!.jsonArray.isEmpty())

        val exported = PlantUmlDiagramExporter.render(mapped.model, parsed.residual)
        assertEquals("just a remark", parse(exported.text).diagram.notes.single().text)
    }

    @Test
    fun `exporting twice without an edit produces the same bytes`() {
        val source = wrap("""class A
note right of A : keep me""")
        val first = parse(source)
        val firstModel = ApollonModelMapper.toApollonModel(first.diagram, null, "t").model
        val firstText = PlantUmlDiagramExporter.render(firstModel, first.residual).text

        val second = parse(firstText)
        val secondModel = ApollonModelMapper.toApollonModel(second.diagram, null, "t").model
        assertEquals(firstText, PlantUmlDiagramExporter.render(secondModel, second.residual).text)
    }

    @Test
    fun `notes work in the other families too, anchored by the alias the source uses`() {
        val source =
            """
            @startuml
            component "Order Service" as svc
            note right of svc : owns the ledger
            @enduml

            """.trimIndent()
        val parsed = PlantUmlComponentImporter.parse(source) as PumlComponentParseResult.Parsed
        assertEquals(listOf("svc"), parsed.diagram.notes.single().attachments)

        val mapped = ComponentModelMapper.toApollonModel(parsed.diagram, null, "t")
        val nodes = mapped.model["nodes"]!!.jsonArray.map { it.jsonObject }
        assertEquals("owns the ledger", nodes.single { it["type"]!!.jsonPrimitive.content == NOTE_NODE_TYPE }["data"]!!.jsonObject["name"]!!.jsonPrimitive.content)

        val exported = PlantUmlDiagramExporter.render(mapped.model, parsed.residual.copy(elementAliases = mapped.elementAliases))
        assertTrue(exported.text, exported.text.contains("note right of svc : owns the ledger"))
        assertNull(RoundTripValidator.validate(exported.text, mapped.model))
    }

    @Test
    fun `a note with nothing in it is dropped rather than carried as an empty box`() {
        val model: JsonObject =
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
                                put("id", "n1")
                                put("type", NOTE_NODE_TYPE)
                                put("width", 160)
                                put("height", 50)
                                put("position", buildJsonObject { put("x", 0); put("y", 0) })
                                put("data", buildJsonObject { put("name", "   ") })
                            },
                        )
                    },
                )
                put("edges", buildJsonArray {})
                put("assessments", buildJsonObject {})
            }
        assertTrue(PumlNotes.fromModel(model, emptyMap()).isEmpty())
    }
}
