package de.tum.cit.aet.apollon.render

import net.sourceforge.plantuml.FileFormat
import net.sourceforge.plantuml.FileFormatOption
import net.sourceforge.plantuml.FileSystem
import net.sourceforge.plantuml.SourceStringReader
import net.sourceforge.plantuml.error.PSystemError
import net.sourceforge.plantuml.preproc.Defines
import net.sourceforge.plantuml.security.SFile
import net.sourceforge.plantuml.security.SecurityProfile
import net.sourceforge.plantuml.security.SecurityUtils
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.file.Files
import java.nio.file.Path

/**
 * `.puml` text -> SVG, via the bundled `plantuml-mit` engine (plan §11) — the View tab's only
 * dependency on PlantUML's own renderer; every other file in `puml/` is this plugin's own
 * hand-rolled grammar and never touches this class. Deliberately family-agnostic: unlike
 * [de.tum.cit.aet.apollon.puml.PlantUmlDiagramImporter], rendering does not require recognizing or
 * understanding the diagram — every family this plugin cannot visually edit yet (State, Timing,
 * Gantt, MindMap, ...) still gets a real preview through this path, which is why View is a
 * separate tab from the Edit canvas rather than gated behind the same family check.
 *
 * Rendering a file must never be a vector to exfiltrate other project files or to make network
 * calls the user didn't ask for, so PlantUML runs under a locked-down
 * [net.sourceforge.plantuml.security.SecurityProfile] — see [latchedProfile] for which one, why,
 * and why the system property that selects it is put back afterwards rather than left set. That
 * policy is this plugin's own: it binds our copy of PlantUML and no one else's.
 *
 * PlantUML is allowed to read exactly two things, and nothing else on disk or on the network:
 *
 *  - [C4MacroBundle] — the C4-PlantUML macros this plugin ships — so a C4 diagram renders with no
 *    network and no guesswork about what `plantuml-mit` carries in its own `stdlib`.
 *    [withLocalC4Includes] is the other half of that: it points the file's `!include` at the bundled
 *    copy, *unless* the user has that file themselves.
 *  - the project the diagram belongs to, named by [RenderContext] — because `!include
 *    ../lib/house-style.puml` is how real PlantUML projects are laid out, and a renderer that cannot
 *    follow it can only render diagrams that have no includes of their own.
 */
object PlantUmlRenderService {
    private const val SECURITY_PROFILE_PROPERTY = "PLANTUML_SECURITY_PROFILE"

    /** PlantUML's allow-list of directories an `!include` may read under the `ALLOWLIST` profile. */
    private const val INCLUDE_PATH_PROPERTY = "plantuml.include.path"

    /**
     * C4-PlantUML's own switch between `!include ./C4.puml` and `!include https://…/C4.puml`: each
     * `C4_*.puml` opens with `!if %variable_exists("RELATIVE_INCLUDE")`. Defining it is what keeps
     * the *nested* include — the one inside the macro file, which this plugin never sees as text —
     * pointed at the file next to it in [C4MacroBundle]. Only its existence is tested; the value is
     * never read.
     */
    private const val RELATIVE_INCLUDE = "RELATIVE_INCLUDE"

