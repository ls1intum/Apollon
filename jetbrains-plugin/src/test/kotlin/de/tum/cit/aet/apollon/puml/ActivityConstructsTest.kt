package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
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
 * The two thirds of PlantUML's activity grammar that used to make the Edit tab decline a file:
 * loops, `switch`, `split`, `detach`, and the decoration — swimlanes, notes, `partition` brackets —
 * that wraps a flow without being part of it.
 *
 * [ActivityRoundTripTest] covers the grammar that always worked. What is checked here is the two
 * new rules that replaced the old blanket refusal: a construct that *is* the flow becomes real steps
 * and flows on the canvas, and one that merely decorates it is written back exactly where it stood.
 */
class ActivityConstructsTest {
    private fun parse(source: String) = PlantUmlActivityImporter.parse(source) as PumlActivityParseResult.Parsed

    private fun importAndExport(
        source: String,
        edit: (JsonObject) -> JsonObject = { it },
    ): Triple<JsonObject, String, PumlResidual> {
        val parsed = PlantUmlDiagramImporter.parse(source) as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(null, "flow")
        val edited = edit(mapped.model)
        val exported = PlantUmlDiagramExporter.render(edited, parsed.residual.withImported(mapped))
        return Triple(edited, exported.text, exported.residual)
    }

    /** The body between the envelope markers, which is all these tests care about. */
    private fun bodyOf(text: String) =
        text.lines().dropWhile { !it.startsWith("@startuml") }.drop(1).takeWhile { !it.startsWith("@enduml") }

    private fun puml(body: String) = "@startuml\n$body\n@enduml\n"

    // ---------------------------------------------------------------- loops

    private val whilePuml =
        puml(
            """
            start
            while (more data?) is (yes)
              :read chunk;
              :process;
            endwhile (no)
            :report;
            stop
            """.trimIndent(),
        )

    private val repeatPuml =
        puml(
            """
            start
            repeat
              :attempt;
            repeat while (failed?) is (yes) not (no)
            stop
            """.trimIndent(),
        )

    /**
     * A loop is a cycle, and a cycle is the one thing the exporter's forward walk cannot follow —
     * so the shape it leaves behind has to be exactly right. The merge diamond is the loop head: it
     * is where the way in and the way round meet, and it is what makes the loop findable again.
     */
    @Test
    fun `a while loop becomes a head, a test and a back edge`() {
        val diagram = parse(whilePuml).diagram
        val head = diagram.nodes.single { it.kind == PumlActivityNodeKind.MERGE }
        val test = diagram.nodes.single { it.kind == PumlActivityNodeKind.DECISION }
        assertEquals("more data?", test.label)
        assertEquals(
            listOf(PumlActivityLoop(head.refId, test.refId, latchRefId = "n5", isRepeat = false)),
            diagram.loops(),
        )
        // `is (yes)` labels the way round, `endwhile (no)` the way out.
        assertEquals(listOf("yes", "no"), diagram.flows.filter { it.sourceRefId == test.refId }.map { it.label })
    }

    @Test
    fun `a repeat loop puts its test at the bottom, not the top`() {
        val diagram = parse(repeatPuml).diagram
        val loop = diagram.loops().single()
        assertTrue(loop.isRepeat)
        // The head runs straight into the body; it is the *latch* that decides. That is the whole
        // difference between the two spellings, and it is what the exporter reads them back off.
        assertEquals(loop.testRefId, loop.latchRefId)
        assertEquals("attempt", diagram.nodes.single { it.refId == "n3" }.label)
    }

    @Test
    fun `both loop spellings come back as they were written`() {
        assertEquals(bodyOf(whilePuml), bodyOf(importAndExport(whilePuml).second))
        assertEquals(bodyOf(repeatPuml), bodyOf(importAndExport(repeatPuml).second))
    }

