package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * C4 counterpart of [RoundTripTest] — see its doc comment for the contract.
 *
 * C4 gets its own file rather than joining [DeploymentRoundTripTest] because the two share an
 * Apollon diagram type but nothing else: C4 is macros rather than keywords, nests to any depth, and
 * carries arguments the canvas either shows (technology, description) or has no field for and must
 * hand back unchanged (`$sprite`, `$tags`, `$link`).
 */
class C4RoundTripTest {
    /** A cut-down version of the C4 model's own "Internet Banking" example: three levels of
     *  nesting, a label with a comma inside its quotes, and both relation directions. */
    private val bankingPuml =
        """
        @startuml
        !include <C4/C4_Container>

        Person(customer, "Personal Banking Customer", "A customer of the bank")
        System_Boundary(banking, "Internet Banking System") {
          Container(spa, "Single-Page App", "JavaScript, Angular", "Provides banking functionality")
          Container_Boundary(api, "API Application") {
            Component(signin, "Sign In Controller", "MVC Rest Controller", "Signs users in")
          }
          ContainerDb(db, "Database", "SQL Database", "Stores registered users")
        }
        Rel(customer, spa, "Views account balances", "HTTPS")
        Rel(spa, db, "Reads from and writes to", "SQL/TCP")
        BiRel(signin, db, "Syncs with")
        @enduml

        """.trimIndent() + "\n"

    private fun parse(source: String) = PlantUmlC4Importer.parse(source) as PumlC4ParseResult.Parsed

    /** The whole pipeline as the editor runs it: through the dispatcher, so the residual carries
     *  the family that tells the exporter this is C4 and not an ordinary deployment diagram. */
    private fun importAndExport(
        source: String,
        previous: JsonObject? = null,
        edit: (JsonObject) -> JsonObject = { it },
    ): Pair<JsonObject, String> {
        val parsed = PlantUmlDiagramImporter.parse(source) as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(previous, "banking")
        val residual =
            parsed.residual.copy(
                typeKeywords = mapped.typeKeywords,
                arrowTokens = mapped.arrowTokens,
                elementAliases = mapped.elementAliases,
                c4Extras = mapped.c4Extras,
            )
        val edited = edit(mapped.model)
        return edited to PlantUmlDiagramExporter.render(edited, residual).text
    }

    private fun exportOf(source: String) = importAndExport(source).second

    @Test
    fun `the detector recognizes a C4 file, and the dispatcher routes it to the C4 importer`() {
        assertEquals(DiagramFamily.C4, DiagramTypeDetector.detect(bankingPuml))
        val parsed = PlantUmlDiagramImporter.parse(bankingPuml) as DispatchedImport.Parsed
        assertEquals(DiagramFamily.C4, parsed.family)
        // The family has to survive on the residual: a C4 model is an Apollon DeploymentDiagram,
        // so on the way out the model's own type cannot tell the exporter which one it is.
        assertEquals(DiagramFamily.C4, parsed.residual.family)
        assertEquals(0, parsed.unsupportedCount)
    }

    @Test
    fun `a method named System does not make a class diagram look like C4`() {
        val classPuml =
            """
            @startuml
            class Bootstrap {
              + System() : void
            }
            @enduml

            """.trimIndent() + "\n"
        assertEquals(DiagramFamily.CLASS, DiagramTypeDetector.detect(classPuml))
    }

    @Test
    fun `every macro becomes an element or a relation of the right kind`() {
        val diagram = parse(bankingPuml).diagram
        assertEquals(
            listOf("customer", "banking", "spa", "api", "signin", "db"),
            diagram.elements.map { it.refId },
        )
        assertEquals(C4Kind.PERSON, diagram.elements.single { it.refId == "customer" }.kind)
        assertEquals(C4Kind.BOUNDARY, diagram.elements.single { it.refId == "banking" }.kind)
        assertEquals(C4Kind.CONTAINER, diagram.elements.single { it.refId == "db" }.kind)
        assertEquals(C4Kind.COMPONENT, diagram.elements.single { it.refId == "signin" }.kind)
        assertEquals("ContainerDb", diagram.elements.single { it.refId == "db" }.macro)

        assertEquals(3, diagram.relations.size)
        assertEquals(C4RelationKind.BIDIRECTIONAL, diagram.relations.single { it.macro == "BiRel" }.kind)
        assertEquals("Views account balances", diagram.relations.first().label)
    }

