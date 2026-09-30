package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlantUmlImporterTest {
    @Test
    fun `rejects text with no @startuml block`() {
        val result = PlantUmlImporter.parse("class Foo")
        assertTrue(result is PumlParseResult.Rejected)
    }

    @Test
    fun `rejects a non-class diagram`() {
        val text =
            """
            @startuml
            actor User
            User -> System : request
            @enduml
            """.trimIndent()
        assertTrue(PlantUmlImporter.parse(text) is PumlParseResult.Rejected)
    }

    @Test
    fun `parses the customer-order example end to end`() {
        val text =
            """
            @startuml
            class Customer {
              -name : String
              +placeOrder()
            }
            class Order
            Customer "1" --> "*" Order
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed

        assertEquals(2, result.diagram.types.size)
        val customer = result.diagram.types.single { it.name == "Customer" }
        assertEquals(PumlKind.CLASS, customer.kind)
        assertEquals(1, customer.attributes.size)
        assertEquals(1, customer.methods.size)
        assertEquals("- name: String", customer.attributes[0].apollonName)
        assertEquals("+ placeOrder()", customer.methods[0].apollonName)

        assertEquals(1, result.diagram.relations.size)
        val relation = result.diagram.relations.single()
        assertEquals("Customer", relation.sourceName)
        assertEquals("Order", relation.targetName)
        assertEquals(PumlRelationKind.UNIDIRECTIONAL, relation.kind)
        assertEquals("1", relation.sourceMultiplicity)
        assertEquals("*", relation.targetMultiplicity)
        assertEquals(0, result.unsupportedCount)
    }

    @Test
    fun `interface, enum and abstract class keywords map to the right kinds`() {
        val text =
            """
            @startuml
            interface Shape
            enum Color
            abstract class Animal
            abstract Vehicle
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        val kindByName = result.diagram.types.associate { it.name to it.kind }
        assertEquals(PumlKind.INTERFACE, kindByName["Shape"])
        assertEquals(PumlKind.ENUM, kindByName["Color"])
        assertEquals(PumlKind.ABSTRACT_CLASS, kindByName["Animal"])
        assertEquals(PumlKind.ABSTRACT_CLASS, kindByName["Vehicle"])
    }

    @Test
    fun `every relation arrow token maps to its expected kind`() {
        val cases =
            mapOf(
                "<|--" to PumlRelationKind.INHERITANCE,
                "--|>" to PumlRelationKind.INHERITANCE,
                "<|.." to PumlRelationKind.REALIZATION,
                "..|>" to PumlRelationKind.REALIZATION,
                "*--" to PumlRelationKind.COMPOSITION,
                "--*" to PumlRelationKind.COMPOSITION,
                "o--" to PumlRelationKind.AGGREGATION,
                "--o" to PumlRelationKind.AGGREGATION,
                "-->" to PumlRelationKind.UNIDIRECTIONAL,
                "<--" to PumlRelationKind.UNIDIRECTIONAL,
                "--" to PumlRelationKind.BIDIRECTIONAL,
                "..>" to PumlRelationKind.DEPENDENCY,
                "<.." to PumlRelationKind.DEPENDENCY,
                ".." to PumlRelationKind.DEPENDENCY,
            )
        for ((token, expectedKind) in cases) {
            val text =
                """
                @startuml
                class A
                class B
                A $token B
                @enduml
                """.trimIndent()
            val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
            assertEquals("token $token", expectedKind, result.diagram.relations.single().kind)
        }
    }

    @Test
    fun `a relation label after the colon is preserved`() {
        val text =
            """
            @startuml
            class A
            class B
            A --> B : uses
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertEquals("uses", result.diagram.relations.single().label)
    }

    @Test
    fun `an alias and a stereotype are read off the declaration, not banished to the residual`() {
        val text =
            """
            @startuml
            class "Order Line" as OL <<entity>>
            class Bar <<(D,orchid) Database>>
            OL --> Bar
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertEquals(0, result.unsupportedCount)

        val orderLine = result.diagram.types[0]
        assertEquals("Order Line", orderLine.name)
        assertEquals("OL", orderLine.alias)
        // The alias, not the display name, is what the relation below names it by.
        assertEquals("OL", orderLine.refId)
        assertEquals("<<entity>>", orderLine.stereotype)

        val bar = result.diagram.types[1]
        assertEquals(null, bar.alias)
        assertEquals("Bar", bar.refId)
        assertEquals("<<(D,orchid) Database>>", bar.stereotype)

        // The whole point: before this the two declarations went to `unsupported`, and the
        // relation between them was then dropped for having no endpoints — silently, from the
        // model, the export and the round-trip check alike.
        val relation = result.diagram.relations.single()
        assertEquals("OL", relation.sourceName)
        assertEquals("Bar", relation.targetName)
    }

    /** PlantUML declares a classifier the first time a relation names it, so a file that is
     *  nothing but relations is still a diagram — and used to import as an empty canvas. */
    @Test
    fun `a relation to an undeclared name declares it`() {
        val text = "@startuml\nOrder --> Customer\n@enduml"
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertEquals(listOf("Order", "Customer"), result.diagram.types.map { it.name })
        assertTrue(result.diagram.types.all { it.keyword == "class" })
        assertEquals(1, result.diagram.relations.size)
        assertEquals(0, result.unsupportedCount)
    }

    /** The exception: a name this parser already kept verbatim inside something it does not model
     *  must not be declared a second time, or the export would emit both copies. */
    @Test
    fun `a relation into a namespace body is kept verbatim instead`() {
        val text =
            """
            @startuml
            namespace domain {
              class Order
            }
            class Customer
            Order --> Customer
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertEquals(listOf("Customer"), result.diagram.types.map { it.name })
        assertTrue(result.diagram.relations.isEmpty())
        assertTrue(result.residual.unsupported.any { it.contains("Order --> Customer") })
    }

    /** A separator divides the compartments of the class it is written in. Emitting it from the
     *  residual put it at the bottom of the file instead, outside every class. */
    @Test
    fun `a separator stays inside the class body it divides`() {
        val text =
            """
            @startuml
            class A {
              -id : Long
              --
              +save()
            }
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertEquals(0, result.unsupportedCount)
        assertEquals(listOf("-id : Long", "--", "+save()"), result.diagram.types.single().bodySource)
    }

    @Test
    fun `a note block becomes a note anchored to its element`() {
        val text =
            """
            @startuml
            class A
            note left of A
              some text
              and more
            end note
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        val note = result.diagram.notes.single()
        assertEquals("some text\nand more", note.text)
        assertEquals(listOf("A"), note.attachments)
        assertEquals(NoteSide.LEFT, note.side)
        assertEquals(0, result.unsupportedCount)
    }

    @Test
    fun `note syntax this parser does not model is still preserved verbatim`() {
        val text =
            """
            @startuml
            class A
            class B
            note over A, B
              spans two elements
            end note
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertTrue(result.diagram.notes.isEmpty())
        assertTrue(result.residual.unsupported.any { it.contains("note over A, B") })
        assertTrue(result.residual.unsupported.any { it.contains("spans two elements") })
        assertTrue(result.residual.unsupported.any { it.contains("end note") })
    }

    @Test
    fun `skinparam and title lines before any diagram content are preamble`() {
        val text =
            """
            @startuml
            skinparam classAttributeIconSize 0
            title My Diagram
            class A
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertTrue(result.residual.preamble.any { it.contains("skinparam") })
        assertTrue(result.residual.preamble.any { it.contains("title My Diagram") })
        assertTrue(result.residual.unsupported.isEmpty())
    }

    @Test
    fun `tier-A lines trailing after the last mapped construct become postamble, not unsupported`() {
        val text =
            """
            @startuml
            class A
            skinparam shadowing false
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertTrue(result.residual.postamble.any { it.contains("skinparam shadowing false") })
        assertTrue(result.residual.unsupported.isEmpty())
    }

    @Test
    fun `a tier-A run that turns out to be mid-body is demoted to unsupported`() {
        val text =
            """
            @startuml
            class A
            title not actually trailing
            class B
            @enduml
            """.trimIndent()
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertEquals(2, result.diagram.types.size)
        assertTrue(result.residual.postamble.isEmpty())
        assertTrue(result.residual.unsupported.any { it.contains("title not actually trailing") })
    }

    @Test
    fun `crlf documents are detected and preserved in eol`() {
        val text = "@startuml\r\nclass A\r\n@enduml\r\n"
        val result = PlantUmlImporter.parse(text) as PumlParseResult.Parsed
        assertEquals("\r\n", result.residual.eol)
    }
}
