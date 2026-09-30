package de.tum.cit.aet.apollon.puml

/**
 * The exact inverse of [PlantUmlSequenceImporter] — see [PlantUmlExporter] (Class) for the
 * determinism contract this mirrors.
 *
 * Only participants that were declared in the source get a declaration line back; the ones PlantUML
 * invented from a message stay invented, so a file that opened with no `participant` lines does not
 * grow a block of them the first time it is saved.
 */
object PlantUmlSequenceExporter {
    fun render(
        diagram: PumlSequenceDiagram,
        residual: PumlResidual,
    ): String {
        val lines = mutableListOf<String>()
        lines += residual.startLine
        lines += residual.preamble
        lines += declarationLines(diagram, residual)
        lines += messageLines(diagram, residual)

        lines += PumlNotes.render(diagram.notes, residual.indent.ifEmpty { "  " }, diagram.participants.map { it.refId }.toSet())
        lines += residual.unsupported
        lines += residual.postamble
        lines += residual.endLine
        val eol = residual.eol.ifEmpty { "\n" }
        return lines.joinToString(eol) + eol
    }

    /**
     * The lifeline block. Reproduced from the source verbatim — `box` swimlanes, indentation and
     * blank lines and all — while it still declares exactly the lifelines the canvas holds, since
     * that is the only way a diagram nobody edited comes back byte for byte. Once the canvas has
     * added, removed or renamed one, the block is regenerated instead, and the boxes are rebuilt
     * around whichever lifelines are still in them.
     */
    private fun declarationLines(
        diagram: PumlSequenceDiagram,
        residual: PumlResidual,
    ): List<String> {
        val boxByRefId = readDeclarations(residual.sequenceHeader).associate { it.refId to it.boxName }
        // The model has no field for a box, so the source's own grouping is what says where each
        // lifeline belongs; one the canvas has just created belongs to no box.
        val declared = diagram.participants.filter { it.declared }.map { it.copy(boxName = boxByRefId[it.refId]) }
        if (residual.sequenceHeader.isNotEmpty() && readDeclarations(residual.sequenceHeader) == declared) {
            return residual.sequenceHeader
        }

        val indent = residual.indent.ifEmpty { "  " }
        val lines = mutableListOf<String>()
        var openBox: String? = null
        declared.forEach { participant ->
            if (participant.boxName != openBox) {
                if (openBox != null) lines += "end box"
                openBox = participant.boxName
                openBox?.let { lines += it }
            }
            val header = renderDeclarationHeader(participant.keyword, participant.displayName, participant.alias)
            lines += if (openBox != null) indent + header else header
        }
        if (openBox != null) lines += "end box"
        return lines
    }

    /**
     * The message stream, with every line the canvas could not model put back where it stood.
     *
     * Anchors are walked in the order they were read, not looked up one by one: an anchor whose own
     * message the canvas has since deleted is flushed out with the next surviving message instead
     * of being dropped or shunted to the end of the file. That keeps an `activate` or an `alt` next
     * to the message that now precedes it rather than stranding it after the `end` that closes it.
     */
    private fun messageLines(
        diagram: PumlSequenceDiagram,
        residual: PumlResidual,
    ): List<String> {
        val lines = mutableListOf<String>()
        val order = residual.anchoredLines.keys.toList()
        var cursor = 0

        fun flushThrough(last: Int) {
            while (cursor <= last) {
                lines += residual.anchoredLines.getValue(order[cursor]).split("\n")
                cursor++
            }
        }

        if (order.firstOrNull() == SEQUENCE_HEAD_ANCHOR) flushThrough(0)

        val anchorKeys = SequenceAnchorKeys()
        diagram.messages.forEach { message ->
            val key = anchorKeys.next(message)
            // The source's own line wins while it still says the same thing: the key already
            // fixes the endpoints and the text, so only the arrow can have changed underneath it.
            val verbatim = residual.messageLines[key]?.takeIf { arrowIn(it) == message.arrowToken }
            lines += verbatim ?: renderMessage(message)
            val index = order.indexOf(key)
            if (index >= cursor) flushThrough(index)
        }
        flushThrough(order.size - 1)
        return lines
    }

    private fun arrowIn(line: String): String? =
        SEQUENCE_MESSAGE.find(line.trim())?.groupValues?.get(2)?.takeIf { isSequenceArrow(it) }

    private fun renderMessage(message: PumlSequenceMessage): String {
        val arrow = message.arrowToken.ifBlank { "->" }
        // A reversed arrow is written the way it was read: right-hand endpoint first, so
        // `B <- A` comes back as `B <- A` rather than being normalised to `A -> B`.
        val ends =
            if (isSequenceArrowReversed(arrow)) {
                "${quote(message.targetRefId)} $arrow ${quote(message.sourceRefId)}"
            } else {
                "${quote(message.sourceRefId)} $arrow ${quote(message.targetRefId)}"
            }
        return if (message.text.isEmpty()) ends else "$ends : ${message.text}"
    }

    /** The lifelines a declaration block declares, with the `box` each sits in — the read side of
     *  [declarationLines], and the same scan [PlantUmlSequenceImporter] makes over the whole body. */
    private fun readDeclarations(header: List<String>): List<PumlSequenceParticipant> {
        val participants = mutableListOf<PumlSequenceParticipant>()
        var currentBox: String? = null
        header.forEach { raw ->
            val trimmed = raw.trim()
            when {
                SEQUENCE_BOX_OPEN.containsMatchIn(trimmed) -> currentBox = trimmed
                SEQUENCE_BOX_CLOSE.matches(trimmed) -> currentBox = null
                else ->
                    matchDeclaration(PARTICIPANT_DECL, trimmed)?.takeIf { !it.opensBody }?.let { declaration ->
                        participants +=
                            PumlSequenceParticipant(
                                refId = declaration.alias ?: declaration.displayName,
                                displayName = declaration.displayName,
                                alias = declaration.alias,
                                keyword = declaration.keyword,
                                declared = true,
                                boxName = currentBox,
                            )
                    }
            }
        }
        return participants
    }

    private fun quote(refId: String): String = PumlRelationGrammar.quoteIfNeeded(refId)
}
