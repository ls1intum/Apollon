package de.tum.cit.aet.apollon.puml

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID
import kotlin.math.abs

/** Apollon's general UML note. The type string reads `colorDescription` for historical reasons —
 *  see the comment on `ColorDescriptionConfig` in `library/lib/constants.ts`. */
const val NOTE_NODE_TYPE = "colorDescription"

/** The dashed, arrowless edge that ties a note to the element it annotates. */
const val NOTE_EDGE_TYPE = "NoteLink"

private const val NOTE_WIDTH = 160
private const val NOTE_HEIGHT = 50

/** Distance between a freshly placed note and the element it annotates. */
private const val NOTE_GAP = 60

/** Which side of its anchor a `note <side> of X` is drawn on. */
enum class NoteSide(val keyword: String) {
    LEFT("left"),
    RIGHT("right"),
    TOP("top"),
    BOTTOM("bottom"),
    ;

    companion object {
        fun of(keyword: String): NoteSide? = entries.firstOrNull { it.keyword == keyword.lowercase() }
    }
}

/**
 * A PlantUML `note` — free text about the diagram, optionally anchored to elements in it.
 *
 * Anchored to *names*, not ids, for the same reason [PumlLayoutSidecar] keys geometry by name:
 * every import mints fresh node ids, so a name is the only handle that survives a round trip.
 * [side] is only meaningful with exactly one attachment; it decides between PlantUML's
 * `note right of X` (which renders beside `X`) and the free `note as N1` + `N1 .. X` form.
 */
data class PumlNote(
    val text: String,
    val attachments: List<String> = emptyList(),
    val side: NoteSide = NoteSide.RIGHT,
)

private val NOTE_ALIAS_INLINE = Regex("""^note\s+"([^"]*)"\s+as\s+([A-Za-z_]\w*)\s*$""", RegexOption.IGNORE_CASE)
private val NOTE_ALIAS_DECL = Regex("""^note\s+as\s+([A-Za-z_]\w*)\s*$""", RegexOption.IGNORE_CASE)
private val NOTE_OF_INLINE =
    Regex("""^note\s+(left|right|top|bottom)\s+of\s+(?:"([^"]+)"|([A-Za-z_][\w.$]*))\s*:\s*(.*)$""", RegexOption.IGNORE_CASE)
private val NOTE_OF_DECL =
    Regex("""^note\s+(left|right|top|bottom)\s+of\s+(?:"([^"]+)"|([A-Za-z_][\w.$]*))\s*$""", RegexOption.IGNORE_CASE)
private val NOTE_LINK = Regex("""^([A-Za-z_]\w*)\s*\.\.+\s*(?:"([^"]+)"|([A-Za-z_][\w.$]*))\s*$""")
private val NOTE_LINK_REVERSED = Regex("""^(?:"([^"]+)"|([A-Za-z_][\w.$]*))\s*\.\.+\s*([A-Za-z_]\w*)\s*$""")
private val END_NOTE = Regex("""^end\s*note\s*$""", RegexOption.IGNORE_CASE)

private fun obj(e: JsonElement?) = e as? JsonObject

private fun arr(e: JsonElement?) = e as? JsonArray

