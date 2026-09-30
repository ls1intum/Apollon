package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Test

/** Component-diagram counterpart of [RoundTripTest] — see its doc comment for the contract. */
class ComponentRoundTripTest {
    private val webAppPuml =
        """
        @startuml
        component "Web App" as web
        component "Auth Service" as auth
        web ..> auth
        @enduml

        """.trimIndent() + "\n"

    private fun importAndExport(source: String): String {
        val parsed = PlantUmlComponentImporter.parse(source) as PumlComponentParseResult.Parsed
        val mapped = ComponentModelMapper.toApollonModel(parsed.diagram, null, "web-app")
        val residual =
            parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens, elementAliases = mapped.elementAliases)
        val export = ComponentModelMapper.toPumlDiagram(mapped.model, residual)
        val prunedResidual =
            residual.copy(typeKeywords = export.typeKeywords, arrowTokens = export.arrowTokens, elementAliases = export.elementAliases)
        return PlantUmlComponentExporter.render(export.diagram, prunedResidual)
    }

    @Test
    fun `unedited import-then-export reparses to the same elements and relation count`() {
        val parsed = PlantUmlComponentImporter.parse(webAppPuml) as PumlComponentParseResult.Parsed
        val exportedText = importAndExport(webAppPuml)
        val reparsed = PlantUmlComponentImporter.parse(exportedText) as PumlComponentParseResult.Parsed

        assertEquals(parsed.diagram.elements.map { it.displayName }.toSet(), reparsed.diagram.elements.map { it.displayName }.toSet())
        assertEquals(parsed.diagram.relations.size, reparsed.diagram.relations.size)
        assertEquals(0, reparsed.unsupportedCount)
    }

    @Test
    fun `re-exporting an unedited model twice produces byte-identical PlantUML`() {
        assertEquals(importAndExport(webAppPuml), importAndExport(webAppPuml))
    }

    @Test
    fun `the diagram type detector recognizes this source as a component diagram`() {
        assertEquals(DiagramFamily.COMPONENT, DiagramTypeDetector.detect(webAppPuml))
    }

    @Test
    fun `a subsystem boundary nests its children and re-parses with the same parent grouping`() {
        val bounded =
            """
            @startuml
            package "Backend" as sys {
              component "Web App" as web
              component "Auth Service" as auth
            }
            web ..> auth
            @enduml

            """.trimIndent() + "\n"

        val parsed = PlantUmlComponentImporter.parse(bounded) as PumlComponentParseResult.Parsed
        val web = parsed.diagram.elements.single { it.refId == "web" }
        assertEquals("sys", web.parentRefId)

        val exportedText = importAndExport(bounded)
        val reparsed = PlantUmlComponentImporter.parse(exportedText) as PumlComponentParseResult.Parsed
        val reparsedWeb = reparsed.diagram.elements.single { it.displayName == "Web App" }
        val reparsedSystem = reparsed.diagram.elements.single { it.displayName == "Backend" }
        assertEquals(reparsedSystem.refId, reparsedWeb.parentRefId)
    }

    @Test
    fun `the round trip validator accepts an unedited component diagram`() {
        val parsed = PlantUmlComponentImporter.parse(webAppPuml) as PumlComponentParseResult.Parsed
        val mapped = ComponentModelMapper.toApollonModel(parsed.diagram, null, "web-app")
        val residual =
            parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens, elementAliases = mapped.elementAliases)
        val exported = PlantUmlDiagramExporter.render(mapped.model, residual)
        assertEquals(null, RoundTripValidator.validate(exported.text, mapped.model))
    }
}
