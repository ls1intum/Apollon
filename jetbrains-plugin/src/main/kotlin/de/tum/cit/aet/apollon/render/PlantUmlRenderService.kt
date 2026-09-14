package de.tum.cit.aet.apollon.render

import net.sourceforge.plantuml.FileFormat
import net.sourceforge.plantuml.FileFormatOption
import net.sourceforge.plantuml.SourceStringReader
import java.io.ByteArrayOutputStream

/**
 * `.puml` text -> SVG, via the bundled `plantuml-mit` engine (plan §11) — the Preview tab's only
 * dependency on PlantUML's own renderer; every other file in `puml/` is this plugin's own
 * hand-rolled grammar and never touches this class. Deliberately family-agnostic: unlike
 * [de.tum.cit.aet.apollon.puml.PlantUmlDiagramImporter], rendering does not require recognizing or
 * understanding the diagram — every family this plugin cannot visually edit yet (State, Timing,
 * Gantt, MindMap, ...) still gets a real preview through this path, which is why Preview is a
 * separate tab from the Visual canvas rather than gated behind the same family check.
 *
 * Runs PlantUML's `SANDBOX` [net.sourceforge.plantuml.security.SecurityProfile] — no network
 * access, no reads outside PlantUML's own bundled standard library — set via the
 * `PLANTUML_SECURITY_PROFILE` system property PlantUML reads once at class-init (spec's security
 * requirement: rendering a file must never be a vector to exfiltrate other project files or make
 * network calls the user didn't ask for). [ensureSandboxed] must run before any other class in the
 * `net.sourceforge.plantuml` package is touched for the property to take effect — every entry
 * point in this file calls it first.
 *
 * The one accommodation the sandbox makes is [withLocalC4Includes], which answers a remote
 * C4-PlantUML include from PlantUML's own bundled copy rather than letting it fail. It still
 * fetches nothing.
 */
object PlantUmlRenderService {
    private const val SECURITY_PROFILE_PROPERTY = "PLANTUML_SECURITY_PROFILE"

    private fun ensureSandboxed() {
        if (System.getProperty(SECURITY_PROFILE_PROPERTY) == null) {
            System.setProperty(SECURITY_PROFILE_PROPERTY, "SANDBOX")
        }
    }

    /**
     * The C4-PlantUML macro files PlantUML bundles in its own `stdlib/c4`, and therefore the ones
     * an `!includeurl` can be answered from locally. Every name here is verified to resolve as
     * `<C4/Name>` against the bundled `plantuml-mit`; `C4` itself is the base layer the others
     * build on.
     */
    private val BUNDLED_C4 =
        setOf("C4", "C4_Context", "C4_Container", "C4_Component", "C4_Dynamic", "C4_Deployment", "C4_Sequence")

    /**
     * `!includeurl https://…/C4-PlantUML/…/C4_Context.puml` and the `!include`/`!include_once`
     * spellings of the same thing. Both the `plantuml-stdlib` and the older `RicardoNiepel`
     * repositories are matched, at any git ref, since every published C4 snippet uses one of them.
     */
    private val C4_REMOTE_INCLUDE =
        Regex(
            """^(\s*)!include(?:url|_once|_many)?\s+https?://\S*C4-PlantUML\S*/(\w+)\.puml\s*$""",
            RegexOption.IGNORE_CASE,
        )

    /**
     * Answers a remote C4-PlantUML include from PlantUML's bundled copy instead of the network.
     *
     * The sandbox exists so that opening a file can never make a request the user did not ask for,
     * and that does not change here — nothing is fetched. But almost every C4 diagram in the wild
     * begins with an `!includeurl` to GitHub, and under the sandbox all of them render as "Cannot
     * open URL" with no hint that the same macros are already on disk. Rewriting the line to
     * `!include <C4/…>` for the preview makes those files render offline.
     *
     * Only the line handed to the renderer is rewritten — the file itself is never touched, and the
     * canvas does not go through here at all (the importer treats the include as preamble and
     * reads the macro calls directly). An unrecognised URL, or a C4 file name PlantUML does not
     * bundle, is left exactly as written so the user still sees PlantUML's own diagnostic.
     */
    internal fun withLocalC4Includes(text: String): String {
        if (!text.contains("C4-PlantUML", ignoreCase = true)) return text
        return text.lineSequence().joinToString("\n") { line ->
            val match = C4_REMOTE_INCLUDE.matchEntire(line) ?: return@joinToString line
            val name = match.groupValues[2]
            if (name in BUNDLED_C4) "${match.groupValues[1]}!include <C4/$name>" else line
        }
    }

    sealed interface RenderResult {
        data class Rendered(val svg: String) : RenderResult

        data class Failed(val reason: String) : RenderResult
    }

    /** Renders the first `@startuml`/`@enduml` block in [text] to an SVG document. PlantUML draws a
     *  readable in-image error message (rather than throwing) for a diagram it cannot parse, which
     *  is exactly the "show the user what's wrong" behaviour a live preview wants — [RenderResult.Failed]
     *  is reserved for this call itself throwing (a PlantUML engine bug/OOM/etc), not for a syntax
     *  error in [text]. */
    fun render(text: String): RenderResult {
        ensureSandboxed()
        return try {
            val output = ByteArrayOutputStream()
            val reader = SourceStringReader(withLocalC4Includes(text))
            reader.outputImage(output, FileFormatOption(FileFormat.SVG))
            val svg = output.toString(Charsets.UTF_8)
            if (svg.isBlank()) RenderResult.Failed("PlantUML produced no output for this file") else RenderResult.Rendered(svg)
        } catch (e: Exception) {
            RenderResult.Failed(e.message ?: "PlantUML failed to render this file")
        }
    }
}