    /**
     * The exporter finds an `endif` by counting brackets, and a loop's diamond is closed by its
     * back edge rather than by a merge further down. Before loops were read at all that could not
     * arise; now it can, and getting it wrong writes the `endif` in the middle of the loop.
     */
    @Test
    fun `a loop inside an if does not steal the if's endif`() {
        val source =
            puml(
                """
                start
                if (retry?) then (yes)
                  while (failing?) is (yes)
                    :try;
                  endwhile (no)
                else (no)
                  :give up;
                endif
                stop
                """.trimIndent(),
            )
        assertEquals(bodyOf(source), bodyOf(importAndExport(source).second))
    }

    @Test
    fun `the round-trip gate accepts a loop`() {
        val (model, text, residual) = importAndExport(whilePuml)
        assertNull(RoundTripValidator.validate(text, model, residual))
    }

    /** Rows come from a topological order, which a cycle does not have. The back edge is left out
     *  of the ranking so the loop body lands under the head rather than parked at the bottom. */
    @Test
    fun `a loop's steps are laid out down the page, not piled up below it`() {
        val (model, _, _) = importAndExport(whilePuml)
        val yByName =
            model["nodes"]!!.jsonArray.associate { node ->
                node.jsonObject["data"]!!.jsonObject["name"]!!.jsonPrimitive.content to
                    node.jsonObject["position"]!!.jsonObject["y"]!!.jsonPrimitive.content.toInt()
            }
        assertTrue(yByName.toString(), yByName.getValue("more data?") < yByName.getValue("read chunk"))
        assertTrue(yByName.toString(), yByName.getValue("read chunk") < yByName.getValue("process"))
    }

    // -------------------------------------------------------------- switches

    private val switchPuml =
        puml(
            """
            start
            switch (grade?)
            case (A)
              :celebrate;
            case (B)
              :shrug;
            case (F)
              :retry;
            endswitch
            stop
            """.trimIndent(),
        )

    @Test
    fun `a switch is one diamond with a branch per case`() {
        val diagram = parse(switchPuml).diagram
        val decision = diagram.nodes.single { it.kind == PumlActivityNodeKind.DECISION }
        assertEquals("switch", decision.keyword)
        assertEquals(listOf("A", "B", "F"), diagram.flows.filter { it.sourceRefId == decision.refId }.map { it.label })
        assertEquals(bodyOf(switchPuml), bodyOf(importAndExport(switchPuml).second))
    }

    /**
     * Three ways out of one diamond is a switch whether or not the source said so. It matters more
     * than spelling: an `if` writes a `then` and an `else` and nothing else, so before this the
     * third branch onwards was not written back at all.
     */
    @Test
    fun `a three-way branch drawn on the canvas is written as a switch, not silently trimmed`() {
        val parsed = PlantUmlDiagramImporter.parse(switchPuml) as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(null, "flow")
        // As if the diamond had been drawn on the canvas rather than read from a `switch`.
        val forgotten = parsed.residual.withImported(mapped).copy(typeKeywords = emptyMap())
        val text = PlantUmlDiagramExporter.render(mapped.model, forgotten).text
        assertTrue(text, text.contains("switch (grade?)"))
        listOf("celebrate", "shrug", "retry").forEach { assertTrue("$it is missing from:\n$text", text.contains(":$it;")) }
        assertNull(RoundTripValidator.validate(text, mapped.model, forgotten))
    }

    // ------------------------------------------------------- split and detach

    private val splitPuml =
        puml(
            """
            start
            split
              :notify;
              detach
            split again
              :log;
            end split
            stop
            """.trimIndent(),
        )

    @Test
    fun `split is a fork under another name, and detach ends a strand without a final node`() {
        val diagram = parse(splitPuml).diagram
        assertEquals("split", diagram.nodes.single { it.kind == PumlActivityNodeKind.FORK }.keyword)
        assertEquals("end split", diagram.nodes.single { it.kind == PumlActivityNodeKind.JOIN }.keyword)
        // `detach` draws no box, so it rides on the step it followed — and that step leads nowhere.
        val notify = diagram.nodes.single { it.label == "notify" }
        assertEquals("detach", notify.keyword)
        assertTrue(diagram.flows.none { it.sourceRefId == notify.refId })
        assertEquals(bodyOf(splitPuml), bodyOf(importAndExport(splitPuml).second))
    }

