package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Object-diagram counterpart of [RoundTripTest] — see its doc comment for the contract. */
class ObjectRoundTripTest {
    private val customerPuml =
        """
        @startuml
        object customer1 {
          name = "Ada"
        }
        object order1
        customer1 --> order1
        @enduml

        """.trimIndent() + "\n"

    private fun importAndExport(source: String): String {
        val parsed = PlantUmlObjectImporter.parse(source) as PumlObjectParseResult.Parsed
        val mapped = ObjectModelMapper.toApollonModel(parsed.diagram, null, "customer")
        val residual = parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens)
        val export = ObjectModelMapper.toPumlDiagram(mapped.model, residual)
        val prunedResidual = residual.copy(typeKeywords = export.typeKeywords, arrowTokens = export.arrowTokens)
        return PlantUmlObjectExporter.render(export.diagram, prunedResidual)
    }

    @Test
    fun `unedited import-then-export reparses to the same objects and relation count`() {
        val parsed = PlantUmlObjectImporter.parse(customerPuml) as PumlObjectParseResult.Parsed
        val exportedText = importAndExport(customerPuml)
        val reparsed = PlantUmlObjectImporter.parse(exportedText) as PumlObjectParseResult.Parsed

        assertEquals(parsed.diagram.objects.map { it.name }.toSet(), reparsed.diagram.objects.map { it.name }.toSet())
        assertEquals(parsed.diagram.relations.size, reparsed.diagram.relations.size)
        assertEquals(0, reparsed.unsupportedCount)
    }

    @Test
    fun `re-exporting an unedited model twice produces byte-identical PlantUML`() {
        assertEquals(importAndExport(customerPuml), importAndExport(customerPuml))
    }

    @Test
    fun `the diagram type detector recognizes this source as an object diagram`() {
        assertEquals(DiagramFamily.OBJECT, DiagramTypeDetector.detect(customerPuml))
    }

    @Test
    fun `an aliased object declaration is preserved verbatim rather than guessed at`() {
        val aliased =
            """
            @startuml
            object "Customer One" as c1
            @enduml
            """.trimIndent()
        val result = PlantUmlObjectImporter.parse(aliased)
        assertTrue(result is PumlObjectParseResult.Rejected)
    }

    @Test
    fun `the round trip validator accepts an unedited object diagram`() {
        val parsed = PlantUmlObjectImporter.parse(customerPuml) as PumlObjectParseResult.Parsed
        val mapped = ObjectModelMapper.toApollonModel(parsed.diagram, null, "customer")
        val exported = PlantUmlDiagramExporter.render(mapped.model, parsed.residual.copy(typeKeywords = mapped.typeKeywords, arrowTokens = mapped.arrowTokens))
        assertEquals(null, RoundTripValidator.validate(exported.text, mapped.model))
    }
}
