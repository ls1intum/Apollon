package de.tum.cit.aet.apollon.puml

import org.junit.Assert.assertEquals
import org.junit.Test

class DiagramTypeDetectorTest {
    private fun detect(text: String): DiagramFamily = DiagramTypeDetector.detect(text)

    @Test
    fun `detects a class diagram`() {
        val text =
            """
            @startuml
            class Customer {
              -name : String
            }
            class Order
            Customer "1" --> "*" Order
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.CLASS, detect(text))
    }

    @Test
    fun `detects an object diagram`() {
        val text =
            """
            @startuml
            object customer1
            customer1 : name = "Ada"
            object order1
            customer1 --> order1
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.OBJECT, detect(text))
    }

    @Test
    fun `detects a use case diagram with actor and usecase keywords`() {
        val text =
            """
            @startuml
            actor Customer
            usecase "Place Order" as UC1
            Customer --> UC1
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.USE_CASE, detect(text))
    }

    @Test
    fun `falls back to OTHER for the actor-colon and bare-parenthesis use case shorthand`() {
        // Neither `PlantUmlUseCaseImporter` nor the detector understand PlantUML's `:Actor:` /
        // `(Use case)` shorthand notations (only the `actor`/`usecase` keyword forms — see
        // PlantUmlUseCaseImporter's doc comment); a file using only shorthand is correctly not
        // recognized as an editable use case diagram rather than being misclassified and then
        // failing import with a confusing reason.
        val text =
            """
            @startuml
            :Customer:
            (Place Order)
            Customer --> (Place Order)
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.OTHER, detect(text))
    }

    @Test
    fun `a class diagram that declares an interface is still a class diagram`() {
        // `interface` is the one keyword the class and component families share. Counting it as
        // component evidence classified this — a thoroughly ordinary class diagram — as a component
        // diagram, whose importer then found nothing and swept every class into `unsupported`.
        val text =
            """
            @startuml
            abstract class Person
            class Customer
            interface Payable
            enum OrderStatus
            Person <|-- Customer
            Payable <|.. Customer
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.CLASS, detect(text))
    }

    @Test
    fun `an interface-only file with no component markers reads as a class diagram`() {
        val text =
            """
            @startuml
            interface Payable
            interface Refundable
            Payable <|-- Refundable
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.CLASS, detect(text))
    }

    @Test
    fun `detects a component diagram`() {
        val text =
            """
            @startuml
            component "Web App" as web
            interface "REST API" as api
            web ..> api
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.COMPONENT, detect(text))
    }

    @Test
    fun `detects a deployment diagram from node and artifact keywords`() {
        val text =
            """
            @startuml
            node "Application Server" as app
            artifact "app.war" as war
            app ..> war
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.DEPLOYMENT, detect(text))
    }

    @Test
    fun `detects a sequence diagram from participant declarations`() {
        val text =
            """
            @startuml
            participant Alice
            participant Bob
            Alice -> Bob : hello
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.SEQUENCE, detect(text))
    }

    @Test
    fun `detects a sequence diagram from bare messages with no declarations`() {
        val text =
            """
            @startuml
            Alice -> Bob : hello
            Bob --> Alice : hi
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.SEQUENCE, detect(text))
    }

    @Test
    fun `detects a state diagram from pseudostates`() {
        val text =
            """
            @startuml
            [*] --> Idle
            Idle --> Running
            Running --> [*]
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.STATE, detect(text))
    }

    @Test
    fun `detects a C4 context diagram from macro calls`() {
        val text =
            """
            @startuml
            !include <C4/C4_Context>
            Person(user, "User")
            System(system, "Platform")
            Rel(user, system, "Uses")
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.C4, detect(text))
    }

    @Test
    fun `falls back to OTHER for unrecognized content`() {
        val text =
            """
            @startuml
            skinparam monochrome true
            @enduml
            """.trimIndent()
        assertEquals(DiagramFamily.OTHER, detect(text))
    }

    @Test
    fun `returns UNKNOWN when there is no @startuml block`() {
        assertEquals(DiagramFamily.UNKNOWN, detect("not a plantuml file"))
    }

    @Test
    fun `hasImporter is true only for the eight families with a real importer`() {
        assertEquals(true, DiagramFamily.CLASS.hasImporter)
        assertEquals(true, DiagramFamily.OBJECT.hasImporter)
        assertEquals(true, DiagramFamily.USE_CASE.hasImporter)
        assertEquals(true, DiagramFamily.COMPONENT.hasImporter)
        assertEquals(true, DiagramFamily.DEPLOYMENT.hasImporter)
        assertEquals(true, DiagramFamily.C4.hasImporter)
        assertEquals(true, DiagramFamily.ACTIVITY.hasImporter)
        assertEquals(true, DiagramFamily.SEQUENCE.hasImporter)
        assertEquals(false, DiagramFamily.STATE.hasImporter)
        assertEquals(false, DiagramFamily.COMMUNICATION.hasImporter)
        assertEquals(false, DiagramFamily.OTHER.hasImporter)
    }
}