    // -------------------------------------------------------- decoration

    private val decoratedPuml =
        puml(
            """
            |Customer|
            start
            partition Ordering {
              :place order;
              note right : needs a card
              :confirm;
            }
            |Warehouse|
            :ship;
            stop
            """.trimIndent(),
        )

    @Test
    fun `swimlanes, notes and partitions are read as decoration rather than refused`() {
        assertEquals(DiagramFamily.ACTIVITY, DiagramTypeDetector.detect(decoratedPuml))
        val parsed = parse(decoratedPuml)
        assertEquals(
            mapOf(
                // A swimlane applies from where it stands onwards, so it goes *before* the next
                // step; a note attaches backwards, so it goes *after* the step it was written under.
                "before:initial|#0" to "|Customer|",
                "after:action|place order#0" to "note right : needs a card",
                "before:action|ship#0" to "|Warehouse|",
            ),
            parsed.residual.activityAnchors,
        )
        assertEquals(
            listOf(PumlActivitySpan("partition Ordering {", "}", listOf("action|place order#0", "action|confirm#0"))),
            parsed.residual.activitySpans,
        )
        // The steps themselves are ordinary steps; nothing about them changed.
        assertEquals(
            listOf("place order", "confirm", "ship"),
            parsed.diagram.nodes.filter { it.kind == PumlActivityNodeKind.ACTION }.map { it.label },
        )
    }

    @Test
    fun `an unedited save of a decorated file reproduces it line for line`() {
        assertEquals(bodyOf(decoratedPuml), bodyOf(importAndExport(decoratedPuml).second))
    }

    @Test
    fun `the round-trip gate accepts a decorated file`() {
        val (model, text, residual) = importAndExport(decoratedPuml)
        assertNull(RoundTripValidator.validate(text, model, residual))
    }

    /** The point of the whole design: a line with no grammar here costs itself, not the file. */
    @Test
    fun `a construct this version has never heard of is kept where it stood`() {
        val source = puml("start\n#palegreen:approve;\n:carry on;\nstop")
        val parsed = parse(source)
        assertEquals(mapOf("before:action|carry on#0" to "#palegreen:approve;"), parsed.residual.activityAnchors)
        assertEquals(1, parsed.unsupportedCount)
        assertEquals(bodyOf(source), bodyOf(importAndExport(source).second))
    }

    /** A note's own step can be deleted on the canvas. The note has nowhere of its own to go then,
     *  and the one thing it must not do is disappear. */
    @Test
    fun `decoration whose step was deleted comes back with the next one`() {
        val diagram =
            PumlActivityDiagram(
                null,
                listOf(
                    PumlActivityNode("n1", "", PumlActivityNodeKind.INITIAL),
                    PumlActivityNode("n2", "ship", PumlActivityNodeKind.ACTION),
                ),
                listOf(PumlActivityFlow("n1", "n2")),
            )
        val residual =
            PumlResidual(
                "@startuml",
                "@enduml",
                "\n",
                "  ",
                activityAnchors =
                    linkedMapOf(
                        "after:action|place order#0" to "note right : needs a card",
                        "before:action|ship#0" to "|Warehouse|",
                    ),
            )
        assertEquals(
            listOf("@startuml", "start", "note right : needs a card", "|Warehouse|", ":ship;", "@enduml"),
            PlantUmlActivityExporter.render(diagram, residual).trimEnd().lines(),
        )
    }

