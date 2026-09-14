package de.tum.cit.aet.apollon.puml

/**
 * What a node in an activity flow *is*. Unlike every other family this is not read off a keyword:
 * PlantUML's activity syntax has no declarations at all, only structure, so [PlantUmlActivityImporter]
 * derives the kind from the construct a line opens.
 *
 * [DECISION]/[MERGE] and [FORK]/[JOIN] are the same shape drawn twice — a diamond and a bar — and
 * Apollon models each pair with a single node type. Which of the two a given box is, is therefore
 * never stored: it is recomputed from the node's degree every time (more than one outgoing flow
 * makes it the opening half). See [ActivityModelMapper].
 */
enum class PumlActivityNodeKind { INITIAL, FINAL, ACTION, DECISION, MERGE, FORK, JOIN }

/**
 * One box in an activity flow. [refId] exists only to wire [PumlActivityFlow]s up and is
 * synthesised (`n1`, `n2`, …) in flow order — activity syntax has nothing resembling an alias, so
 * unlike Class or C4 there is no source identifier to preserve, and the ids are regenerated from
 * scratch on every export.
 *
 * [keyword] is kept for the places PlantUML offers a choice the canvas has no field for: a final node
 * is written `stop` or `end`, a parallel block `fork` or `split`, an *n*-way branch `switch` rather
 * than a chain of `if`s, and a strand that ends without a final node `detach` or `kill` — that last
 * one rides on the step it follows, since it is precisely the absence of a node. Which of these
 * spellings a given kind may carry is enforced in one place, `ActivityModelMapper.keywordFits`, so a
 * box the canvas turned from a fork into a join drops the spelling instead of writing a lie.
 */
data class PumlActivityNode(
    val refId: String,
    val label: String,
    val kind: PumlActivityNodeKind,
    val keyword: String? = null,
)

/** A control flow. [label] is the branch label — `then (yes)`, `else (no)`, or an explicit
 *  `->text;` arrow label — and renders on the arrow. */
data class PumlActivityFlow(
    val sourceRefId: String,
    val targetRefId: String,
    val label: String = "",
)

data class PumlActivityDiagram(
    val name: String?,
    val nodes: List<PumlActivityNode>,
    val flows: List<PumlActivityFlow>,
    val notes: List<PumlNote> = emptyList(),
)

/**
 * Builds the node/flow graph as [PlantUmlActivityImporter] walks the structured source, and as
 * [ActivityModelMapper] walks the canvas model. Keeping the id counter here is what makes both
 * directions produce the same ids for the same shape, which is what makes an untouched round trip
 * byte-identical.
 */
class PumlActivityGraphBuilder {
    private val nodeList = mutableListOf<PumlActivityNode>()
    private val flowList = mutableListOf<PumlActivityFlow>()
    private var counter = 0

    val nodes: List<PumlActivityNode> get() = nodeList
    val flows: List<PumlActivityFlow> get() = flowList

    fun add(
        kind: PumlActivityNodeKind,
        label: String = "",
        keyword: String? = null,
    ): String {
        val refId = "n${++counter}"
        nodeList += PumlActivityNode(refId, label, kind, keyword)
        return refId
    }

    /** Records the `end fork`/`end merge` spelling on a join bar that had to be created before its
     *  closing line was read. */
    fun retag(
        refId: String,
        keyword: String,
    ) {
        val index = nodeList.indexOfFirst { it.refId == refId }
        if (index >= 0) nodeList[index] = nodeList[index].copy(keyword = keyword)
    }

    /** No-op when [from] is `null` — the flow after a `stop` is genuinely dead, and the next line
     *  starts a fresh, unattached strand rather than continuing from the final node. */
    fun link(
        from: String?,
        to: String,
        label: String = "",
    ) {
        if (from == null) return
        flowList += PumlActivityFlow(from, to, label)
    }
}

/** Outgoing flows per node, in declaration order. */
fun List<PumlActivityFlow>.outgoingBy(): Map<String, List<PumlActivityFlow>> = groupBy { it.sourceRefId }

/** Incoming flows per node, in declaration order. */
fun List<PumlActivityFlow>.incomingBy(): Map<String, List<PumlActivityFlow>> = groupBy { it.targetRefId }

/**
 * A `partition`/`group` block: a labelled box drawn around a run of steps that changes nothing about
 * the flow through them.
 *
 * The canvas has no element for one, so it is preserved rather than modelled — but unlike a stray
 * line it is a *bracket*, and half of a bracket is a syntax error. So it is stored as its two halves
 * plus the steps that were inside, and [PlantUmlActivityExporter] writes both halves or neither: it
 * opens the block before the first surviving member and closes it after the last, so deleting some
 * of the steps shrinks the partition around the rest. Deleting *all* of them leaves it nowhere to go,
 * which [RoundTripValidator] refuses rather than dropping.
 */
data class PumlActivitySpan(
    val open: String,
    val close: String,
    /** Anchor keys, in source order. */
    val members: List<String>,
)

/** The pseudo-anchor for lines that stood after the last step. */
const val ACTIVITY_TAIL_ANCHOR = "#tail"

