package de.tum.cit.aet.apollon.puml

/**
 * A canvas display name reduced to something PlantUML can actually store.
 *
 * A Class-family element's name *is* its identity in the source text — there is no `as <alias>`
 * indirection for it (see [PumlDeclarationGrammar]) — and even the families that do have aliases
 * still write the display name into a quoted declaration. PlantUML has no escape syntax inside
 * that quoted string, so three shapes cannot survive a write:
 *
 *  - **empty** — `class ""` is not a declaration PlantUML or [PlantUmlImporter] recognises;
 *  - **a `"`** — `class "a"b"` closes the quote early and the rest becomes garbage;
 *  - **a newline or tab** — a declaration is a single line by construction.
 *
 * Each of those used to reach [RoundTripValidator] as a class that vanished between export and
 * re-parse, so the write was refused and the user's edit was stranded on the canvas with no way
 * forward but undo. Folding them to a representable name instead means the edit lands; the name
 * comes back changed on the next import, which is the honest signal that PlantUML could not hold
 * what was typed.
 *
 * Deliberately *not* normalised: leading/trailing spaces and all-whitespace names. Both round-trip
 * through a quoted declaration intact, so rewriting them would be a rename the format never asked
 * for.
 */
object PumlName {
    /** What an element with no usable name is called, matching each mapper's previous `?: "Unnamed"`. */
    const val FALLBACK = "Unnamed"

    private val LINE_BREAKING = Regex("""[\r\n\t]+""")

    /** [raw] as a name that survives being written to a declaration and read back. */
    fun forPuml(raw: String?): String {
        if (raw == null) return FALLBACK
        val flattened = LINE_BREAKING.replace(raw, " ").replace('"', '\'')
        return flattened.ifEmpty { FALLBACK }
    }

    /**
     * [raw] as note text, or `null` when there is none worth writing.
     *
     * Unlike a declaration a note body is genuinely multi-line, so newlines are kept — only the
     * carriage returns are folded away, because [PumlNotes] writes the block form line by line and
     * the file's own line ending is applied on the way out. There is no fallback: a note with no
     * text is dropped rather than written out as an empty box.
     */
    fun forNote(raw: String?): String? {
        val normalised = raw?.replace("\r\n", "\n")?.replace('\r', '\n')?.trim() ?: return null
        return normalised.ifBlank { null }
    }
}
