package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Activity-diagram counterpart of [RoundTripTest] — see its doc comment for the contract.
 *
 * Activity is the family where the round trip is a genuine reconstruction rather than a re-render:
 * a structured program becomes a graph on the way in and has to become a program again on the way
 * out. Most of what is asserted here is therefore about the shape coming back intact, not about
 * individual lines.
 */
class ActivityRoundTripTest {
    private val orderPuml =
        """
        @startuml
        start
        :Receive order;
        if (in stock?) then (yes)
          :Reserve items;
        else (no)
          :Notify customer;
          stop
        endif
        fork
          :Charge card;
        fork again
          :Print invoice;
        end fork
        :Ship order;
        stop
        @enduml

        """.trimIndent() + "\n"

    private fun parse(source: String) = PlantUmlActivityImporter.parse(source) as PumlActivityParseResult.Parsed

    private fun importAndExport(
        source: String,
        previous: JsonObject? = null,
    ): Pair<JsonObject, String> {
        val parsed = PlantUmlDiagramImporter.parse(source) as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(previous, "order")
        val residual = parsed.residual.copy(typeKeywords = mapped.typeKeywords)
        return mapped.model to PlantUmlDiagramExporter.render(mapped.model, residual).text
    }

    private fun exportOf(source: String) = importAndExport(source).second

    /** The body between the envelope markers, which is all these tests care about. */
    private fun bodyOf(text: String) =
        text.lines().dropWhile { !it.startsWith("@startuml") }.drop(1).takeWhile { !it.startsWith("@enduml") }

    @Test
    fun `the detector recognizes an activity file, and the dispatcher routes it to the activity importer`() {
        assertEquals(DiagramFamily.ACTIVITY, DiagramTypeDetector.detect(orderPuml))
        val parsed = PlantUmlDiagramImporter.parse(orderPuml) as DispatchedImport.Parsed
        assertEquals(DiagramFamily.ACTIVITY, parsed.family)
        assertEquals(0, parsed.unsupportedCount)
    }

    @Test
    fun `every construct becomes a step of the right kind`() {
        val diagram = parse(orderPuml).diagram
        val byKind = diagram.nodes.groupBy { it.kind }
        assertEquals(1, byKind[PumlActivityNodeKind.INITIAL]?.size)
        assertEquals(2, byKind[PumlActivityNodeKind.FINAL]?.size)
        assertEquals(6, byKind[PumlActivityNodeKind.ACTION]?.size)
        assertEquals(1, byKind[PumlActivityNodeKind.DECISION]?.size)
        assertEquals("in stock?", byKind[PumlActivityNodeKind.DECISION]!!.single().label)
        // `endif` and `end fork` are steps the source never spells out but the flow really has.
        assertEquals(1, byKind[PumlActivityNodeKind.MERGE]?.size)
        assertEquals(1, byKind[PumlActivityNodeKind.FORK]?.size)
        assertEquals(1, byKind[PumlActivityNodeKind.JOIN]?.size)
    }

    @Test
    fun `branch labels land on the flows leaving the decision`() {
        val diagram = parse(orderPuml).diagram
        val decision = diagram.nodes.single { it.kind == PumlActivityNodeKind.DECISION }
        assertEquals(listOf("yes", "no"), diagram.flows.filter { it.sourceRefId == decision.refId }.map { it.label })
    }

    @Test
    fun `unedited import-then-export reproduces the source body`() {
        assertEquals(bodyOf(orderPuml), bodyOf(exportOf(orderPuml)))
    }

    @Test
    fun `re-exporting an unedited model twice produces byte-identical PlantUML`() {
        assertEquals(exportOf(orderPuml), exportOf(orderPuml))
    }

    @Test
    fun `elseif chains come back as elseif rather than a nested if`() {
        val source =
            """
            @startuml
            start
            if (a?) then (yes)
              :A;
            elseif (b?) then (yes)
              :B;
            else (no)
              :C;
            endif
            stop
            @enduml

            """.trimIndent() + "\n"
        assertEquals(2, parse(source).diagram.nodes.count { it.kind == PumlActivityNodeKind.DECISION })
        // One merge for the whole chain, exactly as PlantUML draws it.
        assertEquals(1, parse(source).diagram.nodes.count { it.kind == PumlActivityNodeKind.MERGE })
        assertEquals(bodyOf(source), bodyOf(exportOf(source)))
    }