    /**
     * The profile this plugin's copy of PlantUML renders under, latched on first use.
     *
     * `ALLOWLIST` rather than `SANDBOX`, which is a *narrowing* despite the friendlier name.
     * `SANDBOX` refuses every local read outright, with no way to make an exception — so neither the
     * C4 macros this plugin ships nor the file next to the user's own diagram could ever be read.
     * `ALLOWLIST` refuses every local read too, *except* under the directories named by
     * [INCLUDE_PATH_PROPERTY], which [withPluginPolicy] fills in per render and empties again.
     * Verified: with that property unset, `ALLOWLIST` denies a relative include exactly as `SANDBOX`
     * does. Neither profile permits a URL unless `plantuml.allowlist.url` names it, and this plugin
     * never sets that: no render fetches anything, on any path.
     *
     * ### Why the property is set and then put back
     *
     * PlantUML has no API for choosing a profile: the only way in is a system property, which is
     * process-wide, while the profile it produces is cached per class-loader on first read. A
     * JetBrains IDE can have more than one plugin with its own copy of PlantUML — **PlantUML
     * integration** (`plantuml4idea`), which puts a live preview beside the source, is the common
     * one — and leaving the property set hands them *our* policy: their preview loses the network
     * and answers every `!includeurl` with "Cannot open URL", a plugin the user never touched
     * breaking because this one was installed.
     *
     * So the property is set, read once to latch it into this class-loader's copy for good, and
     * restored. The window is a few microseconds on one thread; another plugin that happens to
     * take its very first reading inside it would latch our profile too, which is as good as this
     * gets while the switch is a global. An explicitly set property is left exactly as found — a
     * choice made by the user or the IDE outranks this default, and there is nothing to restore.
     */
    private val latchedProfile: SecurityProfile by lazy {
        val previous = System.getProperty(SECURITY_PROFILE_PROPERTY)
        if (previous == null) System.setProperty(SECURITY_PROFILE_PROPERTY, "ALLOWLIST")
        try {
            SecurityUtils.getSecurityProfile()
        } finally {
            if (previous == null) System.clearProperty(SECURITY_PROFILE_PROPERTY)
        }
    }

    /**
     * Where the file being rendered sits, so that its own `!include` lines resolve the way they do
     * when PlantUML is handed the file on a command line.
     *
     * A diagram is rendered from the editor's buffer, not from disk — that is what makes the View tab
     * follow your keystrokes — and a buffer has no location, so PlantUML cannot work out what
     * `!include ../lib/house-style.puml` is relative to. These two say it out loud:
     *
     *  - [baseDirectory] is the directory a relative include is relative to. PlantUML consults it
     *    *before* [INCLUDE_PATH_PROPERTY], so a `C4.puml` sitting next to the diagram always wins
     *    over the copy in [C4MacroBundle] — the user's own file is never quietly substituted.
     *  - [allowedRoots] is what may be read at all: the project's content roots.
     *
     * [NONE] renders a buffer with no location — nothing local resolves, which is the right answer
     * for text that came from nowhere.
     *
     * ### What allow-listing a directory does and does not guarantee
     *
     * It is worth being exact, because the obvious reading is wrong. PlantUML's check (`SFile
     * .isInAllowList`) is `target.getCleanPathSecure().startsWith(entry.getCleanPathSecure())`, and
     * `getCleanPathSecure` **does not resolve `..`**. So:
     *
     *  - an *absolute* path outside every root is refused — that is a real boundary;
     *  - no URL is ever fetched, under any include, on any path;
     *  - but a `..` chain that starts inside an allow-listed directory is **not** refused:
     *    `/proj/docs/../../elsewhere/x.puml` still begins with `/proj`, so the prefix test passes.
     *
     * That is PlantUML's behaviour, not this plugin's choice, and no profile or property changes it —
     * a relative include is resolved against the *including* file's own directory, which PlantUML
     * tracks itself, so there is no configuration that makes containment hold. Closing it properly
     * would mean resolving the whole include graph here and handing PlantUML one flat buffer, i.e.
     * reimplementing its preprocessor.
     *
     * The exposure is bounded and local: a `.puml` written to escape can cause a file's *text* to be
     * displayed in the preview of the person who opened it. It cannot be sent anywhere, written, or
     * executed. For comparison, PlantUML's own CLI and the **PlantUML integration** plugin run with
     * no restriction at all and with the network open. `a diagram cannot read an absolute path
     * outside the project` and `PlantUML's own allow-list does not stop a traversal` pin both halves,
     * so the claim cannot drift.
     */
    data class RenderContext(
        val baseDirectory: Path?,
        val allowedRoots: List<Path>,
    ) {
        /**
         * The directories to allow-list: the roots, plus wherever the file itself is. A `.puml`
         * opened from outside any project still gets its own directory, so a sibling include works
         * even with no project around it.
         *
         * Absolute and `normalize`d, because each one becomes a *prefix* PlantUML string-matches
         * against: a root spelled with a `.` or a `..` in it would match either too little or far too
         * much.
         */
        internal fun readableDirectories(): List<Path> =
            (allowedRoots + listOfNotNull(baseDirectory))
                .mapNotNull { runCatching { it.toAbsolutePath().normalize() }.getOrNull() }
                .distinct()

        companion object {
            val NONE = RenderContext(null, emptyList())
        }
    }

