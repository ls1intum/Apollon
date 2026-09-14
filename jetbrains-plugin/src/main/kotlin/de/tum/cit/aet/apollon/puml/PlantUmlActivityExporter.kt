package de.tum.cit.aet.apollon.puml

/**
 * The exact inverse of [PlantUmlActivityImporter] — see [PlantUmlExporter] (Class) for the
 * determinism contract this mirrors.
 *
 * And by some way the hardest inverse in this plugin. The other families write a line per element,
 * in model order; an activity diagram has to be turned back into a *program*, so this walks the
 * flow from the initial node and rebuilds the block structure as it goes: a diamond with two
 * outgoing flows is an `if`, the point where its branches come back together is the `endif`, a bar
 * is a `fork`/`end fork` the same way, and a diamond the flow arrives back at is a loop. The merge
 * and join nodes the importer inserted are what make that reconvergence point findable rather than
 * guessed at.
 *
 * On top of the program it also has to put back the two kinds of thing the canvas never held: the
 * decoration anchored to each step ([PumlResidual.activityAnchors]) and the `partition`/`group`
 * brackets around runs of them ([PumlResidual.activitySpans]). Decoration is never dropped — an
 * anchor whose step the user deleted flushes with the next surviving one, the same rule
 * [PlantUmlSequenceExporter] follows — and a bracket is only ever written as a matched pair.
 *
 * A canvas graph is free-form, so it can still be drawn into shapes no `start`/`endif` program can
 * express — two arrows into the middle of a branch, or a cycle through something other than a merge
 * diamond. Rather than invent syntax for those, this drops the part it cannot lay out and leaves
 * [RoundTripValidator] to notice the missing steps and refuse the save, which is the same safety net
 * every other family relies on.
 */
object PlantUmlActivityExporter {
    fun render(
        diagram: PumlActivityDiagram,
        residual: PumlResidual,
    ): String {
        val indent = residual.indent.ifEmpty { "  " }
        val lines = mutableListOf<String>()
        lines += residual.startLine
        lines += residual.preamble
        lines += Walker(diagram, residual, indent).render()
        lines += residual.unsupported
        lines += residual.postamble
        lines += residual.endLine
        val eol = residual.eol.ifEmpty { "\n" }
        return lines.joinToString(eol) + eol
    }

    /**
     * A [PumlActivitySpan] while the walk is inside it.
     *
     * [remaining] counts only the members the diagram still has. Counting all of them would leave a
     * partition open for the rest of the file the moment one of its steps was deleted on the canvas,
     * because the step it was waiting to see go by is never coming.
     */
    private class SpanState(val span: PumlActivitySpan, present: Set<String>) {
        var remaining = span.members.count { it in present }
        var opened = false
        var closed = false
    }

