package de.tum.cit.aet.apollon.puml

sealed interface PumlActivityParseResult {
    data class Rejected(val reason: String) : PumlActivityParseResult

    data class Parsed(val diagram: PumlActivityDiagram, val residual: PumlResidual, val unsupportedCount: Int) : PumlActivityParseResult
}

private val ACTIVITY_START = Regex("""^start\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_STOP = Regex("""^(stop|end)\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_ACTION = Regex("""^:(.*);$""", RegexOption.DOT_MATCHES_ALL)
private val ACTIVITY_ARROW_LABEL = Regex("""^->\s*(.*);$""", RegexOption.DOT_MATCHES_ALL)
private val ACTIVITY_IF = Regex("""^if\s*\((.*)\)\s*then\s*(?:\((.*)\))?\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_ELSEIF = Regex("""^else\s*if\s*\((.*)\)\s*then\s*(?:\((.*)\))?\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_ELSE = Regex("""^else\s*(?:\((.*)\))?\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_ENDIF = Regex("""^endif\s*$""", RegexOption.IGNORE_CASE)

// `fork` and `split` draw the same two bars around the same parallel strands; PlantUML's only
// difference is that a `split` need not rejoin. They therefore share a parser and differ by keyword.
private val ACTIVITY_FORK = Regex("""^(fork|split)\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_FORK_AGAIN = Regex("""^(fork|split)\s+again\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_END_FORK = Regex("""^end\s*(fork|merge|split)\s*$""", RegexOption.IGNORE_CASE)

// The condition group is lazy in all three, unlike `if`'s: `then` makes `if`'s closing bracket
// unambiguous, whereas `while (a) is (yes)` has two and a greedy group would swallow the first.
private val ACTIVITY_WHILE = Regex("""^while\s*\((.*?)\)\s*(?:is\s*\((.*)\))?\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_ENDWHILE = Regex("""^endwhile\s*(?:\((.*)\))?\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_REPEAT = Regex("""^repeat\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_REPEAT_WHILE =
    Regex("""^repeat\s+while\s*\((.*?)\)\s*(?:is\s*\((.*?)\))?\s*(?:not\s*\((.*)\))?\s*$""", RegexOption.IGNORE_CASE)

private val ACTIVITY_SWITCH = Regex("""^switch\s*\((.*)\)\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_CASE = Regex("""^case\s*(?:\((.*)\))?\s*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_ENDSWITCH = Regex("""^endswitch\s*$""", RegexOption.IGNORE_CASE)

private val ACTIVITY_DETACH = Regex("""^(detach|kill)\s*$""", RegexOption.IGNORE_CASE)

private val ACTIVITY_SPAN_OPEN = Regex("""^(partition|group)\b(.*)$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_SPAN_CLOSE = Regex("""^(\}|end\s*(partition|group))\s*$""", RegexOption.IGNORE_CASE)

private val ACTIVITY_NOTE = Regex("""^(floating\s+)?note\b""", RegexOption.IGNORE_CASE)

/** A `note` that opens a block rather than saying everything on its own line — the difference is
 *  whether the text follows a `:` on the same line. */
private val ACTIVITY_NOTE_OPEN = Regex("""^(floating\s+)?note\b[^:]*$""", RegexOption.IGNORE_CASE)
private val ACTIVITY_NOTE_CLOSE = Regex("""^end\s*note\s*$""", RegexOption.IGNORE_CASE)

/**
 * The lines that close a block. An unrecognised line is kept as decoration rather than refused
 * (see [PlantUmlActivityImporter]) — but a closer with nothing open is a genuinely broken file, and
 * swallowing one as decoration would move whatever followed it into the wrong branch.
 */
private val BLOCK_CLOSERS =
    listOf(
        ACTIVITY_ELSEIF,
        ACTIVITY_ELSE,
        ACTIVITY_ENDIF,
        ACTIVITY_FORK_AGAIN,
        ACTIVITY_END_FORK,
        ACTIVITY_ENDWHILE,
        ACTIVITY_REPEAT_WHILE,
        ACTIVITY_CASE,
        ACTIVITY_ENDSWITCH,
    )

/**
 * `.puml` text -> [PumlActivityDiagram] + [PumlResidual], for PlantUML's modern (`start`/`:action;`)
 * activity syntax.
 *
 * This family is the odd one out. Every other importer reads a flat list of declarations and
 * relations, each line standing on its own; an activity diagram is a *structured* program — `if`
 * opens a block, `endif` closes it — and the graph Apollon draws has to be built by walking that
 * structure. So this file is a small recursive-descent parser rather than a `when` over line
 * shapes, and it creates nodes the source never spells out: `endif` becomes a merge diamond,
 * `end fork` a join bar and `endwhile` a loop head, because that is what the flow actually does and
 * what [PlantUmlActivityExporter] needs in order to find its way back to the block that made it.
 *
 * What an activity construct *is* decides how it survives a round trip, and there are three answers:
 *
 * - **Structure**, read into the graph. `start`/`stop`/`end`, `:action;`, `->label;`,
 *   `if`/`elseif`/`else`/`endif`, `switch`/`case`/`endswitch`, `fork`/`split` and their `again`/`end`
 *   forms, `while`/`endwhile`, `repeat`/`repeat while`, and `detach`/`kill`. These reach the canvas
 *   as real steps and flows, and are written back from the graph rather than from the source text.
 * - **Brackets**, preserved as [PumlActivitySpan]s. `partition` and `group` wrap a run of steps
 *   without changing the flow through it, so they are remembered as their two halves plus the steps
 *   that were inside and rebuilt around whichever of those survive.
 * - **Decoration**, preserved verbatim in [PumlResidual.activityAnchors]. Swimlanes, notes, colour
 *   directives — and, deliberately, *anything else at all*: an unrecognised line attaches to the step
 *   that followed it and is written back there. That is what makes this importer open a file it only
 *   partly understands instead of refusing it, and it is why there is no list of unsupported
 *   constructs here any more.
 *
 * A file is still rejected outright when its *structure* does not add up — an unclosed `if`, a stray
 * `endif`, an action with no `;` — because a program that does not parse cannot be laid back out as
 * one. The legacy `(*) --> "A"` syntax lands here too, by a different route: none of its lines are
 * structure, so nothing reaches the graph and the file is refused for having no steps. The View and
 * Text tabs still show any such file in full.
 */
object PlantUmlActivityImporter {
    fun parse(text: String): PumlActivityParseResult {
        val envelope = PumlEnvelopeReader.read(text) ?: return PumlActivityParseResult.Rejected("does not contain an @startuml block")
        val name = envelope.startLine.removePrefix("@startuml").trim().ifEmpty { null }

        val preamble = mutableListOf<String>()
        val postamble = mutableListOf<String>()

        // An activity source is a program, so it is read as a statement stream rather than line by
        // line: an action may be spread over several lines and only ends at its `;`.
        val statements = mutableListOf<String>()
        // The same statements with their leading whitespace still on. Nothing structural needs it —
        // the exporter re-indents a program from its own block depth — but a construct kept verbatim
        // does: the body of a multi-line `note` is indented under its opener, and only these lines
        // remember by how much.
        val indented = mutableListOf<String>()
        val pending = StringBuilder()
        var sawMapped = false
        for (raw in envelope.body) {
            val trimmed = raw.trim()
            if (pending.isNotEmpty()) {
                pending.append('\n').append(trimmed)
                if (trimmed.endsWith(";")) {
                    statements += pending.toString()
                    indented += pending.toString()
                    pending.clear()
                }
                continue
            }
            if (trimmed.isEmpty() || isTierALine(trimmed)) {
                if (!sawMapped) preamble += raw else postamble += raw
                continue
            }
            sawMapped = true
            if ((trimmed.startsWith(":") || trimmed.startsWith("->")) && !trimmed.endsWith(";")) {
                pending.append(trimmed)
                continue
            }
            statements += trimmed
            indented += raw.trimEnd()
        }
        if (pending.isNotEmpty()) return PumlActivityParseResult.Rejected("has an action that is never closed with ';'")

        val parser = Parser(statements, indented)
        val cursor = Cursor(null)
        val stopped = parser.walk(0, cursor, closers = emptySet())
        parser.failure?.let { return PumlActivityParseResult.Rejected(it) }
        if (stopped < statements.size) {
            return PumlActivityParseResult.Rejected("has a stray '${statements[stopped].lineSequence().first()}' with no matching block")
        }
        if (parser.builder.nodes.isEmpty()) return PumlActivityParseResult.Rejected("contains no activity steps")
        parser.finish()

        val keyByRefId = parser.builder.nodes.anchorKeys()
        val anchors = parser.anchorsBy(keyByRefId)
        val spans = parser.spansBy(keyByRefId)
        val residual =
            PumlResidual(
                startLine = envelope.startLine,
                endLine = envelope.endLine,
                eol = envelope.eol,
                indent = envelope.indent,
                preamble = preamble,
                postamble = postamble,
                unsupported = emptyList(),
                activityAnchors = anchors,
                activitySpans = spans,
            )
        return PumlActivityParseResult.Parsed(
            PumlActivityDiagram(name, parser.builder.nodes, parser.builder.flows),
            residual,
            anchors.values.sumOf { it.split("\n").count { line -> line.isNotBlank() } } + spans.size,
        )
    }

    /** Everything the recursive walk carries; `tail` is the node the next step attaches to, and
     *  `null` means the strand ended at a `stop` or a `detach`. */
    private class Cursor(var tail: String?, var pendingLabel: String = "")

    /** A `partition`/`group` while it is still open, collecting the steps that fall inside it. */
    private class OpenSpan(val open: String) {
        var close: String = "}"
        val members = mutableListOf<String>()
    }

    private class Parser(private val statements: List<String>, private val indented: List<String>) {
        val builder = PumlActivityGraphBuilder()
        var failure: String? = null

        /** refId -> the decoration that stood immediately before that step, in source order. Keyed
         *  by refId while walking and translated to anchor keys once every node exists. */
        private val decorations = mutableMapOf<String, MutableList<String>>()

        /** refId -> the decoration that stood immediately *after* that step — notes, which attach
         *  backwards. See [activityAnchorAfter]. */
        private val notes = mutableMapOf<String, MutableList<String>>()
        private val trailing = mutableListOf<String>()
        private val pending = mutableListOf<String>()

        /** The last step a source statement spelled out, which is the one a note written under it
         *  belongs to. Not the walk's cursor: after an `endif` that is a merge diamond the source
         *  never wrote and the exporter never gives a line of its own. */
        private var lastStep: String? = null

        /** Completed and in-progress spans, in the order they opened, which is the order
         *  [PlantUmlActivityExporter] has to reopen them in for the nesting to come out right. */
        private val spans = mutableListOf<OpenSpan>()
        private val openSpans = ArrayDeque<OpenSpan>()

        /** Whatever decoration outlived the last step, and any `partition` the file forgot to
         *  close — an unbalanced bracket has to be balanced somewhere, and here is the only place
         *  that still knows what the missing half would have said. */
        fun finish() {
            trailing += pending
            pending.clear()
            openSpans.clear()
        }

        fun anchorsBy(keyByRefId: Map<String, String>): Map<String, String> =
            buildMap {
                // Insertion order is the file's order, which is what the exporter walks in — that is
                // what lets it flush an entry whose own step has since been deleted along with the
                // next one instead of losing it. The leftovers after the last step go last.
                builder.nodes.forEach { node ->
                    val key = keyByRefId[node.refId] ?: return@forEach
                    decorations[node.refId]?.let { put(activityAnchorBefore(key), it.joinToString("\n")) }
                    notes[node.refId]?.let { put(activityAnchorAfter(key), it.joinToString("\n")) }
                }
                if (trailing.isNotEmpty()) put(ACTIVITY_TAIL_ANCHOR, trailing.joinToString("\n"))
            }

        fun spansBy(keyByRefId: Map<String, String>): List<PumlActivitySpan> =
            spans.map { span -> PumlActivitySpan(span.open, span.close, span.members.mapNotNull { keyByRefId[it] }) }

        /**
         * Consumes statements from [from] until one of [closers] matches — which is left
         * unconsumed, for the caller to recognise — or the list runs out, wiring what it reads onto
         * [cursor]. Returns the index it stopped at.
         */
        fun walk(
            from: Int,
            cursor: Cursor,
            closers: Set<Regex>,
        ): Int {
            var i = from
            while (i < statements.size && failure == null) {
                val statement = statements[i]
                if (closers.any { it.matches(statement) }) return i

                fun attach(refId: String) {
                    builder.link(cursor.tail, refId, cursor.pendingLabel)
                    cursor.pendingLabel = ""
                    cursor.tail = refId
                }

                when {
                    ACTIVITY_START.matches(statement) -> {
                        attach(record(builder.add(PumlActivityNodeKind.INITIAL)))
                        i++
                    }
                    ACTIVITY_STOP.matches(statement) -> {
                        attach(record(builder.add(PumlActivityNodeKind.FINAL, keyword = statement.lowercase())))
                        cursor.tail = null
                        i++
                    }
                    // A strand that stops without a final node. The spelling has nowhere of its own
                    // to live — the whole point is that no box is drawn — so it rides on the step
                    // it followed, and the exporter writes it back when that step leads nowhere.
                    ACTIVITY_DETACH.matches(statement) -> {
                        cursor.tail?.let { builder.retag(it, statement.lowercase()) }
                        cursor.tail = null
                        i++
                    }
                    ACTIVITY_ARROW_LABEL.matches(statement) -> {
                        cursor.pendingLabel = ACTIVITY_ARROW_LABEL.find(statement)!!.groupValues[1].trim()
                        i++
                    }
                    ACTIVITY_ACTION.matches(statement) -> {
                        attach(record(builder.add(PumlActivityNodeKind.ACTION, ACTIVITY_ACTION.find(statement)!!.groupValues[1].trim())))
                        i++
                    }
                    ACTIVITY_IF.matches(statement) -> i = walkConditional(i, cursor)
                    ACTIVITY_SWITCH.matches(statement) -> i = walkSwitch(i, cursor)
                    ACTIVITY_WHILE.matches(statement) -> i = walkWhile(i, cursor)
                    ACTIVITY_REPEAT.matches(statement) -> i = walkRepeat(i, cursor)
                    ACTIVITY_FORK.matches(statement) -> i = walkFork(i, cursor)
                    ACTIVITY_SPAN_OPEN.matches(statement) -> {
                        openSpan(statement)
                        i++
                    }
                    ACTIVITY_SPAN_CLOSE.matches(statement) -> {
                        if (openSpans.isEmpty()) return i
                        openSpans.removeLast().close = statement
                        i++
                    }
                    BLOCK_CLOSERS.any { it.matches(statement) } -> return i
                    else -> i = keepAsDecoration(i)
                }
            }
            return i
        }

        /** Files the pending decoration under [refId] and counts it into every open span. Called for
         *  the steps a source statement spells out, and only those: a merge diamond the importer
         *  invented has no line of its own for the exporter to hang anything off. */
        private fun record(refId: String): String {
            if (pending.isNotEmpty()) {
                decorations.getOrPut(refId) { mutableListOf() } += pending
                pending.clear()
            }
            openSpans.forEach { it.members += refId }
            lastStep = refId
            return refId
        }

        private fun openSpan(statement: String) {
            val span = OpenSpan(statement)
            // A brace-less `partition Name` is closed by `end partition` rather than by `}`; the
            // opener is the only place that distinction is visible.
            if (!statement.trimEnd().endsWith("{")) {
                span.close = "end ${ACTIVITY_SPAN_OPEN.find(statement)!!.groupValues[1].lowercase()}"
            }
            spans += span
            openSpans.addLast(span)
        }

        /**
         * Keeps a line this parser has no grammar for, so that it comes back where it stood rather
         * than costing the whole file its Edit tab. A multi-line `note` is taken as one run.
         *
         * Indentation is kept relative to the run's first line and dropped absolutely, because the
         * exporter supplies the block depth: a note that was two levels in comes back two levels in,
         * with its own body still stepped in under it.
         */
        private fun keepAsDecoration(from: Int): Int {
            val base = indented[from].takeWhile { it.isWhitespace() }
            fun relative(i: Int) = indented[i].removePrefix(base).ifEmpty { statements[i] }

            // A note belongs to the step above it; everything else applies from here onwards and so
            // belongs to the step below. A note with nothing above it has only one place left to go.
            val note = ACTIVITY_NOTE.containsMatchIn(statements[from])
            val run = if (note) lastStep?.let { notes.getOrPut(it) { mutableListOf() } } ?: pending else pending

            var i = from
            run += statements[from]
            val block = ACTIVITY_NOTE_OPEN.matches(statements[i])
            i++
            while (block && i < statements.size) {
                run += relative(i)
                val closed = ACTIVITY_NOTE_CLOSE.matches(statements[i])
                i++
                if (closed) break
            }
            return i
        }

        /** `if (c) then (l) … [elseif …] [else (l) …] endif`, as one decision diamond per condition
         *  and a single merge diamond every branch converges on. */
        private fun walkConditional(
            from: Int,
            cursor: Cursor,
        ): Int {
            val branchClosers = setOf(ACTIVITY_ELSEIF, ACTIVITY_ELSE, ACTIVITY_ENDIF)
            // Created before the branches, not after them, so that the flows leaving a decision are
            // recorded in source order even when a branch is empty. [PlantUmlActivityExporter]
            // reads the true path off the *first* outgoing flow, so an empty `then` whose flow was
            // appended last would come back with its branches swapped.
            val merge = builder.add(PumlActivityNodeKind.MERGE)
            var i = from
            var decision: String? = null

            while (i < statements.size) {
                val match = ACTIVITY_IF.find(statements[i]) ?: ACTIVITY_ELSEIF.find(statements[i]) ?: break
                val next = record(builder.add(PumlActivityNodeKind.DECISION, match.groupValues[1].trim()))
                if (decision == null) {
                    builder.link(cursor.tail, next, cursor.pendingLabel)
                    cursor.pendingLabel = ""
                } else {
                    // An `elseif` is a decision on the previous one's false path — which is exactly
                    // how PlantUML draws it, as a chain of diamonds.
                    builder.link(decision, next, "")
                }
                decision = next

                val branch = Cursor(next, match.groupValues[2].trim())
                i = walk(i + 1, branch, branchClosers)
                branch.tail?.let { builder.link(it, merge, branch.pendingLabel) }
                if (failure != null) return statements.size
                if (i >= statements.size || !ACTIVITY_ELSEIF.matches(statements[i])) break
            }

            val last = decision ?: return from
            var sawElse = false
            if (i < statements.size) {
                ACTIVITY_ELSE.find(statements[i])?.let { elseMatch ->
                    sawElse = true
                    val branch = Cursor(last, elseMatch.groupValues[1].trim())
                    i = walk(i + 1, branch, setOf(ACTIVITY_ENDIF))
                    branch.tail?.let { builder.link(it, merge, branch.pendingLabel) }
                }
            }
            if (failure != null) return statements.size
            // No `else` at all: the condition's false path still exists, it just goes straight on.
            if (!sawElse) builder.link(last, merge, "")

            if (i >= statements.size || !ACTIVITY_ENDIF.matches(statements[i])) {
                failure = "has an 'if' that is never closed with 'endif'"
                return statements.size
            }

            cursor.tail = merge
            cursor.pendingLabel = ""
            return i + 1
        }

        /** `switch (c) / case (v) … / endswitch`, as one decision with a branch per case. An `if`
         *  chain is several diamonds; a switch is one with several ways out, which is both how
         *  PlantUML draws it and how the exporter tells the two apart again. */
        private fun walkSwitch(
            from: Int,
            cursor: Cursor,
        ): Int {
            val merge = builder.add(PumlActivityNodeKind.MERGE)
            val condition = ACTIVITY_SWITCH.find(statements[from])!!.groupValues[1].trim()
            val decision = record(builder.add(PumlActivityNodeKind.DECISION, condition, keyword = "switch"))
            builder.link(cursor.tail, decision, cursor.pendingLabel)
            cursor.pendingLabel = ""

            var i = from + 1
            while (i < statements.size && ACTIVITY_CASE.matches(statements[i])) {
                val branch = Cursor(decision, ACTIVITY_CASE.find(statements[i])!!.groupValues[1].trim())
                i = walk(i + 1, branch, setOf(ACTIVITY_CASE, ACTIVITY_ENDSWITCH))
                branch.tail?.let { builder.link(it, merge, branch.pendingLabel) }
                if (failure != null) return statements.size
            }
            if (i >= statements.size || !ACTIVITY_ENDSWITCH.matches(statements[i])) {
                failure = "has a 'switch' that is never closed with 'endswitch'"
                return statements.size
            }

            cursor.tail = merge
            cursor.pendingLabel = ""
            return i + 1
        }

        /**
         * `while (c) is (l) … endwhile (l)`, as a merge diamond the loop comes back to, a decision
         * on the condition, and a back edge from the body to the merge.
         *
         * The merge is what makes the loop findable again on the way out — see
         * [PumlActivityDiagram.loops] — and it is a real part of the flow rather than a bookkeeping
         * node: it is where the way in and the way round meet.
         */
        private fun walkWhile(
            from: Int,
            cursor: Cursor,
        ): Int {
            val match = ACTIVITY_WHILE.find(statements[from])!!
            val head = builder.add(PumlActivityNodeKind.MERGE)
            builder.link(cursor.tail, head, cursor.pendingLabel)
            cursor.pendingLabel = ""
            val test = record(builder.add(PumlActivityNodeKind.DECISION, match.groupValues[1].trim()))
            builder.link(head, test, "")

            val body = Cursor(test, match.groupValues[2].trim())
            val i = walk(from + 1, body, setOf(ACTIVITY_ENDWHILE))
            body.tail?.let { builder.link(it, head, body.pendingLabel) }
            if (failure != null) return statements.size
            if (i >= statements.size || !ACTIVITY_ENDWHILE.matches(statements[i])) {
                failure = "has a 'while' that is never closed with 'endwhile'"
                return statements.size
            }

            // `endwhile (label)` labels the way *out*, which is the decision's second flow — and it
            // is created lazily, when whatever comes next attaches to it.
            cursor.tail = test
            cursor.pendingLabel = ACTIVITY_ENDWHILE.find(statements[i])!!.groupValues[1].trim()
            return i + 1
        }

        /** `repeat … repeat while (c) is (l) not (l)` — the same three nodes as a `while`, with the
         *  decision at the bottom of the loop instead of the top. */
        private fun walkRepeat(
            from: Int,
            cursor: Cursor,
        ): Int {
            val head = record(builder.add(PumlActivityNodeKind.MERGE))
            builder.link(cursor.tail, head, cursor.pendingLabel)
            cursor.pendingLabel = ""

            val body = Cursor(head)
            val i = walk(from + 1, body, setOf(ACTIVITY_REPEAT_WHILE))
            if (failure != null) return statements.size
            if (i >= statements.size || !ACTIVITY_REPEAT_WHILE.matches(statements[i])) {
                failure = "has a 'repeat' that is never closed with 'repeat while'"
                return statements.size
            }

            val match = ACTIVITY_REPEAT_WHILE.find(statements[i])!!
            val test = record(builder.add(PumlActivityNodeKind.DECISION, match.groupValues[1].trim()))
            builder.link(body.tail, test, body.pendingLabel)
            builder.link(test, head, match.groupValues[2].trim())

            cursor.tail = test
            cursor.pendingLabel = match.groupValues[3].trim()
            return i + 1
        }

        /** `fork … fork again … end fork`, as a fork bar, one strand per branch, and a join bar.
         *  `split` is the same shape under another name and comes through here too. */
        private fun walkFork(
            from: Int,
            cursor: Cursor,
        ): Int {
            val closers = setOf(ACTIVITY_FORK_AGAIN, ACTIVITY_END_FORK)
            val keyword = statements[from].lowercase()
            val fork = record(builder.add(PumlActivityNodeKind.FORK, keyword = keyword))
            builder.link(cursor.tail, fork, cursor.pendingLabel)
            cursor.pendingLabel = ""
            // Created up front for the same reason as an `if`'s merge — see [walkConditional].
            val join = builder.add(PumlActivityNodeKind.JOIN)

            var i = from + 1
            while (true) {
                val branch = Cursor(fork)
                i = walk(i, branch, closers)
                branch.tail?.let { builder.link(it, join, branch.pendingLabel) }
                if (failure != null) return statements.size
                if (i >= statements.size || !ACTIVITY_FORK_AGAIN.matches(statements[i])) break
                i++
            }

            if (i >= statements.size || !ACTIVITY_END_FORK.matches(statements[i])) {
                failure = "has a '$keyword' that is never closed with 'end $keyword'"
                return statements.size
            }

            builder.retag(join, keyword = statements[i].lowercase().replace(Regex("""\s+"""), " "))
            cursor.tail = join
            cursor.pendingLabel = ""
            return i + 1
        }
    }
}
