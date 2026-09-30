package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * What a class diagram must survive on the way through the canvas and back.
 *
 * Companion to [RoundTripTest], which pins the happy path. This one pins the things that used to
 * be lost quietly: an aliased or stereotyped declaration and the relations attached to it, the
 * order and spelling of a class body, and a layout that draws every box clear of its neighbours.
 */
class ClassFidelityTest {
    private data class Exported(val model: JsonObject, val text: String)

    /** The pipeline as [de.tum.cit.aet.apollon.document.PumlDocumentBridge] runs it, residual
     *  carriers and all — [PumlResidual.withImported] is what keeps the two in step. */
    private fun importAndExport(
        source: String,
        edit: (JsonObject) -> JsonObject = { it },
    ): Exported {
        val parsed = PlantUmlImporter.parse(source) as PumlParseResult.Parsed
        val mapped = ApollonModelMapper.toApollonModel(parsed.diagram, null, "t")
        val residual = parsed.residual.withImported(mapped)
        val edited = edit(mapped.model)
        val export = PlantUmlDiagramExporter.render(edited, residual)
        return Exported(edited, export.text)
    }

    private fun classNamed(
        model: JsonObject,
        name: String,
    ): JsonObject = model["nodes"]!!.jsonArray.map { it.jsonObject }.first { it["data"]!!.jsonObject["name"]!!.jsonPrimitive.content == name }

    /** Replaces one node wholesale, the way a canvas edit arrives. */
    private fun replacing(
        model: JsonObject,
        id: String,
        node: JsonObject,
    ): JsonObject =
        buildJsonObject {
            model.forEach { (k, v) -> put(k, v) }
            put(
                "nodes",
                buildJsonArray {
                    model["nodes"]!!.jsonArray.forEach { add(if (it.jsonObject["id"]!!.jsonPrimitive.content == id) node else it) }
                },
            )
        }

    private fun withMembers(
        node: JsonObject,
        attributes: JsonArray,
        methods: JsonArray,
    ): JsonObject =
        buildJsonObject {
            node.forEach { (k, v) -> if (k != "data") put(k, v) }
            put(
                "data",
                buildJsonObject {
                    node["data"]!!.jsonObject.forEach { (k, v) -> if (k != "attributes" && k != "methods") put(k, v) }
                    put("attributes", attributes)
                    put("methods", methods)
                },
            )
        }

    private fun member(name: String) = buildJsonObject { put("id", name); put("name", name) }

    // ---- alias and stereotype ------------------------------------------------------------

    private val aliasedPuml =
        """
        @startuml
        class "Order Line" as OL <<entity>>
        class Product
        OL --> Product : describes
        @enduml
        """.trimIndent() + "\n"

    @Test
    fun `an aliased class reaches the canvas under its display name`() {
        val model = importAndExport(aliasedPuml).model
        assertEquals(
            setOf("Order Line", "Product"),
            model["nodes"]!!.jsonArray.map { it.jsonObject["data"]!!.jsonObject["name"]!!.jsonPrimitive.content }.toSet(),
        )
        // One edge, and it is the one the source drew: before this the declaration went to the
        // residual, so `OL` matched no node and the relation was dropped on the floor.
        assertEquals(1, model["edges"]!!.jsonArray.size)
    }

    @Test
    fun `the alias, the stereotype and the relation all come back`() {
        val text = importAndExport(aliasedPuml).text
        assertTrue(text, text.contains("""class "Order Line" as OL <<entity>>"""))
        assertTrue(text, text.contains("OL --> Product : describes"))
    }

    @Test
    fun `an unedited aliased diagram round-trips byte for byte`() {
        assertEquals(aliasedPuml, importAndExport(aliasedPuml).text)
    }

    @Test
    fun `the round-trip gate accepts an aliased diagram`() {
        val exported = importAndExport(aliasedPuml)
        assertNull(RoundTripValidator.validate(exported.text, exported.model))
    }

    // ---- class body fidelity -------------------------------------------------------------

    private val bodyPuml =
        """
        @startuml
        class Account {
          -id : Long
          +deposit(amount : double)
          -balance : double
          --
          +close()
        }
        @enduml
        """.trimIndent() + "\n"

    @Test
    fun `a class body keeps its order, its separators and its own spacing`() {
        // Every one of these used to change on the first save after a drag: `-id : Long` was
        // re-rendered as `- id : Long`, `-balance` was hoisted above `+deposit`, and the `--`
        // was moved out of the class to the bottom of the file.
        assertEquals(bodyPuml, importAndExport(bodyPuml).text)
    }

    @Test
    fun `editing one member re-renders the body and drops nothing`() {
        val exported =
            importAndExport(bodyPuml) { model ->
                val account = classNamed(model, "Account")
                replacing(
                    model,
                    account["id"]!!.jsonPrimitive.content,
                    withMembers(
                        account,
                        buildJsonArray { add(member("- id: Long")); add(member("- balance: BigDecimal")) },
                        buildJsonArray { add(member("+ deposit(amount : double)")); add(member("+ close()")) },
                    ),
                )
            }
        assertTrue(exported.text, exported.text.contains("-balance : BigDecimal"))
        assertTrue(exported.text, exported.text.contains("+deposit(amount : double)"))
        assertTrue(exported.text, exported.text.contains("+close()"))
        assertNull(RoundTripValidator.validate(exported.text, exported.model))
    }

    /** The gate's job: an export that lost a member must not reach the file. */
    @Test
    fun `the round-trip gate refuses a candidate that lost a member`() {
        val exported = importAndExport(bodyPuml)
        val mutilated = exported.text.lines().filterNot { it.trim() == "-balance : double" }.joinToString("\n")
        assertNotNull(RoundTripValidator.validate(mutilated, exported.model))
    }

