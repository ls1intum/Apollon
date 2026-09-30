package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The contract a starter has to meet, and the reason [PumlScaffold] lives in the PlantUML domain:
 * whatever the picker writes must survive being read straight back, or the canvas would reject the
 * diagram it had just created.
 */
class PumlScaffoldTest {
    private fun nodesOf(model: JsonObject) = (model["nodes"] as JsonArray)

    @Test
    fun `every offered type has a starter`() {
        assertTrue(PumlScaffold.diagramTypes.isNotEmpty())
        PumlScaffold.diagramTypes.forEach { assertNotNull("no starter for $it", PumlScaffold.textFor(it)) }
    }

    @Test
    fun `a type with no PlantUML exporter is not offered a starter`() {
        assertNull(PumlScaffold.textFor("BPMN"))
        assertNull(PumlScaffold.textFor("PetriNet"))
        assertNull(PumlScaffold.textFor("Flowchart"))
    }

    @Test
    fun `every starter imports to a model of the type the user picked`() {
        PumlScaffold.diagramTypes.forEach { diagramType ->
            val text = PumlScaffold.textFor(diagramType)!!
            val parsed = PlantUmlDiagramImporter.parse(text)
            assertTrue("$diagramType starter was rejected: $parsed", parsed is DispatchedImport.Parsed)
            val model = (parsed as DispatchedImport.Parsed).toApollonModel(null, "starter").model
            // Every starter id is its own Apollon type, bar the two that are ways of *using* a
            // notation rather than notations of their own: C4 is drawn out of the deployment
            // palette, and a sequence diagram opens as a communication diagram.
            val expected =
                when (diagramType) {
                    C4_STARTER_ID -> DiagramFamily.C4.apollonType
                    SEQUENCE_STARTER_ID -> DiagramFamily.SEQUENCE.apollonType
                    else -> diagramType
                }
            assertEquals("$diagramType starter imported as the wrong family", expected, (model["type"] as? kotlinx.serialization.json.JsonPrimitive)?.content)
        }
    }

    @Test
    fun `every starter puts at least one element on the canvas`() {
        PumlScaffold.diagramTypes.forEach { diagramType ->
            val parsed = PlantUmlDiagramImporter.parse(PumlScaffold.textFor(diagramType)!!) as DispatchedImport.Parsed
            val model = parsed.toApollonModel(null, "starter").model
            assertTrue("$diagramType starter is empty on the canvas", nodesOf(model).isNotEmpty())
        }
    }

    @Test
    fun `no starter carries a line the canvas cannot show`() {
        PumlScaffold.diagramTypes.forEach { diagramType ->
            val parsed = PlantUmlDiagramImporter.parse(PumlScaffold.textFor(diagramType)!!) as DispatchedImport.Parsed
            assertEquals("$diagramType starter has unsupported lines", 0, parsed.unsupportedCount)
        }
    }

    /** The one that matters: an untouched new diagram must export back to something the validator
     *  accepts, or the user's very first canvas edit would be refused. */
    @Test
    fun `every starter survives an untouched round trip through the exporter`() {
        PumlScaffold.diagramTypes.forEach { diagramType ->
            val text = PumlScaffold.textFor(diagramType)!!
            val parsed = PlantUmlDiagramImporter.parse(text) as DispatchedImport.Parsed
            val mapped = parsed.toApollonModel(null, "starter")
            val residual =
                parsed.residual.copy(
                    typeKeywords = mapped.typeKeywords,
                    arrowTokens = mapped.arrowTokens,
                    elementAliases = mapped.elementAliases,
                )
            val exported = PlantUmlDiagramExporter.render(mapped.model, residual)
            assertNotNull(exported.text)
            assertNull(
                "$diagramType starter failed round-trip validation",
                RoundTripValidator.validate(exported.text, mapped.model),
            )
        }
    }

    /** The "New Architecture Diagram" wizard's own starters (plan §3): one per
     *  [DiagramTypeCatalog] tag, each carrying the metadata line the wizard writes. */
    @Test
    fun `every catalog tag has a starter with its metadata line`() {
        DiagramTypeCatalog.ENTRIES.forEach { entry ->
            val metadata = PumlDiagramMetadata(entry.tag, "New Diagram", "")
            val text = PumlScaffold.textForTag(entry.tag, metadata)
            assertNotNull("no starter for ${entry.tag}", text)
            assertEquals(metadata, PumlDiagramMetadataCodec.parse(text!!))
        }
    }

    @Test
    fun `a tag not in the catalog has no starter`() {
        assertNull(PumlScaffold.textForTag("NOT-A-TAG", PumlDiagramMetadata("NOT-A-TAG", "x", "")))
    }

    @Test
    fun `every C4-level catalog starter includes its own level's macro file`() {
        val expected =
            mapOf(
                "C4-CONTEXT" to "C4_Context",
                "C4-CONTAINER" to "C4_Container",
                "C4-COMPONENT" to "C4_Component",
                "C4-DYNAMIC" to "C4_Dynamic",
            )
        expected.forEach { (tag, macroFile) ->
            val text = PumlScaffold.textForTag(tag, PumlDiagramMetadata(tag, "New Diagram", ""))!!
            assertTrue("$tag starter does not include $macroFile", text.contains("<C4/$macroFile>"))
        }
    }
}