    @Test
    fun `an if with no else keeps its shape`() {
        val source =
            """
            @startuml
            start
            if (retry?) then (yes)
              :Try again;
            endif
            :Done;
            stop
            @enduml

            """.trimIndent() + "\n"
        assertEquals(bodyOf(source), bodyOf(exportOf(source)))
    }

    @Test
    fun `an empty branch keeps its label and does not swap sides`() {
        val source =
            """
            @startuml
            start
            if (skip?) then (yes)
            else (no)
              :Work;
            endif
            stop
            @enduml

            """.trimIndent() + "\n"
        assertEquals(bodyOf(source), bodyOf(exportOf(source)))
    }

    @Test
    fun `nested conditionals reconverge on their own merge`() {
        val source =
            """
            @startuml
            start
            if (outer?) then (yes)
              if (inner?) then (yes)
                :X;
              else (no)
                :Y;
              endif
              :Z;
            else (no)
              :W;
            endif
            stop
            @enduml

            """.trimIndent() + "\n"
        assertEquals(bodyOf(source), bodyOf(exportOf(source)))
    }

    @Test
    fun `the end and end merge spellings are kept, not normalised to stop and end fork`() {
        val source =
            """
            @startuml
            start
            fork
              :A;
            fork again
              :B;
            end merge
            end
            @enduml

            """.trimIndent() + "\n"
        assertTrue(exportOf(source).contains("end merge"))
        assertEquals(bodyOf(source), bodyOf(exportOf(source)))
    }

    @Test
    fun `an explicit arrow label survives the round trip`() {
        val source =
            """
            @startuml
            start
            :A;
            ->takes 3 days;
            :B;
            stop
            @enduml

            """.trimIndent() + "\n"
        val diagram = parse(source).diagram
        assertEquals("takes 3 days", diagram.flows.single { it.label.isNotEmpty() }.label)
        assertEquals(bodyOf(source), bodyOf(exportOf(source)))
    }

    @Test
    fun `a multi-line action is one step`() {
        val source = "@startuml\nstart\n:First line\nsecond line;\nstop\n@enduml\n"
        val actions = parse(source).diagram.nodes.filter { it.kind == PumlActivityNodeKind.ACTION }
        assertEquals(1, actions.size)
        assertEquals("First line\nsecond line", actions.single().label)
    }

    /**
     * A file is refused when its *structure* does not add up, and only then. An unrecognised line is
     * kept as decoration instead (see [ActivityConstructsTest]) — but a program with a block that
     * never closes, or a closer with nothing open, cannot be laid back out as a program at all.
     */
    @Test
    fun `a broken block structure is rejected rather than half-read`() {
        fun reasonFor(body: String): String {
            val result = PlantUmlActivityImporter.parse("@startuml\n$body\n@enduml\n")
            assertTrue("expected a rejection for:\n$body", result is PumlActivityParseResult.Rejected)
            return (result as PumlActivityParseResult.Rejected).reason
        }
        assertTrue(reasonFor("start\nif (a?) then (yes)\n:A;\nstop").contains("never closed with 'endif'"))
        assertTrue(reasonFor("start\nfork\n:A;\nstop").contains("never closed with 'end fork'"))
        assertTrue(reasonFor("start\nsplit\n:A;\nstop").contains("never closed with 'end split'"))
        assertTrue(reasonFor("start\nwhile (more?)\n:A;\nstop").contains("never closed with 'endwhile'"))
        assertTrue(reasonFor("start\nrepeat\n:A;\nstop").contains("never closed with 'repeat while'"))
        assertTrue(reasonFor("start\nswitch (x?)\ncase (a)\n:A;\nstop").contains("never closed with 'endswitch'"))
        assertTrue(reasonFor("start\n:unterminated action\nstop").contains("never closed with ';'"))
        assertTrue(reasonFor("start\nendif\nstop").contains("stray 'endif'"))
        // The legacy `(*) --> "A"` grammar is refused by a different route: none of it is structure,
        // so every line is kept as decoration and nothing at all reaches the canvas.
        assertTrue(reasonFor("(*) --> \"A\"\n\"A\" --> (*)").contains("contains no activity steps"))
    }

