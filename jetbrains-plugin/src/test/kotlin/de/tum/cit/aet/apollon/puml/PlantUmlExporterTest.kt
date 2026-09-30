package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlantUmlExporterTest {
    @Test
    fun `renders a class with members using the residual's indent`() {
        val type =
            PumlType(
                name = "Customer",
                kind = PumlKind.CLASS,
                attributes = listOf(PumlMember("- name: String", isMethod = false, isAbstract = false)),
                methods = listOf(PumlMember("+ placeOrder()", isMethod = true, isAbstract = false)),
                keyword = "class",
            )
        val residual = PumlResidual.empty()
        val text = PlantUmlExporter.render(PumlDiagram(null, listOf(type), emptyList()), residual)
        assertTrue(text.contains("class Customer {"))
        assertTrue(text.contains("  -name : String"))
        assertTrue(text.contains("  +placeOrder()"))
        assertTrue(text.contains("@startuml"))
        assertTrue(text.contains("@enduml"))
    }

    @Test
    fun `a type with no members renders without a body block`() {
        val type = PumlType("Order", PumlKind.CLASS, emptyList(), emptyList(), "class")
        val text = PlantUmlExporter.render(PumlDiagram(null, listOf(type), emptyList()), PumlResidual.empty())
        assertTrue(text.contains("class Order"))
        assertTrue(!text.contains("{"))
    }

    @Test
    fun `renders a relation with multiplicities on both ends`() {
        val relation =
            PumlRelation(
                sourceName = "Customer",
                targetName = "Order",
                kind = PumlRelationKind.UNIDIRECTIONAL,
                sourceMultiplicity = "1",
                targetMultiplicity = "*",
                arrowToken = "-->",
            )
        val text = PlantUmlExporter.render(PumlDiagram(null, emptyList(), listOf(relation)), PumlResidual.empty())
        assertTrue(text.contains("""Customer "1" --> "*" Order"""))
    }

    @Test
    fun `a relation with no stored arrow token falls back to the canonical one for its kind`() {
        val relation = PumlRelation("A", "B", PumlRelationKind.INHERITANCE, arrowToken = "")
        val text = PlantUmlExporter.render(PumlDiagram(null, emptyList(), listOf(relation)), PumlResidual.empty())
        assertTrue(text.contains("A --|> B"))
    }

    @Test
    fun `a name that is not a bare identifier is quoted`() {
        val type = PumlType("My Class", PumlKind.CLASS, emptyList(), emptyList(), "class")
        val text = PlantUmlExporter.render(PumlDiagram(null, listOf(type), emptyList()), PumlResidual.empty())
        assertTrue(text.contains("class \"My Class\""))
    }

    @Test
    fun `preamble, unsupported and postamble render in order around the mapped content`() {
        val residual =
            PumlResidual(
                startLine = "@startuml",
                endLine = "@enduml",
                eol = "\n",
                indent = "  ",
                preamble = listOf("skinparam shadowing false"),
                unsupported = listOf("note left of A"),
                postamble = listOf("title trailing"),
            )
        val type = PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class")
        val text = PlantUmlExporter.render(PumlDiagram(null, listOf(type), emptyList()), residual)
        val lines = text.split("\n")
        val preambleIdx = lines.indexOf("skinparam shadowing false")
        val typeIdx = lines.indexOf("class A")
        val unsupportedIdx = lines.indexOf("note left of A")
        val postambleIdx = lines.indexOf("title trailing")
        assertTrue(preambleIdx < typeIdx)
        assertTrue(typeIdx < unsupportedIdx)
        assertTrue(unsupportedIdx < postambleIdx)
    }

    @Test
    fun `rendering the same diagram twice is byte-identical`() {
        val type =
            PumlType("Customer", PumlKind.CLASS, listOf(PumlMember("- name: String", false, false)), emptyList(), "class")
        val diagram = PumlDiagram(null, listOf(type), emptyList())
        val residual = PumlResidual.empty()
        assertEquals(PlantUmlExporter.render(diagram, residual), PlantUmlExporter.render(diagram, residual))
    }

    @Test
    fun `crlf residual eol is used for every line`() {
        val residual = PumlResidual.empty().copy(eol = "\r\n")
        val type = PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class")
        val text = PlantUmlExporter.render(PumlDiagram(null, listOf(type), emptyList()), residual)
        assertTrue(text.contains("\r\n"))
        assertTrue(!text.replace("\r\n", "").contains("\n"))
    }
}
