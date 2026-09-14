package de.tum.cit.aet.apollon.puml

/**
 * Classifies a `.puml` file's [DiagramFamily] from its `@startuml` body's grammar — element
 * keywords, C4 macro calls, message-arrow shape — never from the file's name or extension (plan
 * §10). Ordered so the most distinctive/least ambiguous grammar is checked first: a C4 include or
 * macro call is unmistakable, whereas a bare `class`/`object` keyword only means something once
 * more specific families have been ruled out.
 *
 * Deliberately conservative like [PlantUmlImporter]: when nothing matches, this returns [DiagramFamily.OTHER]
 * rather than guessing at [DiagramFamily.CLASS] — the entry point that consumes this
 * ([de.tum.cit.aet.apollon.document.PumlDocumentBridge]) decides whether "recognized but not
 * editable" and "not recognized at all" need different user-facing wording, this only classifies.
 */
object DiagramTypeDetector {
    private val C4_INCLUDE = Regex("""^!include(_once|_many)?\b.*C4""", RegexOption.IGNORE_CASE)
    /**
     * A C4 macro *statement*: anchored at the start of the line, and with at least two arguments.
     * Both guards matter — `+ System(): void` is an ordinary method on an ordinary class, and
     * without them a class diagram declaring one would be read as a C4 file and refuse to open on
     * the canvas. Every real C4 element and relation macro takes an alias plus at least one more
     * argument, so requiring the comma costs nothing.
     */
    private val C4_CALL =
        Regex(
            """^(Person|Person_Ext|System|System_Ext|SystemDb|SystemDb_Ext|SystemQueue|SystemQueue_Ext|""" +
                """Container|ContainerDb|ContainerDb_Ext|ContainerQueue|ContainerQueue_Ext|Component|Component_Ext|""" +
                """Rel|Rel_Back|Rel_[UDLR]|Rel_Back_[UDLR]|BiRel|Boundary|Enterprise_Boundary|System_Boundary|""" +
                """Container_Boundary|Node|Node_L|Node_R|Deployment_Node)\s*\([^)]*,""",
        )

    private val STATE_MARKER = Regex("""(^|\s)\[\*]|^\s*state\s""", RegexOption.IGNORE_CASE)
    private val ACTIVITY_MARKER =
        Regex(
            """^:.*;\s*$|^(start|stop|end)\s*$|^(if|repeat|fork|split|partition|while|switch)\b|^\|[^|]*\|""",
            RegexOption.IGNORE_CASE,
        )
    private val USE_CASE_MARKER = Regex("""^\s*usecase\s|\(.+\)\s+as\s+\S+""", RegexOption.IGNORE_CASE)
    private val OBJECT_KEYWORD = Regex("""^\s*object\s""", RegexOption.IGNORE_CASE)
    private val CLASS_KEYWORD = Regex("""^\s*(abstract\s+class|abstract|class|interface|enum|entity)\s""", RegexOption.IGNORE_CASE)
    private val PARTICIPANT_MARKER = Regex("""^\s*(participant|actor)\s""", RegexOption.IGNORE_CASE)
    private val SEQUENCE_ARROW = Regex(""".+(->>?|-->>?|<-{1,2}|\.\.>|<\.\.).+:.+""")

    /** Keywords that belong to a sequence diagram and to nothing else. Deliberately excludes
     *  `else` and `end`, which an activity diagram's `if`/`endif` uses too. */
    private val SEQUENCE_ONLY_MARKER =
        Regex("""^\s*(alt|opt|loop|par|critical|break|activate|deactivate|box|end\s*box|autonumber)\b""", RegexOption.IGNORE_CASE)

    private val DEPLOYMENT_KEYWORDS = Regex("""^\s*(node|device|execution\s+environment)\s""", RegexOption.IGNORE_CASE)
    private val COMPONENT_KEYWORDS = Regex("""^\s*(component|interface|package)\s|^\s*\[""", RegexOption.IGNORE_CASE)
    private val ARTIFACT_KEYWORD = Regex("""^\s*artifact\s""", RegexOption.IGNORE_CASE)