    /** Serializes [withPluginPolicy], which owns a process-wide property for the length of a render. */
    private val renderLock = Any()

    /**
     * Runs [block] with this plugin's PlantUML policy in force, and hands the JVM back unchanged.
     *
     * [INCLUDE_PATH_PROPERTY] is the allow-list [latchedProfile] leans on, and unlike the profile it
     * is read afresh for every file PlantUML resolves — so it has to be set for the duration of a
     * render rather than latched once. It is a process-wide property, and left set it would not
     * merely widen what another plugin's PlantUML may read: a plain `!include C4.puml` in someone's
     * diagram would start silently resolving to *our* bundled copy. That is the same class of
     * surprise as leaving the profile set, so it is put back the same way, and the lock is what
     * keeps two concurrent renders from restoring each other's value.
     *
     * Ours are prepended rather than assigned, so an include path the user set still applies for the
     * length of our render.
     *
     * `FileSystem.currentDir` is PlantUML's own notion of "the directory the source came from", and
     * is what makes a relative include resolve at all. It is a `ThreadLocal` inside a singleton held
     * by *this* class-loader, so unlike the two properties it is neither shared with another
     * plugin's PlantUML nor with another of our own render threads — but it is still saved and put
     * back, because the pooled thread it runs on is the platform's and will be used for other work.
     */
    private fun <T> withPluginPolicy(
        context: RenderContext,
        block: () -> T,
    ): T =
        synchronized(renderLock) {
            val readable =
                if (latchedProfile != SecurityProfile.ALLOWLIST) {
                    emptyList()
                } else {
                    listOfNotNull(C4MacroBundle.directory) + context.readableDirectories()
                }
            val previousPath = System.getProperty(INCLUDE_PATH_PROPERTY)
            val previousDir = runCatching { FileSystem.getInstance().currentDir }.getOrNull()
            if (readable.isNotEmpty()) {
                val entries =
                    readable.map { it.toString() } +
                        previousPath.orEmpty().split(File.pathSeparator).filter { it.isNotBlank() }
                System.setProperty(INCLUDE_PATH_PROPERTY, entries.distinct().joinToString(File.pathSeparator))
            }
            context.baseDirectory?.let { directory ->
                runCatching {
                    FileSystem.getInstance().setCurrentDir(SFile(directory.toAbsolutePath().normalize().toString()))
                }
            }
            try {
                block()
            } finally {
                if (readable.isNotEmpty()) {
                    if (previousPath == null) {
                        System.clearProperty(INCLUDE_PATH_PROPERTY)
                    } else {
                        System.setProperty(INCLUDE_PATH_PROPERTY, previousPath)
                    }
                }
                if (context.baseDirectory != null) {
                    runCatching { FileSystem.getInstance().setCurrentDir(previousDir) }
                }
            }
        }

    /**
     * The C4-PlantUML macro files PlantUML bundles in its own `stdlib/c4`, and therefore the ones
     * an `!includeurl` can be answered from locally when [C4MacroBundle] is unavailable. Every name
     * here is verified to resolve as `<C4/Name>` against the bundled `plantuml-mit`; `C4` itself is
     * the base layer the others build on. The bundle is a superset — it also carries the themes,
     * which `stdlib` does not.
     */
    private val STDLIB_C4 =
        setOf("C4", "C4_Context", "C4_Container", "C4_Component", "C4_Dynamic", "C4_Deployment", "C4_Sequence")