    /** A partition shrinks around whichever of its steps survive — but half a bracket is a syntax
     *  error, so it is written as a pair or not at all. The note the deleted step carried comes out
     *  with the next one rather than going with it. */
    @Test
    fun `a partition closes around the steps that are left`() {
        val (_, text, _) = importAndExport(decoratedPuml) { model -> withoutStep(model, "confirm") }
        assertEquals(
            listOf(
                "|Customer|",
                "start",
                "partition Ordering {",
                "  :place order;",
                "  note right : needs a card",
                "}",
                "|Warehouse|",
                ":ship;",
                "stop",
            ),
            bodyOf(text),
        )
    }

    /** PlantUML writes a bracket four ways. Which closer a block wants is only visible on the line
     *  that opened it, so it is read there and remembered. */
    @Test
    fun `every spelling of a partition comes back with the closer it was written with`() {
        val source =
            puml(
                """
                start
                partition "Order Intake"
                  :place order;
                end partition
                group Fulfilment {
                  :ship;
                }
                stop
                """.trimIndent(),
            )
        assertEquals(
            listOf("end partition", "}"),
            parse(source).residual.activitySpans.map { it.close },
        )
        assertEquals(bodyOf(source), bodyOf(importAndExport(source).second))
    }

    /** A note that says its text on the following lines rather than after a `:` is several lines of
     *  source for one construct, and has to be kept as one run — half of it would not re-parse. */
    @Test
    fun `a multi-line note is kept whole`() {
        val source =
            puml(
                """
                start
                :place order;
                note right
                  a card is required
                  and it must not be expired
                end note
                :ship;
                stop
                """.trimIndent(),
            )
        assertEquals(
            mapOf("after:action|place order#0" to "note right\n  a card is required\n  and it must not be expired\nend note"),
            parse(source).residual.activityAnchors,
        )
        assertEquals(bodyOf(source), bodyOf(importAndExport(source).second))
    }

    // ------------------------------------------------------------ the gate

    @Test
    fun `the gate refuses a candidate that dropped a note`() {
        val (model, text, residual) = importAndExport(decoratedPuml)
        val mutilated = text.lines().filterNot { it.trim().startsWith("note ") }.joinToString("\n")
        val refusal = RoundTripValidator.validate(mutilated, model, residual)
        assertNotNull(refusal)
        assertTrue(refusal!!, refusal.contains("needs a card"))
    }

    @Test
    fun `the gate refuses a candidate that dropped a partition`() {
        val (model, text, residual) = importAndExport(decoratedPuml)
        val mutilated = text.lines().filterNot { it.trim() == "partition Ordering {" || it.trim() == "}" }.joinToString("\n")
        val refusal = RoundTripValidator.validate(mutilated, model, residual)
        assertNotNull(refusal)
        assertTrue(refusal!!, refusal.contains("partition Ordering {"))
    }

    /**
     * Branch labels were not compared at all before loops and switches made them load-bearing.
     * Swapping `then (Yes)` and `else (No)` loses no step and no flow — and reverses the diagram.
     */
    @Test
    fun `the gate refuses a candidate whose branch labels were swapped`() {
        val source = puml("start\nif (ok?) then (yes)\n  :A;\nelse (no)\n  :B;\nendif\nstop")
        val (model, text, residual) = importAndExport(source)
        assertNull(RoundTripValidator.validate(text, model, residual))
        val swapped = text.replace("then (yes)", "then (no)").replace("else (no)", "else (yes)")
        assertNotNull(RoundTripValidator.validate(swapped, model, residual))
    }

    /** Deleting every step in a partition leaves it with nowhere to be written; PlantUML has no
     *  empty one, so the save is refused rather than the partition quietly dropped. */
    @Test
    fun `emptying a partition refuses the save instead of dropping it`() {
        val source = puml("start\npartition Ordering {\n  :place order;\n}\nstop")
        val parsed = PlantUmlDiagramImporter.parse(source) as DispatchedImport.Parsed
        val mapped = parsed.toApollonModel(null, "flow")
        val emptied = withoutStep(mapped.model, "place order")
        val residual = parsed.residual.withImported(mapped)
        val exported = PlantUmlDiagramExporter.render(emptied, residual)
        assertTrue(exported.text, !exported.text.contains("partition"))
        val refusal = RoundTripValidator.validate(exported.text, emptied, exported.residual)
        assertNotNull(refusal)
        assertTrue(refusal!!, refusal.contains("remove it in the Text tab"))
    }