private fun text(e: JsonElement?) = (e as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun number(e: JsonElement?): Int? = (e as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt()

/**
 * The note half of a line-oriented PlantUML importer, factored out because every family's
 * importer needs exactly the same four forms and the same alias bookkeeping.
 *
 * Drive it from the importer's own `for (raw in body)` loop: hand each trimmed line to [consume]
 * *before* the family's own declaration and relation parsing — a `N1 .. Order` anchor line is
 * otherwise a perfectly good dashed relation, and `end note` is not a line any grammar should be
 * guessing at. A `true` result means the line was note syntax and the loop should move on.
 */
class PumlNoteReader {
    private class Draft(
        var text: String = "",
        val attachments: MutableList<String> = mutableListOf(),
        var side: NoteSide = NoteSide.RIGHT,
    )

    private val drafts = mutableListOf<Draft>()
    private val byAlias = mutableMapOf<String, Draft>()
    private val body = mutableListOf<String>()
    private var open: Draft? = null

    /** Whether an `end note` is still outstanding — the importer must not treat the lines in
     *  between as anything else, however much they look like it. */
    val isInsideNote: Boolean get() = open != null

    fun consume(trimmed: String): Boolean {
        val current = open
        if (current != null) {
            if (END_NOTE.matches(trimmed)) {
                current.text = body.joinToString("\n").trim('\n')
                body.clear()
                open = null
            } else {
                body += trimmed
            }
            return true
        }

        NOTE_ALIAS_INLINE.find(trimmed)?.let { match ->
            byAlias[match.groupValues[2]] = start(Draft(text = unescape(match.groupValues[1])))
            return true
        }
        NOTE_ALIAS_DECL.find(trimmed)?.let { match ->
            val draft = start(Draft())
            byAlias[match.groupValues[1]] = draft
            open = draft
            return true
        }
        NOTE_OF_INLINE.find(trimmed)?.let { match ->
            start(
                Draft(
                    text = unescape(match.groupValues[4].trim()),
                    attachments = mutableListOf(nameIn(match, 2, 3)),
                    side = NoteSide.of(match.groupValues[1]) ?: NoteSide.RIGHT,
                ),
            )
            return true
        }
        NOTE_OF_DECL.find(trimmed)?.let { match ->
            open =
                start(
                    Draft(
                        attachments = mutableListOf(nameIn(match, 2, 3)),
                        side = NoteSide.of(match.groupValues[1]) ?: NoteSide.RIGHT,
                    ),
                )
            return true
        }
        // Only claimed once the alias is known to be a note's, so `A .. B` between two classes
        // stays the family's own dashed relation.
        NOTE_LINK.find(trimmed)?.let { match ->
            val draft = byAlias[match.groupValues[1]] ?: return@let
            draft.attachments += nameIn(match, 2, 3)
            return true
        }
        NOTE_LINK_REVERSED.find(trimmed)?.let { match ->
            val draft = byAlias[match.groupValues[3]] ?: return@let
            draft.attachments += nameIn(match, 1, 2)
            return true
        }
        return false
    }

    /**
     * The notes read so far. Call once, after the body loop: an unterminated block is closed with
     * whatever it had, on the same "keep the user's text" principle as the rest of the importer.
     * Textless notes are dropped — there is nothing for the canvas to show and nothing to write
     * back, so carrying one would only add an empty box on every open.
     */
    fun result(): List<PumlNote> {
        open?.let { draft ->
            draft.text = body.joinToString("\n").trim('\n')
            body.clear()
            open = null
        }
        return drafts.filter { it.text.isNotBlank() }.map { PumlNote(it.text, it.attachments.toList(), it.side) }
    }

    private fun start(draft: Draft): Draft {
        drafts += draft
        return draft
    }

    private fun nameIn(
        match: MatchResult,
        quotedGroup: Int,
        bareGroup: Int,
    ): String = match.groupValues[quotedGroup].ifEmpty { match.groupValues[bareGroup] }

    private fun unescape(raw: String): String = raw.replace("\\n", "\n")
}

object PumlNotes {
    /**
     * `note` declarations for [notes], plus the anchor lines the alias form needs.
     *
     * A note anchored to exactly one element keeps PlantUML's `note <side> of X` form, so the
     * View tab's own layout engine draws it beside that element; everything else — floating notes
     * and notes covering several elements — gets an alias and one `alias .. target` line each.
     * [taken] are the names already declared in the diagram, so a generated alias cannot collide
     * with a class the user happens to have called `N1`.
     */
    fun render(
        notes: List<PumlNote>,
        indent: String,
        taken: Set<String>,
    ): List<String> {
        if (notes.isEmpty()) return emptyList()
        val lines = mutableListOf<String>()
        val used = taken.toMutableSet()
        notes.forEach { note ->
            val anchor = note.attachments.singleOrNull()
            if (anchor != null) {
                lines += anchored("note ${note.side.keyword} of ${quote(anchor)}", note.text, indent)
                return@forEach
            }
            val alias = nextAlias(used)
            lines += aliased(alias, note.text, indent)
            note.attachments.forEach { target -> lines += "$alias .. ${quote(target)}" }
        }
        return lines
    }

    /**
     * The notes in a canvas model: every [NOTE_NODE_TYPE] node, anchored to whatever its
     * [NOTE_EDGE_TYPE] edges reach. [nameById] maps the *modelled* elements' node ids to the names
     * they are declared under, so an anchor to something that is not in the PlantUML — another
     * note, say — is simply left off rather than producing a dangling reference.
     */
    fun fromModel(
        model: JsonObject,
        nameById: Map<String, String>,
    ): List<PumlNote> {
        val nodes = arr(model["nodes"])?.mapNotNull { obj(it) } ?: emptyList()
        val noteNodes = nodes.filter { text(it["type"]) == NOTE_NODE_TYPE }
        if (noteNodes.isEmpty()) return emptyList()

        val rects = absoluteRects(nodes)
        val attachmentsByNote = mutableMapOf<String, MutableList<String>>()
        arr(model["edges"])?.mapNotNull { obj(it) }?.forEach { edge ->
            if (text(edge["type"]) != NOTE_EDGE_TYPE) return@forEach
            val source = text(edge["source"]) ?: return@forEach
            val target = text(edge["target"]) ?: return@forEach
            // Either end may be the note — the canvas lets a connection start from either box.
            val noteId = if (nameById.containsKey(target)) source else target
            val otherId = if (noteId == source) target else source
            val name = nameById[otherId] ?: return@forEach
            attachmentsByNote.getOrPut(noteId) { mutableListOf() }.add(name)
        }

        return noteNodes.mapNotNull { node ->
            val id = text(node["id"]) ?: return@mapNotNull null
            val body = PumlName.forNote(text(obj(node["data"])?.get("name"))) ?: return@mapNotNull null
            val attachments = attachmentsByNote[id].orEmpty().distinct()
            val side =
                attachments.singleOrNull()
                    ?.let { name -> nameById.entries.firstOrNull { it.value == name }?.key }
                    ?.let { anchorId -> sideOf(rects[id], rects[anchorId]) }
                    ?: NoteSide.RIGHT
            PumlNote(body, attachments, side)
        }
    }

    /**
     * Note nodes and their anchor edges for a freshly imported diagram, merged against the
     * previous model exactly the way [ApollonModelMapper] merges classifiers: a note is identified
     * by its text, so editing the diagram around it keeps its id, position, size and colours.
     *
     * A note the source has just introduced is placed beside the element it annotates, on the side
     * PlantUML says it is on — which is also the side the exporter will read back off the canvas.
     */
    fun emit(
        notes: List<PumlNote>,
        anchorIdOf: (String) -> String?,
        rectById: Map<String, Rect>,
        previousNote: (String) -> JsonObject?,
        previousAnchorEdge: (String, String) -> JsonObject?,
        fallbackOrigin: Point,
    ): Pair<List<JsonObject>, List<JsonObject>> {
        if (notes.isEmpty()) return emptyList<JsonObject>() to emptyList()
        val newNodes = mutableListOf<JsonObject>()
        val newEdges = mutableListOf<JsonObject>()
        val fallbacks = PumlLayout.gridPositions(notes.size, fallbackOrigin.x, fallbackOrigin.y).iterator()

        notes.forEach { note ->
            val existing = previousNote(note.text)
            val noteId = existing?.let { text(it["id"]) } ?: UUID.randomUUID().toString()
            val anchorRect = note.attachments.singleOrNull()?.let { anchorIdOf(it) }?.let { rectById[it] }
            val width = existing?.let { number(it["width"]) } ?: NOTE_WIDTH
            val height = existing?.let { number(it["height"]) } ?: NOTE_HEIGHT
            val position =
                obj(existing?.get("position")) ?: beside(anchorRect, note.side, width, height, fallbacks)
            val existingData = existing?.let { obj(it["data"]) }
            newNodes +=
                buildJsonObject {
                    put("id", noteId)
                    put("width", width)
                    put("height", height)
                    put("type", NOTE_NODE_TYPE)
                    put("position", position)
                    put(
                        "data",
                        buildJsonObject {
                            put("name", note.text)
                            existingData?.get("fillColor")?.let { put("fillColor", it) }
                            existingData?.get("strokeColor")?.let { put("strokeColor", it) }
                            existingData?.get("textColor")?.let { put("textColor", it) }
                        },
                    )
                    put("measured", buildJsonObject { put("width", width); put("height", height) })
                }
            val noteRect = Rect(number(position["x"]) ?: 0, number(position["y"]) ?: 0, width, height)

            note.attachments.forEach { target ->
                val targetId = anchorIdOf(target) ?: return@forEach
                val existingEdge = previousAnchorEdge(note.text, target)
                val handles =
                    if (existingEdge != null) {
                        (text(existingEdge["sourceHandle"]) ?: "bottom") to (text(existingEdge["targetHandle"]) ?: "top")
                    } else {
                        rectById[targetId]?.let { PumlLayout.chooseHandles(noteRect, it) } ?: ("bottom" to "top")
                    }
                val existingEdgeData = existingEdge?.let { obj(it["data"]) }
                newEdges +=
                    buildJsonObject {
                        put("id", existingEdge?.let { text(it["id"]) } ?: UUID.randomUUID().toString())
                        put("source", noteId)
                        put("target", targetId)
                        put("type", NOTE_EDGE_TYPE)
                        put("sourceHandle", handles.first)
                        put("targetHandle", handles.second)
                        put(
                            "data",
                            buildJsonObject {
                                put("points", existingEdgeData?.get("points") ?: buildJsonArray {})
                                existingEdgeData?.get("strokeColor")?.let { put("strokeColor", it) }
                                existingEdgeData?.get("textColor")?.let { put("textColor", it) }
                            },
                        )
                    }
            }
        }
        return newNodes to newEdges
    }

    /** Node rectangles in canvas coordinates. A child's stored position is relative to its
     *  container, so a note beside a class inside a package would otherwise compare against the
     *  wrong origin and pick the wrong side. */
    private fun absoluteRects(nodes: List<JsonObject>): Map<String, Rect> {
        val byId = nodes.mapNotNull { node -> text(node["id"])?.let { it to node } }.toMap()
        val resolved = mutableMapOf<String, Rect>()

        fun rectOf(id: String): Rect? {
            resolved[id]?.let { return it }
            val node = byId[id] ?: return null
            val position = obj(node["position"])
            var x = number(position?.get("x")) ?: 0
            var y = number(position?.get("y")) ?: 0
            // Guarded against a parent chain that points back at itself, which a hand-edited
            // model could contain and which would otherwise recurse forever.
            val parentId = text(node["parentId"])?.takeIf { it != id }
            parentId?.let { rectOf(it) }?.let { parent ->
                x += parent.x
                y += parent.y
            }
            val rect = Rect(x, y, number(node["width"]) ?: 0, number(node["height"]) ?: 0)
            resolved[id] = rect
            return rect
        }

        byId.keys.forEach { rectOf(it) }
        return resolved
    }

    private fun sideOf(
        note: Rect?,
        anchor: Rect?,
    ): NoteSide {
        if (note == null || anchor == null) return NoteSide.RIGHT
        val dx = note.centerX - anchor.centerX
        val dy = note.centerY - anchor.centerY
        return if (abs(dx) >= abs(dy)) {
            if (dx >= 0) NoteSide.RIGHT else NoteSide.LEFT
        } else {
            if (dy >= 0) NoteSide.BOTTOM else NoteSide.TOP
        }
    }

    private fun beside(
        anchor: Rect?,
        side: NoteSide,
        width: Int,
        height: Int,
        fallbacks: Iterator<Point>,
    ): JsonObject {
        val point =
            if (anchor == null) {
                if (fallbacks.hasNext()) fallbacks.next() else Point(60, 60)
            } else {
                when (side) {
                    NoteSide.LEFT -> Point(anchor.x - width - NOTE_GAP, anchor.centerY - height / 2)
                    NoteSide.RIGHT -> Point(anchor.x + anchor.width + NOTE_GAP, anchor.centerY - height / 2)
                    NoteSide.TOP -> Point(anchor.centerX - width / 2, anchor.y - height - NOTE_GAP)
                    NoteSide.BOTTOM -> Point(anchor.centerX - width / 2, anchor.y + anchor.height + NOTE_GAP)
                }
            }
        return buildJsonObject { put("x", point.x); put("y", point.y) }
    }

    /** `note <side> of X : one line`, or the `... end note` block form for several. */
    private fun anchored(
        header: String,
        body: String,
        indent: String,
    ): List<String> {
        val lines = body.lines()
        if (lines.size == 1) return listOf("$header : ${lines[0]}")
        if (blockIsSafe(lines)) return listOf(header) + lines.map { indent + it } + "end note"
        return listOf("$header : ${escape(body)}")
    }

    /** `note "one line" as N1`, or the `note as N1 ... end note` block form for several. */
    private fun aliased(
        alias: String,
        body: String,
        indent: String,
    ): List<String> {
        val lines = body.lines()
        if (lines.size == 1) return listOf("""note "${body.replace("\"", "'")}" as $alias""")
        if (blockIsSafe(lines)) return listOf("note as $alias") + lines.map { indent + it } + "end note"
        return listOf("""note "${escape(body)}" as $alias""")
    }

    /**
     * The block form is the readable one and is what a human writes, but its terminator is a bare
     * `end note` line — so text that itself contains one, or a line starting `@`, has to go back
     * through the quoted form with `\n` escapes or the file would stop parsing where the note was
     * meant to continue.
     */
    private fun blockIsSafe(lines: List<String>): Boolean =
        lines.none { END_NOTE.matches(it.trim()) || it.trim().startsWith("@") }

    private fun escape(body: String): String = body.replace("\"", "'").replace("\n", "\\n")

    private fun nextAlias(used: MutableSet<String>): String {
        var index = 1
        while (!used.add("N$index")) index++
        return "N$index"
    }

    private fun quote(name: String): String = if (Regex("""^[A-Za-z_][\w.$]*$""").matches(name)) name else "\"$name\""
}
