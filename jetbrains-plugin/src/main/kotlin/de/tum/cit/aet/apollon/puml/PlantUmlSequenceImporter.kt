package de.tum.cit.aet.apollon.puml

/** Shared with [PlantUmlSequenceExporter], which re-reads a declaration block to decide whether it
 *  still matches the canvas. */
internal val PARTICIPANT_DECL = declarationRegex(SEQUENCE_PARTICIPANT_KEYWORDS.joinToString("|"))

sealed interface PumlSequenceParseResult {
    data class Rejected(val reason: String) : PumlSequenceParseResult

    data class Parsed(val diagram: PumlSequenceDiagram, val residual: PumlResidual, val unsupportedCount: Int) : PumlSequenceParseResult
}

/**
 * `.puml` text -> [PumlSequenceDiagram] + [PumlResidual].
 *
 * A sequence diagram is the one family Apollon has no canvas for — and does not need one, because
 * UML says a sequence diagram and a communication diagram are two views of the same interaction.
 * So this reads the lifelines and the messages between them and [SequenceModelMapper] draws them as
 * a communication diagram: the same participants, one link per pair that talks, and the messages
 * numbered along it. That is why the Edit tab does not look like the View tab for this family, and
 * it is the only reason it can be edited at all.
 *
 * Time order is the thing that must not be lost. A communication diagram has no time axis, which is
 * exactly why UML numbers its messages — so the numbers are not decoration here, they are where the
 * ordering lives once the diagram is on the canvas. See [SequenceModelMapper].
 *
 * **Everything else is kept where it is.** `activate`/`deactivate`, `alt`/`else`/`end`, `note`,
 * dividers, delays, `ref over` — none of them has a communication-diagram counterpart, and all of
 * them mean something only in terms of the messages around them. They used to make this importer
 * reject the whole file, because appending them to the end (the way an unrecognised class-diagram
 * line is appended) would have moved a fragment's brackets away from what they bracket. They are
 * now anchored to the message they follow instead, through [PumlResidual.anchoredLines], so the
 * file both opens and comes back unchanged. The lifeline declarations, `box` swimlanes included,
 * are kept as one verbatim block in [PumlResidual.sequenceHeader] for the same reason.
 *
 * The hazard this leaves is worth stating: reorder the messages on the canvas and an `alt` bracket
 * stays anchored to its own message, so it may end up bracketing a different span. That is visible
 * in the Text tab, and it is the price of the file being editable at all.
 */
object PlantUmlSequenceImporter {
    fun parse(text: String): PumlSequenceParseResult {
        val envelope = PumlEnvelopeReader.read(text) ?: return PumlSequenceParseResult.Rejected("does not contain an @startuml block")
        val name = envelope.startLine.removePrefix("@startuml").trim().ifEmpty { null }

        val participants = mutableListOf<PumlSequenceParticipant>()
        val byRefId = mutableMapOf<String, Int>()
        val messages = mutableListOf<PumlSequenceMessage>()
        val preamble = mutableListOf<String>()
        val header = mutableListOf<String>()
        val anchored = LinkedHashMap<String, MutableList<String>>()
        val messageLines = mutableMapOf<String, String>()
        val anchorKeys = SequenceAnchorKeys()
        var anchor = SEQUENCE_HEAD_ANCHOR
        var currentBox: String? = null
        var sawMessage = false

        /** Records a participant a message referred to without declaring. */
        fun implicit(rawName: String): String {
            val displayName = rawName.removeSurrounding("\"")
            val refId = displayName
            if (byRefId[refId] == null) {
                byRefId[refId] = participants.size
                participants += PumlSequenceParticipant(refId, displayName, null, "participant", declared = false)
            }
            return refId
        }

        for (raw in envelope.body) {
            val trimmed = raw.trim()

            // A blank or a global directive belongs to whichever region it sits in: the file's own
            // head while nothing has been declared yet, the declaration block once it has started,
            // and the message stream after that.
            if (!sawMessage && (trimmed.isEmpty() || isTierALine(trimmed) || SEQUENCE_AUTONUMBER.containsMatchIn(trimmed))) {
                if (header.isEmpty()) preamble += raw else header += raw
                continue
            }

            if (!sawMessage && SEQUENCE_BOX_OPEN.containsMatchIn(trimmed)) {
                header += raw
                currentBox = trimmed
                continue
            }
            if (!sawMessage && SEQUENCE_BOX_CLOSE.matches(trimmed)) {
                header += raw
                currentBox = null
                continue
            }

            val declaration = matchDeclaration(PARTICIPANT_DECL, trimmed)
            if (declaration != null && !declaration.opensBody) {
                if (!sawMessage) header += raw
                val refId = declaration.alias ?: declaration.displayName
                val participant =
                    PumlSequenceParticipant(
                        refId,
                        declaration.displayName,
                        declaration.alias,
                        declaration.keyword,
                        declared = true,
                        boxName = currentBox,
                    )
                // A declaration after first use replaces the participant the message invented,
                // keeping its position: that is the order PlantUML draws the lifelines in.
                byRefId[refId]?.let { participants[it] = participant } ?: run {
                    byRefId[refId] = participants.size
                    participants += participant
                }
                continue
            }

            val message = SEQUENCE_MESSAGE.find(trimmed)
            val arrow = message?.groupValues?.get(2)
            if (message != null && arrow != null && isSequenceArrow(arrow)) {
                sawMessage = true
                val left = implicit(message.groupValues[1])
                val right = implicit(message.groupValues[3])
                val body = message.groupValues[4].trim()
                val parsed =
                    if (isSequenceArrowReversed(arrow)) {
                        PumlSequenceMessage(right, left, body, arrow)
                    } else {
                        PumlSequenceMessage(left, right, body, arrow)
                    }
                messages += parsed
                anchor = anchorKeys.next(parsed)
                messageLines[anchor] = raw
                continue
            }

            anchored.getOrPut(anchor) { mutableListOf() } += raw
        }

        if (participants.isEmpty()) return PumlSequenceParseResult.Rejected("contains no participants or messages")

        val residual =
            PumlResidual(
                startLine = envelope.startLine,
                endLine = envelope.endLine,
                eol = envelope.eol,
                indent = envelope.indent,
                preamble = preamble,
                sequenceHeader = header,
                messageLines = messageLines,
                anchoredLines = anchored.mapValues { (_, lines) -> lines.joinToString("\n") },
            )
        return PumlSequenceParseResult.Parsed(
            PumlSequenceDiagram(name, participants, messages),
            residual,
            anchored.values.sumOf { lines -> lines.count { it.isNotBlank() } },
        )
    }
}