    @Test
    fun `boundaries nest to any depth, not just one level`() {
        val elements = parse(bankingPuml).diagram.elements.associateBy { it.refId }
        assertNull(elements.getValue("banking").parentRefId)
        assertEquals("banking", elements.getValue("spa").parentRefId)
        assertEquals("banking", elements.getValue("api").parentRefId)
        assertEquals("api", elements.getValue("signin").parentRefId)
    }

    @Test
    fun `a comma inside a quoted argument does not split the argument list`() {
        val spa = parse(bankingPuml).diagram.elements.single { it.refId == "spa" }
        assertEquals("Single-Page App", spa.displayName)
        assertEquals(listOf("\"JavaScript, Angular\"", "\"Provides banking functionality\""), spa.extras)
    }

    @Test
    fun `Boundary_End closes a boundary just as a brace does`() {
        val source =
            """
            @startuml
            !include <C4/C4_Context>
            System_Boundary(b, "Boundary") {
              System(inner, "Inner")
            Boundary_End()
            System(outer, "Outer")
            @enduml

            """.trimIndent() + "\n"
        val diagram = parse(source).diagram
        assertEquals("b", diagram.elements.single { it.refId == "inner" }.parentRefId)
        assertNull(diagram.elements.single { it.refId == "outer" }.parentRefId)
        // Both forms are written back as `}`, which is the one the exporter emits.
        assertTrue(exportOf(source).contains("\n}\n"))
    }

    @Test
    fun `unedited import-then-export reparses to the same elements and relations`() {
        val before = parse(bankingPuml)
        val after = parse(exportOf(bankingPuml))

        assertEquals(before.diagram.elements.map { it.displayName }, after.diagram.elements.map { it.displayName })
        assertEquals(before.diagram.elements.map { it.macro }, after.diagram.elements.map { it.macro })
        assertEquals(before.diagram.elements.map { it.parentRefId }, after.diagram.elements.map { it.parentRefId })
        assertEquals(
            before.diagram.relations.map { Triple(it.sourceRefId, it.targetRefId, it.macro) },
            after.diagram.relations.map { Triple(it.sourceRefId, it.targetRefId, it.macro) },
        )
        assertEquals(0, after.unsupportedCount)
    }

    @Test
    fun `re-exporting an unedited model twice produces byte-identical PlantUML`() {
        assertEquals(exportOf(bankingPuml), exportOf(bankingPuml))
    }

    @Test
    fun `technology and description survive the round trip the canvas cannot edit them on`() {
        val exported = exportOf(bankingPuml)
        assertTrue(exported.contains("""Container(spa, "Single-Page App", "JavaScript, Angular", "Provides banking functionality")"""))
        assertTrue(exported.contains("""Rel(customer, spa, "Views account balances", "HTTPS")"""))
        assertTrue(exported.contains("""BiRel(signin, db, "Syncs with")"""))
        // And the include is what makes the macros resolve, so it has to come back untouched.
        assertTrue(exported.contains("!include <C4/C4_Container>"))
    }

    @Test
    fun `a macro the importer does not know is preserved verbatim`() {
        val source =
            """
            @startuml
            !include <C4/C4_Context>
            AddElementTag("backend", ${'$'}bgColor="lightblue")
            Person(user, "User")
            System(sys, "System", "Does things", ${'$'}tags="backend")
            Lay_D(user, sys)
            SHOW_LEGEND()
            @enduml

            """.trimIndent() + "\n"
        val parsed = parse(source)
        assertEquals(3, parsed.unsupportedCount)

        val exported = exportOf(source)
        assertTrue(exported.contains("""AddElementTag("backend", ${'$'}bgColor="lightblue")"""))
        assertTrue(exported.contains("Lay_D(user, sys)"))
        assertTrue(exported.contains("SHOW_LEGEND()"))
        assertTrue(exported.contains("""System(sys, "System", "Does things", ${'$'}tags="backend")"""))
    }

    @Test
    fun `re-stereotyping a box on the canvas changes the macro it is written as`() {
        val restereotyped =
            importAndExport(bankingPuml) { model ->
                mapNodes(model) { node ->
                    if (nameOf(node) != "Personal Banking Customer") {
                        node
                    } else {
                        withData(node) { data -> JsonObject(data.toMutableMap().apply { put("stereotype", JsonPrimitive("system")) }) }
                    }
                }
            }.second

        assertTrue(restereotyped.contains("""System(customer, "Personal Banking Customer", "A customer of the bank")"""))
        assertFalse(restereotyped.contains("Person("))
    }