    /**
     * An `!include` line, split into its leading indent (group 1) and its target (group 2).
     *
     * Deliberately looser than "the URL the docs show" — every spelling below is written in the
     * wild, and each one renders as "Cannot open URL" or "cannot include" otherwise:
     *
     *  - `!include`, `!includeurl`, `!include_once` and `!include_many`;
     *  - an `https://…/C4_Context.puml` URL from either the `plantuml-stdlib` or the older
     *    `RicardoNiepel` repository, at any git ref, with or without the `.puml` suffix;
     *  - PlantUML's `…puml!inline` sub-part suffix;
     *  - PlantUML's `<C4/C4_Context>` stdlib spelling;
     *  - a bare or relative *local* path (`C4_Context.puml`, `../lib/C4_Container.puml`) — the
     *    profile forbids reads outside the bundle, so these fail exactly like a URL does;
     *  - a trailing `'` comment or trailing whitespace.
     *
     * Matching a line is not enough to rewrite it: [bundledNameFor] then has to recognize the
     * target as a file this plugin ships, so an unrelated `!include common.puml` is left alone.
     */
    private val INCLUDE_LINE =
        Regex(
            """^(\s*)!include(?:url|_once|_many)?\s+(\S+)\s*(?:'.*)?$""",
            RegexOption.IGNORE_CASE,
        )

    /**
     * The [C4MacroBundle] file an include target names, or `null` if it names anything else.
     *
     * Only strips the two decorations PlantUML allows around a path — the `<…>` of the stdlib
     * spelling and a `…!inline` sub-part suffix — and hands the rest to the bundle, which matches
     * on the base name. That is what lets one rule cover a GitHub URL, a relative path and
     * `<C4/C4_Context>` at once. The bundle's own manifest is the allow-list: every name in it is
     * `C4.puml`, a `C4_*.puml` or a `puml-theme-C4*.puml`, so nothing else is captured by accident.
     */
    internal fun bundledNameFor(target: String): String? =
        C4MacroBundle.nameFor(target.trim().substringBefore('!').removeSurrounding("<", ">"))

    /**
     * A `!theme` line naming a theme but no directory to find it in, with the theme's name as
     * group 2.
     *
     * PlantUML looks a bare `!theme X` up in its own `themes/` folder, which carries none of
     * C4-PlantUML's — so `!theme C4_united` renders unthemed today. A `!theme X from …` is left
     * alone: the directory is the user's own choice, and honouring it is not this plugin's to
     * override (the profile will refuse to read it, which is the honest answer).
     */
    private val THEME_LINE = Regex("""^(\s*)!theme\s+(\S+)\s*(?:'.*)?$""", RegexOption.IGNORE_CASE)

    /** The opening `<svg …>` tag of a PlantUML document, with its attribute list as group 1. */
    private val SVG_ROOT = Regex("""<svg\b([^>]*)>""", RegexOption.IGNORE_CASE)