    @Test
    fun `the canvas gets one Apollon node per step and one control flow per arrow`() {
        val (model, _) = importAndExport(orderPuml)
        val nodes = (model["nodes"] as JsonArray).map { it as JsonObject }
        val edges = (model["edges"] as JsonArray).map { it as JsonObject }
        val diagram = parse(orderPuml).diagram

        assertEquals("ActivityDiagram", (model["type"] as JsonPrimitive).content)
        assertEquals(diagram.nodes.size, nodes.size)
        assertEquals(diagram.flows.size, edges.size)
        assertTrue(edges.all { (it["type"] as JsonPrimitive).content == "ActivityControlFlow" })
        // A decision and a merge are the same diamond on the canvas; a fork and a join, the same bar.
        assertEquals(2, nodes.count { (it["type"] as JsonPrimitive).content == "activityMergeNode" })
        assertEquals(2, nodes.count { (it["type"] as JsonPrimitive).content == "activityForkNodeHorizontal" })
        assertEquals(1, nodes.count { (it["type"] as JsonPrimitive).content == "activityInitialNode" })
        assertEquals(2, nodes.count { (it["type"] as JsonPrimitive).content == "activityFinalNode" })
    }

    @Test
    fun `no two steps land on top of each other`() {
        val (model, _) = importAndExport(orderPuml)
        val corners =
            (model["nodes"] as JsonArray).map { node ->
                val position = (node as JsonObject)["position"] as JsonObject
                (position["x"] as JsonPrimitive).content to (position["y"] as JsonPrimitive).content
            }
        assertEquals(corners.size, corners.toSet().size)
    }

    @Test
    fun `a step the user moved keeps its position when the file is re-imported`() {
        val (first, _) = importAndExport(orderPuml)
        val moved = movePosition(first, "Ship order", 900, 40)
        val (second, _) = importAndExport(orderPuml, previous = moved)
        val ship = (second["nodes"] as JsonArray).map { it as JsonObject }.single { nameOf(it) == "Ship order" }
        val position = ship["position"] as JsonObject
        assertEquals("900", (position["x"] as JsonPrimitive).content)
        assertEquals("40", (position["y"] as JsonPrimitive).content)
    }

    @Test
    fun `the round trip validator accepts an unedited activity diagram`() {
        val (model, exported) = importAndExport(orderPuml)
        assertNull(RoundTripValidator.validate(exported, model))
    }

    @Test
    fun `the validator refuses a candidate that lost a step`() {
        val (model, exported) = importAndExport(orderPuml)
        val mutilated = exported.lines().filterNot { it.trim() == ":Ship order;" }.joinToString("\n")
        assertNotNull(RoundTripValidator.validate(mutilated, model))
    }

    @Test
    fun `the starter is a diagram the canvas can hold and the exporter can write back`() {
        val starter = PumlScaffold.textFor("ActivityDiagram")!!
        assertEquals(DiagramFamily.ACTIVITY, DiagramTypeDetector.detect(starter))
        val (model, exported) = importAndExport(starter)
        assertNull(RoundTripValidator.validate(exported, model))
        assertEquals(bodyOf(starter), bodyOf(exported))
    }

    @Test
    fun `a note added on the canvas refuses the save rather than vanishing from the file`() {
        val (model, exported) = importAndExport(orderPuml)
        val withNote =
            JsonObject(
                model.toMutableMap().apply {
                    put(
                        "nodes",
                        JsonArray(
                            (model["nodes"] as JsonArray) +
                                JsonObject(
                                    mapOf(
                                        "id" to JsonPrimitive("note-1"),
                                        "type" to JsonPrimitive(NOTE_NODE_TYPE),
                                        "width" to JsonPrimitive(160),
                                        "height" to JsonPrimitive(50),
                                        "position" to JsonObject(mapOf("x" to JsonPrimitive(0), "y" to JsonPrimitive(0))),
                                        "data" to JsonObject(mapOf("name" to JsonPrimitive("Worth remembering"))),
                                    ),
                                ),
                        ),
                    )
                },
            )
        val refusal = RoundTripValidator.validate(exported, withNote)
        assertNotNull(refusal)
        assertTrue(refusal!!.contains("notes cannot be written into"))
    }

    private fun nameOf(node: JsonObject) = ((node["data"] as JsonObject)["name"] as? JsonPrimitive)?.content

    private fun movePosition(
        model: JsonObject,
        name: String,
        x: Int,
        y: Int,
    ): JsonObject {
        val nodes =
            (model["nodes"] as JsonArray).map { element ->
                val node = element as JsonObject
                if (nameOf(node) != name) {
                    node
                } else {
                    JsonObject(
                        node.toMutableMap().apply {
                            put("position", JsonObject(mapOf("x" to JsonPrimitive(x), "y" to JsonPrimitive(y))))
                        },
                    )
                }
            }
        return JsonObject(model.toMutableMap().apply { put("nodes", JsonArray(nodes)) })
    }
}