    @Test
    fun `the round trip validator accepts an unedited C4 diagram`() {
        val (model, exported) = importAndExport(bankingPuml)
        assertNull(RoundTripValidator.validate(exported, model))
    }

    @Test
    fun `the validator rejects a candidate that has lost an element`() {
        val (model, exported) = importAndExport(bankingPuml)
        val mutilated = exported.lines().filterNot { it.trim().startsWith("Person(") }.joinToString("\n")
        assertTrue(RoundTripValidator.validate(mutilated, model) != null)
    }

    @Test
    fun `a note attaches to the C4 element it annotates`() {
        val source =
            """
            @startuml
            !include <C4/C4_Context>
            Person(user, "User")
            System(sys, "System")
            Rel(user, sys, "Uses")
            note right of sys : Runs in two regions
            @enduml

            """.trimIndent() + "\n"
        val diagram = parse(source).diagram
        assertEquals(listOf("Runs in two regions"), diagram.notes.map { it.text })
        assertEquals(listOf("sys"), diagram.notes.single().attachments)

        val (model, exported) = importAndExport(source)
        assertTrue(exported.contains("note right of sys : Runs in two regions"))
        // …and the canvas really holds the note plus the dashed link to what it annotates.
        assertEquals(1, nodesOf(model).count { textAt(it, "type") == NOTE_NODE_TYPE })
        assertEquals(1, edgesOf(model).count { textAt(it, "type") == NOTE_EDGE_TYPE })
    }

    @Test
    fun `positions and sizes are kept when the same file is re-imported`() {
        val (first, _) = importAndExport(bankingPuml)
        val moved =
            mapNodes(first) { node ->
                if (nameOf(node) != "Personal Banking Customer") {
                    node
                } else {
                    JsonObject(
                        node.toMutableMap().apply {
                            put("position", buildJsonObject { put("x", 999); put("y", 777) })
                        },
                    )
                }
            }
        val (second, _) = importAndExport(bankingPuml, previous = moved)
        val customer = nodesOf(second).single { nameOf(it) == "Personal Banking Customer" }
        assertEquals(999, numberAt(customer["position"] as JsonObject, "x"))
        assertEquals(777, numberAt(customer["position"] as JsonObject, "y"))
    }

    @Test
    fun `a hand-written unquoted label comes back quoted, and only changes once`() {
        val source =
            """
            @startuml
            !include <C4/C4_Context>
            Person(user, User)
            System(sys, System)
            @enduml

            """.trimIndent() + "\n"
        val once = exportOf(source)
        assertTrue(once.contains("""Person(user, "User")"""))
        assertEquals(once, exportOf(once))
    }

    // ---- technology and description ------------------------------------------------------

    /**
     * Pins the argument positions [c4ArgSpecFor] was built from. They were read off the C4 stdlib
     * bundled with the PlantUML build this plugin ships by rendering one macro per slot, and they
     * are not uniform — a `Person` puts its description first, a `Container` puts its technology
     * there, `Boundary` keeps a description at index 3 and `System_Boundary` at 2. If a stdlib bump
     * ever reorders one, this fails instead of a description quietly becoming a sprite name.
     */
    @Test
    fun `each macro's technology and description arguments sit where the C4 stdlib puts them`() {
        assertEquals(C4ArgSpec(C4ArgSlot(4, "type"), C4ArgSlot(0, "descr")), c4ArgSpecFor("Person"))
        assertEquals(C4ArgSpec(C4ArgSlot(4, "type"), C4ArgSlot(0, "descr")), c4ArgSpecFor("SystemDb_Ext"))
        assertEquals(C4ArgSpec(C4ArgSlot(0, "techn"), C4ArgSlot(1, "descr")), c4ArgSpecFor("Container"))
        assertEquals(C4ArgSpec(C4ArgSlot(0, "techn"), C4ArgSlot(1, "descr")), c4ArgSpecFor("ComponentQueue"))
        assertEquals(C4ArgSpec(C4ArgSlot(0, "type"), C4ArgSlot(1, "descr")), c4ArgSpecFor("Deployment_Node"))
        assertEquals(C4ArgSpec(C4ArgSlot(0, "type"), C4ArgSlot(3, "descr")), c4ArgSpecFor("Boundary"))
        assertEquals(C4ArgSpec(null, C4ArgSlot(2, "descr")), c4ArgSpecFor("System_Boundary"))
        // Every Rel spelling shares one signature, so the family is matched rather than listed.
        assertEquals(C4ArgSpec(C4ArgSlot(0, "techn"), C4ArgSlot(1, "descr")), c4ArgSpecFor("Rel_Back_Neighbor"))
        // A macro nobody taught it about keeps every argument in the residual.
        assertEquals(C4ArgSpec(null, null), c4ArgSpecFor("Custom_Thing"))
    }