    // ---- layout --------------------------------------------------------------------------

    @Test
    fun `stacked classes with long member lists do not overlap`() {
        val many =
            (1..8).map { i -> PumlMember("- someRatherLongFieldName$i: java.math.BigDecimal", isMethod = false, isAbstract = false) }
        val diagram =
            PumlDiagram(
                null,
                (1..4).map { i -> PumlType("Class$i", PumlKind.CLASS, many, emptyList(), "class") },
                emptyList(),
            )
        val nodes = ApollonModelMapper.toApollonModel(diagram, null, "t").model["nodes"]!!.jsonArray.map { it.jsonObject }
        val rects =
            nodes.map { node ->
                Rect(
                    node["position"]!!.jsonObject["x"]!!.jsonPrimitive.content.toInt(),
                    node["position"]!!.jsonObject["y"]!!.jsonPrimitive.content.toInt(),
                    node["width"]!!.jsonPrimitive.content.toInt(),
                    node["height"]!!.jsonPrimitive.content.toInt(),
                )
            }
        rects.forEachIndexed { i, a ->
            rects.drop(i + 1).forEach { b ->
                val overlaps =
                    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
                assertTrue("$a overlaps $b", !overlaps)
            }
        }
    }

    @Test
    fun `a box is sized to the longest line it has to show`() {
        val narrow = PumlLayout.sizeOf(PumlType("A", PumlKind.CLASS, emptyList(), emptyList(), "class"))
        val wide =
            PumlLayout.sizeOf(
                PumlType(
                    "A",
                    PumlKind.CLASS,
                    listOf(PumlMember("- aVeryLongFieldNameIndeed: java.util.concurrent.CompletableFuture", false, false)),
                    emptyList(),
                    "class",
                ),
            )
        assertTrue("$wide should be wider than $narrow", wide.width > narrow.width)
    }

    /** A package that already remembers where some of its classes sit still has to find room for
     *  the ones the source has just added. The cursor only advanced for fresh children, so they
     *  all landed on the same y. */
    @Test
    fun `fresh classes added to a remembered package are stacked, not piled up`() {
        val pkgPuml = { classes: String -> "@startuml\npackage domain {\n$classes}\n@enduml\n" }
        val first = PlantUmlImporter.parse(pkgPuml("  class A\n")) as PumlParseResult.Parsed
        val previous = ApollonModelMapper.toApollonModel(first.diagram, null, "t").model

        val second = PlantUmlImporter.parse(pkgPuml("  class A\n  class B\n  class C\n")) as PumlParseResult.Parsed
        val nodes =
            ApollonModelMapper.toApollonModel(second.diagram, previous, "t").model["nodes"]!!
                .jsonArray.map { it.jsonObject }
                .filter { it["type"]!!.jsonPrimitive.content == "class" }
        val ys = nodes.map { it["position"]!!.jsonObject["y"]!!.jsonPrimitive.content.toInt() }
        assertEquals("every child needs its own row, got $ys", ys.size, ys.toSet().size)
    }

    // ---- a whole realistic file --------------------------------------------------------------

    /**
     * A textbook class diagram of the kind people actually open first: every classifier kind, end
     * labels on the associations, and a `:` label on three of them. Nothing here is exotic, which
     * is the point — it has to be exact.
     */
    private val classDiaPuml =
        """
        @startuml

        class Customer {
          -id : Long
          -name : String
          +placeOrder() : Order
        }
        interface PaymentService {
          +pay(amount: double) : boolean
        }
        abstract class Person {
          -name : String
          +getName() : String
        }
        class Employee {
          -employeeId : String
        }
        enum Enumeration {
          Case 1
          Case 2
          Case 3
        }
        Customer "1" --> "0..*" Order : places
        PaymentService <|.. CreditCardPayment
        Person <|-- Employee
        Order ..> PaymentService : uses
        @enduml
        """.trimIndent() + "\n"

    @Test
    fun `a textbook class diagram survives untouched`() {
        val parsed = PlantUmlImporter.parse(classDiaPuml) as PumlParseResult.Parsed
        assertEquals(0, parsed.unsupportedCount)
        // `Order` and `CreditCardPayment` are declared by the relations that name them.
        assertEquals(
            listOf("Customer", "PaymentService", "Person", "Employee", "Enumeration", "Order", "CreditCardPayment"),
            parsed.diagram.types.map { it.name },
        )
        assertEquals(4, parsed.diagram.relations.size)

        val exported = importAndExport(classDiaPuml)
        assertNull(RoundTripValidator.validate(exported.text, exported.model))
        // Every declared body comes back exactly as written, the implicit two as bare `class`
        // lines — so the only change to the file is the declarations PlantUML had left implicit.
        assertTrue(exported.text, exported.text.contains("  +pay(amount: double) : boolean\n"))
        assertTrue(exported.text, exported.text.contains("""Customer "1" --> "0..*" Order : places"""))
        assertTrue(exported.text, exported.text.contains("class Order\n"))
    }

    // ---- undeclared endpoints --------------------------------------------------------------

    @Test
    fun `a diagram of nothing but relations still draws its classes`() {
        val source = "@startuml\nOrder --> Customer\nOrder ..> Invoice\n@enduml\n"
        val exported = importAndExport(source)
        assertEquals(
            setOf("Order", "Customer", "Invoice"),
            exported.model["nodes"]!!.jsonArray.map { it.jsonObject["data"]!!.jsonObject["name"]!!.jsonPrimitive.content }.toSet(),
        )
        assertEquals(2, exported.model["edges"]!!.jsonArray.size)
        // PlantUML would have declared them implicitly; writing them out says the same thing.
        assertTrue(exported.text, exported.text.contains("class Order"))
        assertNull(RoundTripValidator.validate(exported.text, exported.model))
    }
}
