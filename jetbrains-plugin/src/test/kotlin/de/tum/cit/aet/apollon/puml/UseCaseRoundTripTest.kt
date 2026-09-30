package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** UseCase-diagram counterpart of [RoundTripTest] — see its doc comment for the contract. */
class UseCaseRoundTripTest {
    private val orderingPuml =
        """
        @startuml
        actor Customer
        usecase "Place Order" as UC1
        usecase "Cancel Order" as UC2
        Customer --> UC1
        UC1 ..> UC2 : <<extend>>
        @enduml

        """.trimIndent() + "\n"

    private fun importAndExport(source: String): String {
        val parsed = PlantUmlUseCaseImporter.parse(source) as PumlUseCaseParseResult.Parsed
        val mapped = UseCaseModelMapper.toApollonModel(parsed.diagram, null, "ordering")
        val residual =
            parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens, elementAliases = mapped.elementAliases)
        val export = UseCaseModelMapper.toPumlDiagram(mapped.model, residual)
        val prunedResidual =
            residual.copy(typeKeywords = export.typeKeywords, arrowTokens = export.arrowTokens, elementAliases = export.elementAliases)
        return PlantUmlUseCaseExporter.render(export.diagram, prunedResidual)
    }

    @Test
    fun `unedited import-then-export reparses to the same elements and relation count`() {
        val parsed = PlantUmlUseCaseImporter.parse(orderingPuml) as PumlUseCaseParseResult.Parsed
        val exportedText = importAndExport(orderingPuml)
        val reparsed = PlantUmlUseCaseImporter.parse(exportedText) as PumlUseCaseParseResult.Parsed

        assertEquals(parsed.diagram.elements.map { it.displayName }.toSet(), reparsed.diagram.elements.map { it.displayName }.toSet())
        assertEquals(parsed.diagram.relations.size, reparsed.diagram.relations.size)
        assertEquals(0, reparsed.unsupportedCount)
    }

    @Test
    fun `re-exporting an unedited model twice produces byte-identical PlantUML`() {
        assertEquals(importAndExport(orderingPuml), importAndExport(orderingPuml))
    }

    @Test
    fun `the extend relation keeps its stereotype text across a round trip`() {
        val exportedText = importAndExport(orderingPuml)
        assertTrue(exportedText.contains("<<extend>>"))
    }

    @Test
    fun `the diagram type detector recognizes this source as a use case diagram`() {
        assertEquals(DiagramFamily.USE_CASE, DiagramTypeDetector.detect(orderingPuml))
    }

    @Test
    fun `a system boundary nests its children and re-parses with the same parent grouping`() {
        val bounded =
            """
            @startuml
            actor Customer
            rectangle "Shop" as sys {
              usecase "Browse" as UC1
              usecase "Checkout" as UC2
            }
            Customer --> UC1
            @enduml

            """.trimIndent() + "\n"

        val parsed = PlantUmlUseCaseImporter.parse(bounded) as PumlUseCaseParseResult.Parsed
        val browse = parsed.diagram.elements.single { it.refId == "UC1" }
        assertEquals("sys", browse.parentRefId)

        val exportedText = importAndExport(bounded)
        val reparsed = PlantUmlUseCaseImporter.parse(exportedText) as PumlUseCaseParseResult.Parsed
        val reparsedBrowse = reparsed.diagram.elements.single { it.displayName == "Browse" }
        val reparsedSystem = reparsed.diagram.elements.single { it.displayName == "Shop" }
        assertEquals(reparsedSystem.refId, reparsedBrowse.parentRefId)
    }

    @Test
    fun `the round trip validator accepts an unedited use case diagram`() {
        val parsed = PlantUmlUseCaseImporter.parse(orderingPuml) as PumlUseCaseParseResult.Parsed
        val mapped = UseCaseModelMapper.toApollonModel(parsed.diagram, null, "ordering")
        val residual =
            parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens, elementAliases = mapped.elementAliases)
        val exported = PlantUmlDiagramExporter.render(mapped.model, residual)
        assertEquals(null, RoundTripValidator.validate(exported.text, mapped.model))
    }
}