    @Test
    fun `technology and description are lifted out of the macro and onto the box`() {
        val (model, _) = importAndExport(bankingPuml)
        val spa = nodesOf(model).single { nameOf(it) == "Single-Page App" }
        assertEquals("JavaScript, Angular", textAt(spa["data"] as JsonObject, "technology"))
        assertEquals("Provides banking functionality", textAt(spa["data"] as JsonObject, "description"))

        // A Person has no technology argument at all, and its description is the *first* extra
        // argument rather than the second — the box must not come back saying "A customer of the
        // bank" is a technology.
        val customer = nodesOf(model).single { nameOf(it) == "Personal Banking Customer" }
        assertNull(textAt(customer["data"] as JsonObject, "technology"))
        assertEquals("A customer of the bank", textAt(customer["data"] as JsonObject, "description"))

        // A boundary declared with neither gets neither, rather than an empty string.
        val banking = nodesOf(model).single { nameOf(it) == "Internet Banking System" }
        assertNull(textAt(banking["data"] as JsonObject, "technology"))
        assertNull(textAt(banking["data"] as JsonObject, "description"))
    }

    @Test
    fun `an edited description is written back into the argument it came from`() {
        val edited =
            importAndExport(bankingPuml) { model ->
                mapNodes(model) { node ->
                    if (nameOf(node) != "Single-Page App") node else withText(node, "description", "Renders the account pages")
                }
            }.second
        assertTrue(edited.contains("""Container(spa, "Single-Page App", "JavaScript, Angular", "Renders the account pages")"""))
    }

    /** Clearing the technology has to leave the hole behind: the description after it is identified
     *  by its position, so closing the gap would turn it into the technology. */
    @Test
    fun `clearing the technology empties its argument instead of shifting the description into it`() {
        val cleared =
            importAndExport(bankingPuml) { model ->
                mapNodes(model) { node ->
                    if (nameOf(node) != "Single-Page App") node else withText(node, "technology", "")
                }
            }.second
        assertTrue(cleared.contains("""Container(spa, "Single-Page App", "", "Provides banking functionality")"""))
    }

    /** The opposite case: nothing follows the description, so its now-empty argument goes rather
     *  than leaving a trailing `, ""` behind on every save. */
    @Test
    fun `clearing the description drops its argument when nothing follows it`() {
        val cleared =
            importAndExport(bankingPuml) { model ->
                mapNodes(model) { node ->
                    if (nameOf(node) != "Single-Page App") node else withText(node, "description", "")
                }
            }.second
        assertTrue(cleared.contains("""Container(spa, "Single-Page App", "JavaScript, Angular")"""))
    }