    /** Deletes a step and reconnects what it stood between, the way deleting a box on the canvas
     *  and redrawing the arrow would. */
    private fun withoutStep(
        model: JsonObject,
        name: String,
    ): JsonObject {
        val gone =
            model["nodes"]!!.jsonArray.single { it.jsonObject["data"]!!.jsonObject["name"]!!.jsonPrimitive.content == name }
                .jsonObject["id"]!!.jsonPrimitive.content
        val incoming = model["edges"]!!.jsonArray.map { it.jsonObject }.filter { it["target"]!!.jsonPrimitive.content == gone }
        val outgoing = model["edges"]!!.jsonArray.map { it.jsonObject }.filter { it["source"]!!.jsonPrimitive.content == gone }
        return buildJsonObject {
            model.forEach { (key, value) -> put(key, value) }
            put("nodes", JsonArray(model["nodes"]!!.jsonArray.filterNot { it.jsonObject["id"]!!.jsonPrimitive.content == gone }))
            put(
                "edges",
                buildJsonArray {
                    model["edges"]!!.jsonArray.map { it.jsonObject }.forEach { edge ->
                        val source = edge["source"]!!.jsonPrimitive.content
                        val target = edge["target"]!!.jsonPrimitive.content
                        when {
                            source == gone -> Unit
                            target != gone -> add(edge)
                            // Rejoin: the arrow that came in now points at what the arrow out did.
                            else ->
                                outgoing.firstOrNull()?.let { next ->
                                    add(
                                        buildJsonObject {
                                            edge.forEach { (key, value) -> put(key, value) }
                                            put("target", next["target"]!!)
                                        },
                                    )
                                }
                        }
                    }
                    if (incoming.isEmpty()) outgoing.forEach { add(it) }
                },
            )
        }
    }

    /** Guards the assumption every anchor in this file rests on: a step keeps its key across an
     *  edit that leaves it alone, and a diamond keeps it even when the canvas flips which half of
     *  the pair it is. */
    @Test
    fun `anchor keys survive a decision turning into a merge`() {
        val decision = PumlActivityNode("n1", "ok?", PumlActivityNodeKind.DECISION)
        val merge = PumlActivityNode("n1", "ok?", PumlActivityNodeKind.MERGE)
        assertEquals(listOf(decision).anchorKeys(), listOf(merge).anchorKeys())
        // Two unlabelled diamonds — routine in an activity diagram — must not share one.
        val two = listOf(PumlActivityNode("n1", "", PumlActivityNodeKind.MERGE), PumlActivityNode("n2", "", PumlActivityNodeKind.MERGE))
        assertEquals(mapOf("n1" to "branch|#0", "n2" to "branch|#1"), two.anchorKeys())
    }

    @Test
    fun `the residual carries decoration and partitions through its own JSON`() {
        val residual = parse(decoratedPuml).residual
        assertEquals(residual, PumlResidual.fromJson(residual.toJson()))
    }

    private fun namesIn(model: JsonObject) =
        model["nodes"]!!.jsonArray.map { it.jsonObject["data"]!!.jsonObject["name"]!!.jsonPrimitive.content }

    @Test
    fun `every step of a decorated file reaches the canvas`() {
        val (model, _, _) = importAndExport(decoratedPuml)
        assertEquals(listOf("", "place order", "confirm", "ship", ""), namesIn(model))
        assertEquals(JsonPrimitive("ActivityDiagram"), model["type"])
    }
}