    /** [COMPONENT_KEYWORDS] minus `interface`, and [CLASS_KEYWORD] minus `interface`: the one
     *  keyword both families declare, and therefore the one that must not be evidence for either
     *  when deciding between them. Counting it as component evidence made every class diagram with
     *  an interface in it — an entirely ordinary thing — parse as an empty component diagram. */
    private val COMPONENT_ONLY_KEYWORDS = Regex("""^\s*(component|package)\s|^\s*\[""", RegexOption.IGNORE_CASE)
    private val CLASS_ONLY_KEYWORD = Regex("""^\s*(abstract\s+class|abstract|class|enum|entity)\s""", RegexOption.IGNORE_CASE)

    fun detect(text: String): DiagramFamily {
        val envelope = PumlEnvelopeReader.read(text) ?: return DiagramFamily.UNKNOWN
        val body = envelope.body.map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("'") }
        if (body.isEmpty()) return DiagramFamily.OTHER

        if (body.any { C4_INCLUDE.containsMatchIn(it) } || body.any { C4_CALL.containsMatchIn(it) }) {
            return DiagramFamily.C4
        }
        // Checked before SEQUENCE: a UseCase `<<include>>`/`<<extend>>` dependency line
        // (`UC1 ..> UC2 : <<extend>>`) has the exact `arrow ... : label` shape SEQUENCE_ARROW
        // matches, so the unambiguous `usecase` keyword (or bracket-`as` shorthand) must win first
        // — otherwise a UseCase diagram that also declares `actor`s gets misread as a sequence
        // diagram's participant + message pair.
        if (body.any { USE_CASE_MARKER.containsMatchIn(it) }) {
            return DiagramFamily.USE_CASE
        }
        if (body.any { PARTICIPANT_MARKER.containsMatchIn(it) } && body.any { SEQUENCE_ARROW.matches(it) }) {
            return DiagramFamily.SEQUENCE
        }
        // Also before ACTIVITY: a sequence diagram needs no `participant` line — the arrows alone
        // are enough for PlantUML — and the bare `end` that closes its `alt` is exactly how an
        // activity diagram ends a branch. Without this, `A -> B : x` / `alt` / `end` reads as an
        // activity diagram and then fails to parse as one.
        if (body.any { SEQUENCE_ONLY_MARKER.containsMatchIn(it) } && body.any { SEQUENCE_ARROW.matches(it) }) {
            return DiagramFamily.SEQUENCE
        }
        if (body.any { STATE_MARKER.containsMatchIn(it) }) {
            return DiagramFamily.STATE
        }
        if (body.any { ACTIVITY_MARKER.containsMatchIn(it) }) {
            return DiagramFamily.ACTIVITY
        }
        if (body.any { PARTICIPANT_MARKER.containsMatchIn(it) }) {
            return DiagramFamily.USE_CASE
        }

        val deploymentHits = body.count { DEPLOYMENT_KEYWORDS.containsMatchIn(it) || ARTIFACT_KEYWORD.containsMatchIn(it) }
        val componentHits = body.count { COMPONENT_ONLY_KEYWORDS.containsMatchIn(it) }
        // A `class`/`enum`/`entity` declaration settles it: those appear in no other family, while
        // `component`/`node` diagrams routinely borrow `interface`. Without this guard a class
        // diagram declaring one interface lost every one of its classes to the component importer.
        val classHits = body.count { CLASS_ONLY_KEYWORD.containsMatchIn(it) }
        if (classHits == 0 && (deploymentHits > 0 || componentHits > 0)) {
            return if (deploymentHits > componentHits) DiagramFamily.DEPLOYMENT else DiagramFamily.COMPONENT
        }

        if (body.any { OBJECT_KEYWORD.containsMatchIn(it) }) {
            return DiagramFamily.OBJECT
        }
        if (body.any { CLASS_KEYWORD.containsMatchIn(it) }) {
            return DiagramFamily.CLASS
        }
        // No declaration keyword of any kind, but at least one `A -> B : label`-shaped line —
        // PlantUML itself treats bare, undeclared message arrows as a sequence diagram by default.
        if (body.any { SEQUENCE_ARROW.matches(it) }) {
            return DiagramFamily.SEQUENCE
        }
        return DiagramFamily.OTHER
    }
}
