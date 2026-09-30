package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * A real C4 context diagram of the shape people actually write: the macros pulled in with
 * `!includeurl` from GitHub rather than the bundled `<C4/…>` stdlib, a `title`, and blank lines
 * between every declaration.
 *
 * Nothing is fetched: [de.tum.cit.aet.apollon.render.PlantUmlRenderService] runs PlantUML sandboxed
 * and answers the include from the C4 macros PlantUML already bundles. That is the renderer's
 * business, though — the canvas reads the macro calls directly and must not care where the macros
 * came from, or whether they resolved at all.
 */
class C4ContextSandboxTest {
    private val source =
        """
        @startuml
        !includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

        title System Context Diagram

        Person(customer, "Customer", "Uses the online platform")

        System(platform, "Order Platform", "Allows customers to place and manage orders")

        System_Ext(payment, "Payment Provider", "Processes payments")
        System_Ext(email, "Email Service", "Sends notifications")

        Rel(customer, platform, "Uses", "HTTPS")
        Rel(platform, payment, "Processes payment")
        Rel(platform, email, "Sends emails")

        @enduml

        """.trimIndent() + "\n"

    @Test
    fun `an includeurl C4 file is still detected as C4`() {
        assertEquals(DiagramFamily.C4, DiagramTypeDetector.detect(source))
    }

    @Test
    fun `every element and relation reaches the parse`() {
        val parsed = PlantUmlC4Importer.parse(source)
        assertTrue("rejected: $parsed", parsed is PumlC4ParseResult.Parsed)
        parsed as PumlC4ParseResult.Parsed
        assertEquals(
            listOf("Customer", "Order Platform", "Payment Provider", "Email Service"),
            parsed.diagram.elements.map { it.displayName },
        )
        assertEquals(3, parsed.diagram.relations.size)
    }

    @Test
    fun `every element and relation reaches the canvas model`() {
        val parsed = PlantUmlC4Importer.parse(source) as PumlC4ParseResult.Parsed
        val mapped = C4ModelMapper.toApollonModel(parsed.diagram, null, "c4-context")
        val nodes = mapped.model["nodes"] as JsonArray
        val edges = mapped.model["edges"] as JsonArray
        assertEquals(
            listOf("Customer", "Order Platform", "Payment Provider", "Email Service"),
            nodes.map { textOf((it as JsonObject)["data"]?.let { d -> (d as JsonObject)["name"] }) },
        )
        assertEquals(3, edges.size)
    }

    /**
     * Goes through [PlantUmlDiagramImporter] rather than [PlantUmlC4Importer] directly, because
     * that is the leg [de.tum.cit.aet.apollon.document.PumlDocumentBridge] takes and the only one
     * that stamps `family` onto the residual — and `family` is what tells the exporter and
     * [RoundTripValidator] that a `DeploymentDiagram` model is really C4.
     */
    @Test
    fun `the whole file survives a round trip through the exporter`() {
        val parsed = PlantUmlDiagramImporter.parse(source)
        assertTrue("rejected: $parsed", parsed is DispatchedImport.Parsed)
        parsed as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(null, "c4-context")
        val residual =
            parsed.residual.copy(
                typeKeywords = mapped.typeKeywords,
                arrowTokens = mapped.arrowTokens,
                elementAliases = mapped.elementAliases,
                c4Extras = mapped.c4Extras,
            )
        val exported = PlantUmlDiagramExporter.render(mapped.model, residual)
        assertEquals(null, RoundTripValidator.validate(exported.text, mapped.model))
        // The include and the title are preamble, not something the canvas models — they have to
        // come back out verbatim or the file stops rendering in View for a different reason.
        assertTrue(exported.text.contains("!includeurl https://raw.githubusercontent.com"))
        assertTrue(exported.text.contains("title System Context Diagram"))
        // The descriptions are the argument the canvas now edits — they must not be dropped.
        assertTrue(exported.text.contains("\"Uses the online platform\""))
        assertTrue(exported.text.contains("\"HTTPS\""))
    }
}
