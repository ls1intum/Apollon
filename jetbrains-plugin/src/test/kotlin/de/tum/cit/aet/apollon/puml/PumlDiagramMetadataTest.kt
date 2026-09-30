package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * [PumlDiagramMetadataCodec] stores name/type/description as one `'`-comment line, on the strength
 * of two facts already true of every importer (see [PlantUmlDiagramImporter.parse]/exporter pair):
 * a `'` line is Tier-A and lands in [PumlResidual.preamble] untouched, and [DiagramTypeDetector]
 * drops `'` lines before classifying grammar. This is what lets the line live through a real
 * import/export round trip without any importer or exporter change.
 */
class PumlDiagramMetadataTest {
    @Test
    fun `a file with no metadata line parses to all null`() {
        val metadata = PumlDiagramMetadataCodec.parse("@startuml\nclass Foo\n@enduml\n")
        assertNull(metadata.type)
        assertNull(metadata.name)
        assertNull(metadata.description)
    }

    @Test
    fun `render then parse round-trips every field`() {
        val original = PumlDiagramMetadata("C4-CONTAINER", "Checkout Flow", "How the checkout container fits together")
        val parsed = PumlDiagramMetadataCodec.parse(PumlDiagramMetadataCodec.renderLine(original) + "\n")
        assertEquals(original, parsed)
    }

    @Test
    fun `withMetadata inserts the line right after startuml`() {
        val text = "@startuml\nclass Foo\n@enduml\n"
        val updated = PumlDiagramMetadataCodec.withMetadata(text, PumlDiagramMetadata("UML-CLASS", "Foo", ""))
        val lines = updated.lines()
        assertEquals("@startuml", lines[0])
        assertTrue(lines[1].startsWith("' @architect-studio-diagram"))
        assertEquals("class Foo", lines[2])
    }

    @Test
    fun `withMetadata replaces an existing metadata line rather than duplicating it`() {
        val withOne = PumlDiagramMetadataCodec.withMetadata("@startuml\nclass Foo\n@enduml\n", PumlDiagramMetadata("UML-CLASS", "Foo", ""))
        val withTwo = PumlDiagramMetadataCodec.withMetadata(withOne, PumlDiagramMetadata("UML-OBJECT", "Bar", "desc"))
        assertEquals(1, withTwo.lines().count { it.trim().startsWith("' @architect-studio-diagram") })
        assertEquals(PumlDiagramMetadata("UML-OBJECT", "Bar", "desc"), PumlDiagramMetadataCodec.parse(withTwo))
    }

    @Test
    fun `the metadata line is invisible to family detection`() {
        val text =
            PumlDiagramMetadataCodec.withMetadata(
                "@startuml\nclass Foo\n@enduml\n",
                PumlDiagramMetadata("UML-CLASS", "Foo", ""),
            )
        assertEquals(DiagramFamily.CLASS, DiagramTypeDetector.detect(text))
    }

    @Test
    fun `the metadata line survives a real import-export round trip`() {
        val text =
            PumlDiagramMetadataCodec.withMetadata(
                "@startuml\nclass Customer\nclass Order\nCustomer --> Order\n@enduml\n",
                PumlDiagramMetadata("UML-CLASS", "Orders", "Customers and their orders"),
            )
        val parsed = PlantUmlDiagramImporter.parse(text) as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(null, "orders")
        val residual = parsed.residual.withImported(mapped)
        val exported = PlantUmlDiagramExporter.render(mapped.model, residual)

        assertEquals(
            PumlDiagramMetadata("UML-CLASS", "Orders", "Customers and their orders"),
            PumlDiagramMetadataCodec.parse(exported.text),
        )
    }
}