    /** The sizing PlantUML bakes into its root tag, which [normalizeSvgRoot] hands back to CSS. */
    private val SVG_INLINE_SIZE = Regex("""\s(?:width|height|preserveAspectRatio|style)\s*=\s*"[^"]*"""", RegexOption.IGNORE_CASE)

    /**
     * Answers a C4-PlantUML `!include` or `!theme` from the macros this plugin ships, instead of
     * from the network.
     *
     * Nothing is fetched, here or anywhere in this file — but almost every C4 diagram in the wild
     * begins with an `!includeurl` to GitHub, and left alone every one of them renders as "Cannot
     * open URL" with no hint that the same macros are already on disk. Repointing the line at
     * [C4MacroBundle] makes those files render offline, at a known version of C4-PlantUML, with no
     * dependence on how the IDE's classloader serves `plantuml-mit`'s own `stdlib` resources.
     *
     * An absolute path rather than a bare file name, so that resolution cannot land anywhere else.
     *
     * **A file the user actually has is never rewritten.** Plenty of projects vendor C4-PlantUML
     * themselves, at a version they chose; if the include names a file that exists next to the
     * diagram, that one is what renders, and this leaves the line alone —
     * [RenderContext.baseDirectory] then resolves it, matching what `java -jar plantuml.jar` does
     * with the same file. Substituting our copy there would be a silent version change.
     *
     * Only the line handed to the renderer is rewritten — the file itself is never touched, the
     * rewrite is line-for-line so a syntax error further down still reports the line number the
     * Text tab shows, and the canvas does not go through here at all (the importer treats the
     * include as preamble and reads the macro calls directly). A line naming anything this plugin
     * does not ship is left exactly as written, so the user still sees PlantUML's own diagnostic.
     */
    internal fun withLocalC4Includes(
        text: String,
        baseDirectory: Path? = null,
    ): String {
        if (!text.contains("!include", ignoreCase = true) && !text.contains("!theme", ignoreCase = true)) return text
        return text.lineSequence().joinToString("\n") { line ->
            rewriteInclude(line, baseDirectory) ?: rewriteTheme(line) ?: line
        }
    }

    /** [line] with its `!include` pointed at the bundle, or `null` if it is not one to rewrite. */
    private fun rewriteInclude(
        line: String,
        baseDirectory: Path?,
    ): String? {
        val match = INCLUDE_LINE.matchEntire(line) ?: return null
        val indent = match.groupValues[1]
        val target = match.groupValues[2]
        val name = bundledNameFor(target) ?: return null
        if (existsRelativeTo(baseDirectory, target)) return null
        C4MacroBundle.resolve(name)?.let { return "$indent!include $it" }
        // No bundle on disk: PlantUML's own stdlib copy is the fallback, for the macro files it
        // has. It carries no C4 themes, so a theme include has nowhere to fall back to.
        val stdlib = name.removeSuffix(".puml")
        return if (stdlib in STDLIB_C4) "$indent!include <C4/$stdlib>" else null
    }

    /**
     * Whether [target] names a file that is really there beside the diagram.
     *
     * Wrapped in `runCatching` for the URL case: on Windows `Path.resolve` throws
     * `InvalidPathException` on the `:` in `https://…`, and a `!includeurl` is precisely the line
     * this rewrite exists to answer.
     */
    private fun existsRelativeTo(
        baseDirectory: Path?,
        target: String,
    ): Boolean {
        val base = baseDirectory ?: return false
        return runCatching { Files.isRegularFile(base.resolve(target.trim().substringBefore('!'))) }
            .getOrDefault(false)
    }

    /**
     * [line] with a `from` clause naming the bundle's `themes/` appended, or `null` if it is not a
     * bare `!theme` naming a C4 theme.
     *
     * `!theme X from DIR` is PlantUML's own spelling for "this theme lives here", and DIR is where
     * it reads `puml-theme-X.puml` — which is exactly the layout the bundle has, so the theme needs
     * no rewriting of its own.
     */
    private fun rewriteTheme(line: String): String? {
        val match = THEME_LINE.matchEntire(line) ?: return null
        val theme = match.groupValues[2]
        val themes = C4MacroBundle.resolve(C4MacroBundle.nameFor("puml-theme-$theme") ?: return null)?.parent ?: return null
        return "${match.groupValues[1]}!theme $theme from $themes"
    }

    /**
     * Hands the SVG's sizing back to CSS so the View tab can scale it.
     *
     * PlantUML emits `<svg … width="364px" height="592px" style="width:364px;height:592px;
     * background:#FFFFFF;" preserveAspectRatio="none">`. Against a stylesheet the inline `style`
     * wins, `preserveAspectRatio="none"` *stretches* rather than scales, and the hardcoded white
     * background sits as a slab on an IDE-themed page. Dropping all four and keeping only the
     * `viewBox` leaves a diagram that scales proportionally to whatever width the tab gives it.
     */
    internal fun normalizeSvgRoot(svg: String): String {
        // Only the root tag, hence `find` + splice rather than `Regex.replace`: every inner shape
        // carries a `style` of its own, and those are the diagram's actual colours.
        val root = SVG_ROOT.find(svg) ?: return svg
        val attributes = SVG_INLINE_SIZE.replace(root.groupValues[1], "")
        return svg.replaceRange(root.range, "<svg$attributes preserveAspectRatio=\"xMidYMin meet\">")
    }

    sealed interface RenderResult {
        /** One entry per `@startuml` block, in file order, each already through [normalizeSvgRoot]. */
        data class Rendered(val pages: List<String>) : RenderResult

        /**
         * PlantUML rejected the source. Reported rather than drawn: PlantUML's own error *image* is
         * a full render of its 15 000-line standard-library dump, which in a preview tab reads as a
         * broken plugin rather than as "line 13 is wrong".
         */
        data class SyntaxError(val line: Int?, val messages: List<String>) : RenderResult

        /** The render itself failed — a PlantUML engine bug, an OOM, a `StackOverflowError`. */
        data class Failed(val reason: String) : RenderResult
    }

    /**
     * Renders every `@startuml`/`@enduml` block in [text] to an SVG document.
     *
     * Catches [Throwable], not [Exception], on purpose: C4's macro expansion is deeply recursive and
     * can throw `StackOverflowError`, and this is called (indirectly) from a `FileEditor`
     * constructor, where anything thrown costs the user the whole tab instead of showing them a
     * message inside it.
     */
    fun render(
        text: String,
        context: RenderContext = RenderContext.NONE,
    ): RenderResult =
        withPluginPolicy(context) {
            try {
                val reader = SourceStringReader(renderDefines(), withLocalC4Includes(text, context.baseDirectory))
                val blocks = reader.blocks
                when {
                    blocks.isEmpty() -> RenderResult.Failed("this file has no @startuml … @enduml block")
                    else -> {
                        val error = blocks.firstNotNullOfOrNull { it.diagram as? PSystemError }
                        if (error != null) {
                            describe(error)
                        } else {
                            renderPages(reader, blocks.size)
                        }
                    }
                }
            } catch (t: Throwable) {
                RenderResult.Failed(t.message ?: t::class.java.simpleName)
            }
        }

    /** One SVG per `@startuml` block, in file order. */
    private fun renderPages(
        reader: SourceStringReader,
        count: Int,
    ): RenderResult {
        val pages =
            (0 until count).map { index ->
                val output = ByteArrayOutputStream()
                reader.outputImage(output, index, FileFormatOption(FileFormat.SVG))
                normalizeSvgRoot(output.toString(Charsets.UTF_8))
            }
        return if (pages.any { it.isBlank() }) {
            RenderResult.Failed("PlantUML produced no output for this file")
        } else {
            RenderResult.Rendered(pages)
        }
    }

    /**
     * A fresh set of preprocessor defines per render — [SourceStringReader] hands them to a
     * `TMemory` that the file's own `!$var` assignments write into, so one shared instance would
     * carry a diagram's variables into the next one.
     */
    private fun renderDefines(): Defines =
        Defines.createEmpty().apply {
            define(RELATIVE_INCLUDE, listOf("\".\""), false)
        }

    /** PlantUML's own diagnostics for a rejected block, as text rather than as a rendered dump. */
    private fun describe(error: PSystemError): RenderResult.SyntaxError {
        // `getPosition()` is a 0-based index into the block's own lines; the Text tab counts from 1.
        val line = error.lineLocation?.position?.let { it + 1 }
        val messages =
            error.errorsUml
                .mapNotNull { uml ->
                    val offending = uml.line?.string?.trim()
                    when {
                        offending.isNullOrEmpty() -> uml.error
                        else -> "${uml.error}: $offending"
                    }
                }
                .distinct()
                .ifEmpty { listOf(error.warningOrError ?: "PlantUML could not parse this diagram") }
        return RenderResult.SyntaxError(line, messages)
    }
}