    /**
     * A `System_Boundary` keeps its description at index 2, past the two arguments this file never
     * wrote. Padding the gap with empty strings would hard-code the stdlib's parameter order into
     * the file, so a value with nothing in front of it is written in the named form instead.
     */
    @Test
    fun `a description with no argument in front of it is written in the named form`() {
        val added =
            importAndExport(bankingPuml) { model ->
                mapNodes(model) { node ->
                    if (nameOf(node) != "Internet Banking System") node else withText(node, "description", "The bank's own system")
                }
            }.second
        assertTrue(added.contains("""System_Boundary(banking, "Internet Banking System", ${'$'}descr="The bank's own system")"""))
        assertFalse(added.contains("""System_Boundary(banking, "Internet Banking System", "", """"))
    }

    @Test
    fun `a named argument in the source is read, and comes back named`() {
        val source =
            """
            @startuml
            !include <C4/C4_Component>
            Container(api, "API", ${'$'}techn="Kotlin/Ktor", ${'$'}descr="Handles requests")
            @enduml

            """.trimIndent()
        val (model, exported) = importAndExport(source)
        val api = nodesOf(model).single { nameOf(it) == "API" }
        assertEquals("Kotlin/Ktor", textAt(api["data"] as JsonObject, "technology"))
        assertEquals("Handles requests", textAt(api["data"] as JsonObject, "description"))
        assertEquals(source, exported)
    }

    /** `$tags` sits after the description, so an edit must reach past it without disturbing it. */
    @Test
    fun `editing a description leaves the sprite and tag arguments around it alone`() {
        val source =
            """
            @startuml
            !include <C4/C4_Component>
            Container(api, "API", "Kotlin", "Old text", "", ${'$'}tags="backend")
            @enduml

            """.trimIndent() + "\n"
        val edited =
            importAndExport(source) { model ->
                mapNodes(model) { node -> withText(node, "description", "New text") }
            }.second
        assertTrue(edited.contains("""Container(api, "API", "Kotlin", "New text", "", ${'$'}tags="backend")"""))
    }

    /**
     * The three `*_Boundary` macros are the only ones with no bracketed type argument, so a
     * technology typed onto one has nowhere to go. That is exactly the silent loss the validator
     * exists to stop, so the save is refused with something the user can act on.
     */
    @Test
    fun `a technology typed onto a boundary is refused rather than dropped`() {
        val (model, exported) =
            importAndExport(bankingPuml) { model ->
                mapNodes(model) { node ->
                    if (nameOf(node) != "Internet Banking System") node else withText(node, "technology", "AWS")
                }
            }
        val refusal = RoundTripValidator.validate(exported, model)
        assertNotNull(refusal)
        assertTrue(refusal!!.contains("technology"))
        assertTrue(refusal.contains("Internet Banking System"))
    }

    @Test
    fun `the validator accepts a diagram whose description was edited on the canvas`() {
        val (model, exported) =
            importAndExport(bankingPuml) { model ->
                mapNodes(model) { node ->
                    if (nameOf(node) != "Sign In Controller") node else withText(node, "description", "Signs users in and out")
                }
            }
        assertNull(RoundTripValidator.validate(exported, model))
    }

    /** A box that gained a description is taller than the bare default, or the text it was given
     *  would be clipped the moment the file opened. */
    @Test
    fun `a box carrying a description opens taller than one without`() {
        val (model, _) = importAndExport(bankingPuml)
        val described = nodesOf(model).single { nameOf(it) == "Single-Page App" }
        val bare = nodesOf(model).single { nameOf(it) == "Personal Banking Customer" }
        assertTrue(numberAt(described, "height")!! > 100)
        assertTrue(numberAt(described, "height")!! > numberAt(bare, "height")!!)
    }

    @Test
    fun `a relation's technology reaches its edge on the canvas`() {
        val (model, _) = importAndExport(bankingPuml)
        val nameById = nodesOf(model).associate { textAt(it, "id")!! to nameOf(it) }
        val views =
            edgesOf(model).single { nameById[textAt(it, "source")] == "Personal Banking Customer" }
        assertEquals("Views account balances", textAt(views["data"] as JsonObject, "label"))
        assertEquals("HTTPS", textAt(views["data"] as JsonObject, "technology"))
        assertNull(textAt(views["data"] as JsonObject, "description"))
    }

    @Test
    fun `a description added to a relation is written after its technology`() {
        val edited =
            importAndExport(bankingPuml) { model ->
                mapEdges(model) { edge ->
                    if (textAt(edge["data"] as JsonObject, "label") != "Views account balances") {
                        edge
                    } else {
                        withEdgeText(edge, "description", "From the browser")
                    }
                }
            }.second
        assertTrue(edited.contains("""Rel(customer, spa, "Views account balances", "HTTPS", "From the browser")"""))
    }

    /** `BiRel(signin, db, "Syncs with")` has no arguments after its label at all, so the technology
     *  is the very next positional slot and needs no named form. */
    @Test
    fun `a technology added to a relation with no arguments is appended positionally`() {
        val (model, exported) =
            importAndExport(bankingPuml) { model ->
                mapEdges(model) { edge ->
                    if (textAt(edge["data"] as JsonObject, "label") != "Syncs with") {
                        edge
                    } else {
                        withEdgeText(edge, "technology", "JDBC")
                    }
                }
            }
        assertTrue(exported.contains("""BiRel(signin, db, "Syncs with", "JDBC")"""))
        assertNull(RoundTripValidator.validate(exported, model))
    }

    @Test
    fun `clearing a relation's technology drops the argument`() {
        val cleared =
            importAndExport(bankingPuml) { model ->
                mapEdges(model) { edge ->
                    if (textAt(edge["data"] as JsonObject, "label") != "Views account balances") {
                        edge
                    } else {
                        withEdgeText(edge, "technology", "")
                    }
                }
            }.second
        assertTrue(cleared.contains("""Rel(customer, spa, "Views account balances")"""))
    }

    private fun withText(
        node: JsonObject,
        key: String,
        value: String,
    ) = withData(node) { data -> JsonObject(data.toMutableMap().apply { put(key, JsonPrimitive(value)) }) }

    private fun withEdgeText(
        edge: JsonObject,
        key: String,
        value: String,
    ) = JsonObject(
        edge.toMutableMap().apply {
            put("data", JsonObject((edge["data"] as JsonObject).toMutableMap().apply { put(key, JsonPrimitive(value)) }))
        },
    )

    private fun mapEdges(
        model: JsonObject,
        transform: (JsonObject) -> JsonObject,
    ): JsonObject =
        JsonObject(
            model.toMutableMap().apply {
                put("edges", buildJsonArray { edgesOf(model).forEach { add(transform(it) as JsonElement) } })
            },
        )

    private fun nodesOf(model: JsonObject) = (model["nodes"] as JsonArray).map { it as JsonObject }

    private fun edgesOf(model: JsonObject) = (model["edges"] as JsonArray).map { it as JsonObject }

    /**
     * A C4 macro call is one line, so a line break typed into a description used to split
     * `Container(frontend, …` in half — and a half-written macro call does not cost the description,
     * it stops the whole file rendering. PlantUML's own `\n` escape means a line break inside a
     * quoted label, so that is what goes in the file, and it reads straight back.
     */
    @Test
    fun `a line break typed into a description does not split the macro call`() {
        val (model, text) =
            importAndExport(bankingPuml) { model ->
                mapNodes(model) { node ->
                    if (nameOf(node) != "Database") {
                        node
                    } else {
                        withData(node) { data ->
                            JsonObject(data.toMutableMap().apply { put("description", JsonPrimitive("Stores users\nand balances")) })
                        }
                    }
                }
            }
        val line = text.lines().single { it.contains("ContainerDb(db,") }
        assertTrue(line, line.trim().endsWith("\"Stores users\\nand balances\")"))
        // The gate has to accept it, or the save would be refused for a change the file can hold.
        assertNull(RoundTripValidator.validate(text, model))
        // And it has to come back as the line break it was, not as two literal characters.
        val reread = PlantUmlC4Importer.parse(text) as PumlC4ParseResult.Parsed
        val db = reread.diagram.elements.single { it.refId == "db" }
        assertEquals("Stores users\nand balances", C4Slots.read(db.extras, c4ArgSpecFor(db.macro).description))
    }

    /** The same hazard on a name rather than a description; both go out through `C4Args.quote`. */
    @Test
    fun `a line break in an element name is escaped too`() {
        assertEquals("\"Web\\nApplication\"", C4Args.quote("Web\nApplication"))
        assertEquals("Web\nApplication", C4Args.unquote(C4Args.quote("Web\nApplication")))
        // Windows line endings collapse to the same escape rather than producing a stray \r.
        assertEquals("\"a\\nb\"", C4Args.quote("a\r\nb"))
    }

    private fun textAt(
        obj: JsonObject,
        key: String,
    ) = (obj[key] as? JsonPrimitive)?.takeIf { it.isString }?.content

    private fun numberAt(
        obj: JsonObject,
        key: String,
    ) = (obj[key] as? JsonPrimitive)?.content?.toInt()

    private fun nameOf(node: JsonObject) = textAt(node["data"] as JsonObject, "name")

    private fun withData(
        node: JsonObject,
        transform: (JsonObject) -> JsonObject,
    ) = JsonObject(node.toMutableMap().apply { put("data", transform(node["data"] as JsonObject)) })

    private fun mapNodes(
        model: JsonObject,
        transform: (JsonObject) -> JsonObject,
    ): JsonObject =
        JsonObject(
            model.toMutableMap().apply {
                put("nodes", buildJsonArray { nodesOf(model).forEach { add(transform(it) as JsonElement) } })
            },
        )
}