/**
 * Which side of a step a preserved line belongs on.
 *
 * Both are needed, and one bucket would get one of them wrong at every block boundary. A swimlane
 * marker applies from where it stands onwards, so it has to come *before* the step that follows it;
 * a `note` attaches to whatever precedes it, so it has to come *after* the step it was written
 * under. Anchor a note to the next step instead and the last note in an `if` branch reappears at the
 * top of the `else`, attached to the wrong activity.
 */
fun activityAnchorBefore(key: String) = "before:$key"

fun activityAnchorAfter(key: String) = "after:$key"

/**
 * Which anchor bucket a step falls in. A decision and a merge share one, and so do a fork and a
 * join, because which half of the pair a box is, is recomputed from its degree
 * ([ActivityModelMapper]) and flips the moment the canvas adds or removes a branch — an anchor that
 * moved with it would strand whatever was attached.
 */
private fun anchorGroup(kind: PumlActivityNodeKind): String =
    when (kind) {
        PumlActivityNodeKind.DECISION, PumlActivityNodeKind.MERGE -> "branch"
        PumlActivityNodeKind.FORK, PumlActivityNodeKind.JOIN -> "bar"
        else -> kind.name.lowercase()
    }

/**
 * refId -> a key that identifies the same step across an import, a canvas session and an export.
 *
 * [PumlActivityNode.refId] cannot do this itself: it is synthesised in flow order and regenerated
 * from scratch every export, so `n4` is a different step the moment anything is inserted. Kind group
 * + label + how many of that pair came before survives, and is the same shape
 * `ActivityModelMapper.geometryKey` already uses to carry positions across the same gap.
 */
fun List<PumlActivityNode>.anchorKeys(): Map<String, String> {
    val seen = mutableMapOf<String, Int>()
    return associate { node ->
        val base = "${anchorGroup(node.kind)}|${node.label}"
        val occurrence = seen.getOrDefault(base, 0)
        seen[base] = occurrence + 1
        node.refId to "$base#$occurrence"
    }
}

/**
 * A cycle in the flow, in the two shapes PlantUML can write one: [isRepeat] false is
 * `while (c) … endwhile`, where the test is at the top, and true is `repeat … repeat while (c)`,
 * where it is at the bottom.
 *
 * [headRefId] is the merge diamond the loop comes back to, [latchRefId] the step the back edge
 * leaves from, and [testRefId] the decision that decides whether to go round again.
 */
data class PumlActivityLoop(
    val headRefId: String,
    val testRefId: String,
    val latchRefId: String,
    val isRepeat: Boolean,
)

/**
 * The flows that close a cycle, found by depth-first search: an edge to a node still on the search
 * stack is a back edge, an edge to one already finished is not.
 *
 * Reachability is the tempting shortcut and is wrong. "The target can reach the source" is true of
 * the *forward* edge from a loop head into the loop body as well as of the back edge, so it would
 * report both and leave no way to tell which way round the loop goes.
 */
fun PumlActivityDiagram.backFlows(): Set<PumlActivityFlow> {
    val outgoing = flows.outgoingBy()
    val incoming = flows.incomingBy()
    val onStack = mutableSetOf<String>()
    val finished = mutableSetOf<String>()
    val back = mutableSetOf<PumlActivityFlow>()

    fun visit(refId: String) {
        onStack += refId
        outgoing[refId].orEmpty().forEach { flow ->
            when (flow.targetRefId) {
                in onStack -> back += flow
                !in finished -> visit(flow.targetRefId)
            }
        }
        onStack -= refId
        finished += refId
    }

    nodes.filter { incoming[it.refId].isNullOrEmpty() }.forEach { if (it.refId !in finished) visit(it.refId) }
    nodes.forEach { if (it.refId !in finished) visit(it.refId) }
    return back
}

/**
 * The loops the flow contains, one per back edge.
 *
 * The head's own successor settles which shape it is: a merge that runs straight into a decision is
 * a `while`, because that decision is the loop's test; a merge that runs into ordinary steps is a
 * `repeat`, and its test is the decision the back edge leaves from. A back edge into anything other
 * than a merge diamond is a cycle no `while`/`repeat` can express, and is left out so that
 * [PlantUmlActivityExporter] falls back to dropping it and [RoundTripValidator] refuses the save.
 */
fun PumlActivityDiagram.loops(): List<PumlActivityLoop> {
    val outgoing = flows.outgoingBy()
    val byRefId = nodes.associateBy { it.refId }
    return backFlows().mapNotNull { back ->
        val head = byRefId[back.targetRefId]?.takeIf { it.kind == PumlActivityNodeKind.MERGE } ?: return@mapNotNull null
        val successor = outgoing[head.refId]?.singleOrNull()?.targetRefId?.let { byRefId[it] }
        val isTest = { node: PumlActivityNode? ->
            node != null && node.kind == PumlActivityNodeKind.DECISION && outgoing[node.refId].orEmpty().size >= 2
        }
        when {
            isTest(successor) -> PumlActivityLoop(head.refId, successor!!.refId, back.sourceRefId, isRepeat = false)
            isTest(byRefId[back.sourceRefId]) -> PumlActivityLoop(head.refId, back.sourceRefId, back.sourceRefId, isRepeat = true)
            else -> null
        }
    }
}
