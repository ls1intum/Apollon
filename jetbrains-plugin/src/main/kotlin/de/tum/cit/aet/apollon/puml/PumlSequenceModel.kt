package de.tum.cit.aet.apollon.puml

/**
 * One lifeline. [declared] is false for a participant PlantUML invented from a message line — a
 * sequence diagram does not need declarations, and writing them back for names that never had one
 * would rewrite the top of the user's file on the first save.
 */
data class PumlSequenceParticipant(
    val refId: String,
    val displayName: String,
    val alias: String?,
    val keyword: String,
    val declared: Boolean,
    /** The verbatim `box "…"` header this lifeline was declared under, or `null` at the top level.
     *  A box is a swimlane in the sequence view and has no counterpart on a communication diagram,
     *  so it is reproduced around the declarations rather than drawn. */
    val boxName: String? = null,
)

/**
 * One message, in the order the source sent it. [arrowToken] is kept verbatim because it is the
 * difference between a call and a return (`->` versus `-->`) and Apollon has no field for it.
 */
data class PumlSequenceMessage(
    val sourceRefId: String,
    val targetRefId: String,
    val text: String,
    val arrowToken: String,
)

data class PumlSequenceDiagram(
    val name: String?,
    val participants: List<PumlSequenceParticipant>,
    val messages: List<PumlSequenceMessage>,
    val notes: List<PumlNote> = emptyList(),
)

/** The lifeline keywords PlantUML accepts, longest first so `participant` is not read as `part`. */
val SEQUENCE_PARTICIPANT_KEYWORDS =
    listOf("participant", "collections", "boundary", "database", "control", "entity", "actor", "queue")

/**
 * A message line: two endpoints with an arrow between them and an optional `: text`.
 *
 * Endpoints are matched as "no spaces, or quoted" rather than by a name list, because a sequence
 * diagram may use a participant it never declared. The arrow itself is deliberately matched loosely
 * here and checked properly by [isSequenceArrow] afterwards — PlantUML has upwards of twenty arrow
 * spellings and enumerating them in one regex is how you get a regex nobody can change safely.
 */
val SEQUENCE_MESSAGE = Regex("""^([^\s"]+|"[^"]*")\s*([-<>xo\\/]{2,})\s*([^\s"]+|"[^"]*")\s*(?::\s*(.*))?$""")

private val SEQUENCE_ARROW_SHAPE = Regex("""^(<{1,2}|[\\/xo])?-{1,2}(>{1,2}|[\\/xo])?$""")

fun isSequenceArrow(token: String): Boolean =
    SEQUENCE_ARROW_SHAPE.matches(token) && (token.contains('<') || token.contains('>'))

/** True when the arrow points back at the left-hand endpoint, i.e. the right-hand one is sending. */
fun isSequenceArrowReversed(token: String): Boolean = token.startsWith("<")

/** `box "Client Layer"` … `end box` — a swimlane grouping the lifelines declared between them. */
val SEQUENCE_BOX_OPEN = Regex("""^box\b""", RegexOption.IGNORE_CASE)
val SEQUENCE_BOX_CLOSE = Regex("""^end\s*box$""", RegexOption.IGNORE_CASE)

/** `autonumber`, `autonumber 10 10` — a global numbering directive, not a message. */
val SEQUENCE_AUTONUMBER = Regex("""^autonumber\b""", RegexOption.IGNORE_CASE)

/** Where a line that is neither a declaration nor a message sits: before every message. */
const val SEQUENCE_HEAD_ANCHOR = "#head"

/**
 * Assigns each message the key its trailing lines are filed under in [PumlResidual.anchoredLines].
 *
 * A sequence diagram's `activate`, `alt`/`else`/`end`, `note` and divider lines are all positional:
 * they mean something only in terms of the messages around them, which is why they cannot simply be
 * appended to the file the way an unrecognised class-diagram line can. Anchoring them to the
 * message they follow is what keeps them in place across a save. The occurrence counter is there
 * because the same message may genuinely be sent twice — `DB --> Order: Updated` in each branch of
 * an `alt`, say — and the two must not share an anchor.
 *
 * One instance per pass, and both directions of the converter must walk the messages in the same
 * order for the keys to line up.
 */
class SequenceAnchorKeys {
    private val seen = mutableMapOf<String, Int>()

    fun next(message: PumlSequenceMessage): String {
        val base = "${message.sourceRefId}|${message.targetRefId}|${message.text}"
        val occurrence = seen.getOrDefault(base, 0)
        seen[base] = occurrence + 1
        return "$base#$occurrence"
    }
}