    private class Walker(
        private val diagram: PumlActivityDiagram,
        private val residual: PumlResidual,
        private val indent: String,
    ) {
        private val nodeById = diagram.nodes.associateBy { it.refId }
        private val outgoing = diagram.flows.outgoingBy()
        private val incoming = diagram.flows.incomingBy()
        private val visited = mutableSetOf<String>()
        private val out = mutableListOf<String>()

        private val keyByRefId = diagram.nodes.anchorKeys()
        private val loops = diagram.loops()
        private val loopByHead = loops.associateBy { it.headRefId }
        /** The nodes a loop is made of. [reconvergence] has to ignore these: its bracket counting
         *  assumes every diamond that opens is closed further down, and a loop's pair is closed by
         *  its own back edge, which the count never walks. Without this an `if` containing a `while`
         *  would find the *loop's* head and write its `endif` in the middle of the loop. */
        private val loopNodes = loops.flatMap { listOf(it.headRefId, it.testRefId) }.toSet()

        private val spans = residual.activitySpans.map { SpanState(it, keyByRefId.values.toSet()) }
        private val anchorOrder = residual.activityAnchors.keys.toList()
        private var anchorCursor = 0
        /** How many `partition`/`group` brackets are currently open, added to every line's indent. */
        private var spanDepth = 0

        fun render(): List<String> {
            // The initial node first, then anything left over: a canvas can hold a second, detached
            // strand, and dropping it silently would be worse than writing it after the first.
            val roots =
                diagram.nodes.filter { incoming[it.refId].isNullOrEmpty() }
                    .sortedBy { if (it.kind == PumlActivityNodeKind.INITIAL) 0 else 1 }
            roots.forEach { walk(it.refId, emptySet(), 0) }
            diagram.nodes.filter { it.refId !in visited }.forEach { walk(it.refId, emptySet(), 0) }
            // Decoration that outlived every step it could have hung off, and any bracket the walk
            // never reached the far end of. Both would otherwise be lost with no line to show for it.
            flushAnchorsThrough(anchorOrder.size - 1, 0)
            spans.asReversed().forEach { state ->
                if (state.opened && !state.closed) closeSpan(state, 0)
            }
            return out
        }

        private fun emit(
            depth: Int,
            text: String,
        ) {
            out += (indent.repeat(depth + spanDepth) + text).trimEnd()
        }

        /**
         * Everything that goes in front of a step's own line: the brackets it opens, then the
         * decoration anchored to it — plus any earlier decoration still waiting, because its own
         * step is gone and this is the first place left to put it.
         */
        private fun lead(
            node: PumlActivityNode,
            depth: Int,
        ) {
            val key = keyByRefId[node.refId] ?: return
            spans.forEach { state ->
                if (!state.opened && !state.closed && key in state.span.members) {
                    emit(depth, state.span.open)
                    state.opened = true
                    spanDepth++
                }
            }
            flushAnchorsThrough(anchorOrder.indexOf(activityAnchorBefore(key)), depth)
        }

        /** The decoration a step carries on its far side — a `note` written under it. Emitted after
         *  the step's own line and, for a block, after the line that opens it, which is where the
         *  source had it and where PlantUML will attach it to the same step again. */
        private fun after(
            node: PumlActivityNode,
            depth: Int,
        ) {
            val key = keyByRefId[node.refId] ?: return
            flushAnchorsThrough(anchorOrder.indexOf(activityAnchorAfter(key)), depth)
        }

        private fun flushAnchorsThrough(
            last: Int,
            depth: Int,
        ) {
            while (anchorCursor <= last) {
                residual.activityAnchors.getValue(anchorOrder[anchorCursor]).split("\n").forEach { emit(depth, it) }
                anchorCursor++
            }
        }

        /** Closes every bracket whose last remaining step has just been written, innermost first. */
        private fun trail(
            node: PumlActivityNode,
            depth: Int,
        ) {
            val key = keyByRefId[node.refId] ?: return
            spans.forEach { if (key in it.span.members) it.remaining-- }
            spans.asReversed().forEach { state ->
                if (state.opened && !state.closed && state.remaining <= 0) closeSpan(state, depth)
            }
        }

        private fun closeSpan(
            state: SpanState,
            depth: Int,
        ) {
            spanDepth--
            emit(depth, state.span.close)
            state.closed = true
        }

        private fun walk(
            start: String,
            stopAt: Set<String>,
            depth: Int,
        ) {
            var current: String? = start
            while (current != null && current !in stopAt) {
                val node = nodeById[current] ?: return
                // Anything reached twice is a shape no structured program can express; stopping
                // here is what makes the validator refuse the save instead of looping forever.
                if (!visited.add(current)) return

                current =
                    when (node.kind) {
                        PumlActivityNodeKind.INITIAL -> {
                            lead(node, depth)
                            emit(depth, "start")
                            after(node, depth)
                            trail(node, depth)
                            advance(node.refId, depth)
                        }
                        PumlActivityNodeKind.ACTION -> {
                            lead(node, depth)
                            emit(depth, ":${node.label};")
                            after(node, depth)
                            trail(node, depth)
                            advance(node.refId, depth)
                        }
                        PumlActivityNodeKind.FINAL -> {
                            lead(node, depth)
                            emit(depth, node.keyword ?: "stop")
                            after(node, depth)
                            trail(node, depth)
                            null
                        }
                        // A merge the flow comes back to is a loop head. Otherwise it was reached on
                        // its own rather than as somebody's reconvergence point, and a merge or join
                        // with one way out is just a step the flow passes through.
                        PumlActivityNodeKind.MERGE, PumlActivityNodeKind.JOIN ->
                            loopByHead[node.refId]?.let { writeLoop(it, stopAt, depth) } ?: advance(node.refId, depth)
                        PumlActivityNodeKind.DECISION -> writeConditional(node, stopAt, depth)
                        PumlActivityNodeKind.FORK -> writeFork(node, stopAt, depth)
                    }
            }
        }

        /**
         * Follows the one flow out of a step, writing its `->label;` first when it has one. Labels
         * live on flows rather than on steps, so this is the only place they can be written back —
         * and it is why walking goes through a helper rather than just reading the successor.
         *
         * A step with no way out that is not a final node is a strand PlantUML ends with `detach`.
         */
        private fun advance(
            refId: String,
            depth: Int,
        ): String? {
            val flow = outgoing[refId]?.firstOrNull()
            if (flow == null) {
                nodeById[refId]?.keyword?.takeIf { it == "detach" || it == "kill" }?.let { emit(depth, it) }
                return null
            }
            if (flow.label.isNotEmpty()) emit(depth, "->${flow.label};")
            return flow.targetRefId
        }

        /** Writes `if`/`elseif`/`else`/`endif` or `switch`/`case`/`endswitch`, and returns the step
         *  the flow continues at. */
        private fun writeConditional(
            decision: PumlActivityNode,
            stopAt: Set<String>,
            depth: Int,
        ): String? {
            val branches = outgoing[decision.refId].orEmpty()
            if (branches.size < 2) return branches.firstOrNull()?.targetRefId

            lead(decision, depth)
            val merge = reconvergence(decision.refId, PumlActivityNodeKind.MERGE)
            val inner = if (merge == null) stopAt else stopAt + merge

            // One diamond with three or more ways out is a `switch` whether or not the source said
            // so — an `if` has two, and `if`/`elseif` is a *chain* of diamonds rather than one. That
            // matters beyond spelling: before switches were written back, the third branch onwards
            // was simply not written at all.
            if (decision.keyword == "switch" || branches.size > 2) {
                emit(depth, "switch (${decision.label})")
                after(decision, depth)
                branches.forEach { branch ->
                    emit(depth, "case (${branch.label})")
                    if (branch.targetRefId != merge) walk(branch.targetRefId, inner, depth + 1)
                }
                emit(depth, "endswitch")
            } else {
                writeIfChain(decision, merge, inner, depth)
            }

            trail(decision, depth)
            if (merge == null) return null
            visited += merge
            return advance(merge, depth)
        }

        private fun writeIfChain(
            decision: PumlActivityNode,
            merge: String?,
            inner: Set<String>,
            depth: Int,
        ) {
            var head = decision
            var keyword = "if"
            val chain = mutableListOf<PumlActivityNode>()
            while (true) {
                val paths = outgoing[head.refId].orEmpty()
                val thenPath = paths.first()
                emit(depth, "$keyword (${head.label}) then (${thenPath.label})")
                after(head, depth)
                if (thenPath.targetRefId != merge) walk(thenPath.targetRefId, inner, depth + 1)

                val elsePath = paths.getOrNull(1)
                val elseTarget = elsePath?.targetRefId
                // A chain of diamonds on each other's false path is what `elseif` means, and the
                // only shape that may be written back as one: anything else is a nested `if`.
                val chained =
                    elseTarget?.let { nodeById[it] }
                        ?.takeIf { candidate ->
                            candidate.kind == PumlActivityNodeKind.DECISION &&
                                candidate.refId !in visited &&
                                candidate.keyword != "switch" &&
                                incoming[candidate.refId].orEmpty().size == 1 &&
                                outgoing[candidate.refId].orEmpty().size == 2 &&
                                reconvergence(candidate.refId, PumlActivityNodeKind.MERGE) == merge
                        }
                if (chained != null) {
                    visited += chained.refId
                    lead(chained, depth)
                    chain += chained
                    head = chained
                    keyword = "elseif"
                    continue
                }
                // `else` is written only when the false path does something — a decision whose
                // false path runs straight to an unlabelled merge came from a bare `if`/`endif`.
                // A *labelled* one did not, and keeping the label is what stops `else (no)` on an
                // empty branch from disappearing on the first save.
                if (elseTarget != null && (elseTarget != merge || elsePath.label.isNotEmpty())) {
                    emit(depth, if (elsePath.label.isEmpty()) "else" else "else (${elsePath.label})")
                    walk(elseTarget, inner, depth + 1)
                }
                break
            }
            emit(depth, "endif")
            // The `elseif` diamonds are steps too, so a bracket that counted them among its members
            // has to see them go by or it would never find its last one and close.
            chain.asReversed().forEach { trail(it, depth) }
        }

        /**
         * Writes `while (c) … endwhile` or `repeat … repeat while (c)` and returns the step the flow
         * continues at.
         *
         * The two differ only in where the test sits, so the labels come off the same two flows: the
         * one that goes round again, and the one that leaves. `endwhile (label)` and
         * `repeat while … not (label)` both name the second, which is why the label the source wrote
         * at the *bottom* of the loop comes back off the flow leaving the decision.
         */
        private fun writeLoop(
            loop: PumlActivityLoop,
            stopAt: Set<String>,
            depth: Int,
        ): String? {
            val head = nodeById[loop.headRefId] ?: return null
            val test = nodeById[loop.testRefId] ?: return null
            val paths = outgoing[loop.testRefId].orEmpty()
            val exit = paths.getOrNull(1)
            visited += loop.testRefId

            if (loop.isRepeat) {
                lead(head, depth)
                emit(depth, "repeat")
                after(head, depth)
                outgoing[loop.headRefId]?.firstOrNull()?.let { walk(it.targetRefId, stopAt + loop.testRefId, depth + 1) }
                lead(test, depth)
                val again = paths.firstOrNull()?.label?.takeIf { it.isNotEmpty() }?.let { " is ($it)" }.orEmpty()
                val leave = exit?.label?.takeIf { it.isNotEmpty() }?.let { " not ($it)" }.orEmpty()
                emit(depth, "repeat while (${test.label})$again$leave")
                after(test, depth)
                trail(test, depth)
                trail(head, depth)
            } else {
                lead(test, depth)
                val again = paths.firstOrNull()?.label?.takeIf { it.isNotEmpty() }?.let { " is ($it)" }.orEmpty()
                emit(depth, "while (${test.label})$again")
                after(test, depth)
                paths.firstOrNull()
                    ?.takeIf { it.targetRefId != loop.headRefId }
                    ?.let { walk(it.targetRefId, stopAt + loop.headRefId, depth + 1) }
                emit(depth, exit?.label?.takeIf { it.isNotEmpty() }?.let { "endwhile ($it)" } ?: "endwhile")
                trail(test, depth)
            }
            return exit?.targetRefId
        }

        /** Writes `fork`/`fork again`/`end fork` — or the `split` spelling of the same three — and
         *  returns the step the flow continues at. */
        private fun writeFork(
            fork: PumlActivityNode,
            stopAt: Set<String>,
            depth: Int,
        ): String? {
            val branches = outgoing[fork.refId].orEmpty()
            if (branches.size < 2) return branches.firstOrNull()?.targetRefId

            lead(fork, depth)
            val join = reconvergence(fork.refId, PumlActivityNodeKind.JOIN)
            val inner = if (join == null) stopAt else stopAt + join

            val opener = fork.keyword?.takeIf { it == "fork" || it == "split" } ?: "fork"
            emit(depth, opener)
            after(fork, depth)
            branches.forEachIndexed { index, branch ->
                if (index > 0) emit(depth, "$opener again")
                if (branch.targetRefId != join) walk(branch.targetRefId, inner, depth + 1)
            }
            emit(depth, join?.let { nodeById[it]?.keyword } ?: "end $opener")
            trail(fork, depth)
            if (join == null) return null
            visited += join
            return advance(join, depth)
        }

        /**
         * The step that closes the block [from] opens — the `endif` of an `if`, the `end fork` of a
         * `fork` — or `null` when the branches never come back together, which is legal: two
         * branches that both `stop` simply end there.
         *
         * Found by bracket matching rather than by intersecting what the branches can reach.
         * Reachability looks like the obvious answer and is wrong twice over: a branch that ends in
         * `stop` reaches no merge at all and would veto one that exists, and a nested `if` inside a
         * branch puts *its* merge on the path first. Counting instead — every decision and fork
         * opens a bracket, every merge and join closes one — gets both right, because that is
         * precisely the structure the source had before [PlantUmlActivityImporter] flattened it.
         * A loop's own head and test are the exception, and are counted as neither: their bracket is
         * closed by the back edge, which this never walks.
         */
        private fun reconvergence(
            from: String,
            kind: PumlActivityNodeKind,
        ): String? {
            val queue = ArrayDeque(outgoing[from].orEmpty().map { it.targetRefId to 1 })
            val seen = queue.toMutableSet()
            while (queue.isNotEmpty()) {
                val (refId, depth) = queue.removeFirst()
                val node = nodeById[refId] ?: continue
                val next =
                    when {
                        refId in loopNodes -> depth
                        node.kind == PumlActivityNodeKind.DECISION || node.kind == PumlActivityNodeKind.FORK -> depth + 1
                        node.kind == PumlActivityNodeKind.MERGE || node.kind == PumlActivityNodeKind.JOIN -> depth - 1
                        else -> depth
                    }
                if (next == 0) {
                    if (node.kind == kind) return refId
                    continue
                }
                outgoing[refId].orEmpty().forEach { flow ->
                    val state = flow.targetRefId to next
                    if (seen.add(state)) queue.addLast(state)
                }
            }
            return null
        }
    }
}
