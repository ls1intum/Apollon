package de.tum.cit.aet.apollon.render

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.file.Files
import java.nio.file.Path

/** PlantUML's own wording when an include could not be fetched — the symptom this guards against. */
private const val CANNOT_OPEN_URL = "Cannot open URL"

/** …and its wording when a local read was refused. */
private const val CANNOT_INCLUDE = "cannot include"

class PlantUmlRenderServiceTest {
    /** The extracted C4-PlantUML macros every rewritten `!include` is expected to point into. */
    private val bundle: Path = requireNotNull(C4MacroBundle.directory) { "the C4 bundle failed to extract" }

    private fun c4(include: String) =
        """
        @startuml
        $include

        title System Context Diagram

        Person(customer, "Customer", "Uses the online platform")
        System(platform, "Order Platform", "Allows customers to place and manage orders")
        Rel(customer, platform, "Uses", "HTTPS")

        @enduml
        """.trimIndent()

    private fun renderedPages(source: String): List<String> {
        val result = PlantUmlRenderService.render(source)
        assertTrue("render failed: $result", result is PlantUmlRenderService.RenderResult.Rendered)
        return (result as PlantUmlRenderService.RenderResult.Rendered).pages
    }

    private fun renderedSvg(source: String): String {
        val pages = renderedPages(source)
        assertEquals("expected a single page", 1, pages.size)
        return pages.single()
    }

    /**
     * The words an SVG puts on the page. PlantUML lays a label out word by word — "Order Platform"
     * is two `<text>` elements — so searching the raw markup for a multi-word label always fails,
     * whether or not the diagram rendered.
     */
    private fun wordsIn(svg: String) =
        Regex("<text[^>]*>([^<]*)</text>")
            .findAll(svg)
            .map { it.groupValues[1].trim() }
            .filter { it.isNotEmpty() }
            .toSet()

    @Test
    fun `a C4 file written with includeurl renders offline`() {
        val svg =
            renderedSvg(
                c4("!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml"),
            )
        assertFalse("the include was not answered locally", svg.contains(CANNOT_OPEN_URL))
        // The C4 macros ran: «person» is drawn by the stereotype, not by anything in the source.
        val words = wordsIn(svg)
        assertTrue("no C4 person shape in: $words", words.any { it.contains("person") })
        assertTrue("the diagram's own labels are missing: $words", words.containsAll(setOf("Customer", "Order", "Platform")))
    }

    @Test
    fun `the older RicardoNiepel URL and the plain include spelling work too`() {
        listOf(
            "!includeurl https://raw.githubusercontent.com/RicardoNiepel/C4-PlantUML/release/1-0/C4_Context.puml",
            "!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/v2.4.0/C4_Context.puml",
            "!include_once https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml",
        ).forEach { include ->
            assertFalse(include, renderedSvg(c4(include)).contains(CANNOT_OPEN_URL))
        }
    }

    /** PlantUML's own stdlib spelling is repointed too — one source of C4 macros, not two, so the
     *  diagram renders at the version this plugin ships whichever way the file asks for them. */
    @Test
    fun `the stdlib include spelling is answered from the bundle too`() {
        val rewritten = PlantUmlRenderService.withLocalC4Includes(c4("!include <C4/C4_Context>"))
        assertTrue(rewritten, rewritten.contains("!include ${bundle.resolve("C4_Context.puml")}"))
        assertFalse(rewritten, rewritten.contains("<C4/"))
    }

    /** The rewrite is for C4 only. Any other remote include is still the user's own business, and
     *  PlantUML's diagnostic is more honest than a silent substitution would be. */
    @Test
    fun `an unrelated remote include is left alone`() {
        val source = "@startuml\n!includeurl https://example.com/theme.puml\nclass A\n@enduml"
        assertEquals(source, PlantUmlRenderService.withLocalC4Includes(source))
    }

    /** A C4 file PlantUML does not bundle must not be rewritten into a broken local include. */
    @Test
    fun `an unbundled C4 file name is left alone`() {
        val source = "@startuml\n!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Nonsense.puml\n@enduml"
        assertEquals(source, PlantUmlRenderService.withLocalC4Includes(source))
    }

    @Test
    fun `indentation is preserved so the rewrite cannot disturb a nested include`() {
        val rewritten =
            PlantUmlRenderService.withLocalC4Includes(
                "  !includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml",
            )
        assertEquals("  !include ${bundle.resolve("C4_Container.puml")}", rewritten)
    }

    /** The View tab reports a syntax error by line number, which only lines up with the Text tab if
     *  the source the renderer sees has the same number of lines as the file on disk. */
    @Test
    fun `the rewrite is line-for-line`() {
        val source = c4("!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml")
        assertEquals(source.lines().size, PlantUmlRenderService.withLocalC4Includes(source).lines().size)
    }

    /** C4-PlantUML's themes are part of the bundle, and `plantuml-mit`'s stdlib has no copy of
     *  them — before they shipped here, a themed C4 file could only get them over the network. */
    @Test
    fun `a C4 theme include is answered from the bundle`() {
        val rewritten =
            PlantUmlRenderService.withLocalC4Includes(
                "!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/themes/puml-theme-C4_united.puml",
            )
        assertEquals("!include ${bundle.resolve("themes/puml-theme-C4_united.puml")}", rewritten)
    }

    /** PlantUML's `themes/` folder carries none of C4-PlantUML's, so a bare `!theme C4_united`
     *  renders unthemed unless it is told where the bundle keeps them. */
    @Test
    fun `a bare C4 theme is pointed at the bundle`() {
        val themes = bundle.resolve("themes")
        assertEquals("!theme C4_united from $themes", PlantUmlRenderService.withLocalC4Includes("!theme C4_united"))
        assertEquals("  !theme C4_sandstone from $themes", PlantUmlRenderService.withLocalC4Includes("  !theme C4_sandstone"))
    }

    /** A theme that is not C4's, or one the file already located itself, is the user's own. */
    @Test
    fun `an unrelated theme and an explicit from clause are left alone`() {
        listOf("!theme cerulean", "!theme C4_united from /somewhere/else", "!theme _none_")
            .forEach { assertEquals(it, PlantUmlRenderService.withLocalC4Includes(it)) }
    }

    @Test
    fun `a themed C4 file renders`() {
        val svg =
            renderedSvg(
                "@startuml\n!theme C4_united\n!include <C4/C4_Context>\nPerson(c, \"Customer\")\n@enduml",
            )
        assertFalse(svg, svg.contains(CANNOT_OPEN_URL))
        assertTrue(svg, wordsIn(svg).contains("Customer"))
    }

    /** The whole point of vendoring the macros: the file the renderer reads is one this plugin
     *  shipped, not one it hoped to find. */
    @Test
    fun `every include the rewrite produces points into the bundle`() {
        val rewritten = PlantUmlRenderService.withLocalC4Includes(c4("!include C4_Context.puml"))
        val target = Regex("""!include (\S+)""").find(rewritten)?.groupValues?.get(1)
        assertTrue("not rewritten: $rewritten", target != null)
        val path = Path.of(target!!)
        assertTrue("$path is not inside $bundle", path.startsWith(bundle))
        assertTrue("$path was not extracted", Files.isRegularFile(path))
    }

    @Test
    fun `an ordinary class diagram still renders`() {
        val svg = renderedSvg("@startuml\nclass Customer {\n  -id : Long\n}\n@enduml")
        assertTrue(svg.contains("Customer"))
    }

    /** Every spelling below is written in the wild and rendered as "Cannot open URL" before the
     *  rewrite learned about it. A `.puml` suffix is optional, a sub-part suffix and a trailing
     *  comment are allowed, and a *local* include is answered too — the sandbox forbids local reads
     *  just as firmly as it forbids the network. */
    @Test
    fun `the include spellings people actually write are all answered locally`() {
        listOf(
            "!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml ' the C4 macros",
            "!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context",
            "!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml!inline",
            "!include C4_Context.puml",
            "!include ../lib/C4_Context.puml",
        ).forEach { include ->
            val svg = renderedSvg(c4(include))
            assertFalse(include, svg.contains(CANNOT_OPEN_URL))
            assertTrue(include, wordsIn(svg).any { it.contains("person") })
        }
    }

    /** A local include of something that is not a C4 macro file is the user's own file, and the
     *  allowlist is what keeps the rewrite off it. */
    @Test
    fun `an unrelated local include is left alone`() {
        val source = "@startuml\n!include common.puml\nclass A\n@enduml"
        assertEquals(source, PlantUmlRenderService.withLocalC4Includes(source))
    }

    @Test
    fun `the SVG root hands its sizing back to CSS`() {
        val svg = renderedSvg("@startuml\nclass Customer\n@enduml")
        val root = Regex("<svg\\b[^>]*>").find(svg)?.value ?: error("no <svg> root in: ${svg.take(200)}")
        // The three things that made a diagram wider than the tab stretch rather than scale.
        assertFalse(root, root.contains("width="))
        assertFalse(root, root.contains("height="))
        assertFalse(root, root.contains("style="))
        assertTrue(root, root.contains("viewBox="))
        assertTrue(root, root.contains("preserveAspectRatio=\"xMidYMin meet\""))
        // Only the root: the shapes' own `style` attributes are the diagram's colours.
        assertTrue(svg.contains("style=\"stroke:"))
    }

    @Test
    fun `every startuml block is rendered, not just the first`() {
        val pages =
            renderedPages(
                "@startuml\nclass First\n@enduml\n\n@startuml\nclass Second\n@enduml\n",
            )
        assertEquals(2, pages.size)
        assertTrue(wordsIn(pages[0]).contains("First"))
        assertTrue(wordsIn(pages[1]).contains("Second"))
    }

    /**
     * PlantUML answers a syntax error with a rendered image of its own diagnostic *plus* a dump of
     * every command it knows — thousands of lines. In a preview tab that reads as a broken plugin,
     * so the error is reported as text instead.
     */
    @Test
    fun `a syntax error is reported with its line, not drawn`() {
        val result =
            PlantUmlRenderService.render("@startuml\nclass Good\nthis is not plantuml at all\n@enduml")
        assertTrue("expected a syntax error: $result", result is PlantUmlRenderService.RenderResult.SyntaxError)
        result as PlantUmlRenderService.RenderResult.SyntaxError
        assertEquals(3, result.line)
        assertTrue("no diagnostic in $result", result.messages.isNotEmpty())
        assertTrue(
            "the offending line should be quoted: ${result.messages}",
            result.messages.any { it.contains("this is not plantuml at all") },
        )
    }

    @Test
    fun `a file with no diagram at all is reported rather than rendered blank`() {
        val result = PlantUmlRenderService.render("just some notes I left in a file\n")
        assertTrue("expected a failure: $result", result is PlantUmlRenderService.RenderResult.Failed)
    }

    /**
     * Allow-listing the bundle must not have opened the door generally. A remote include this
     * plugin does not ship still has to be refused — opening a `.puml` file may not become a way to
     * make a request the user did not ask for.
     */
    @Test
    fun `a remote include outside the bundle is still refused`() {
        val result = PlantUmlRenderService.render("@startuml\n!includeurl https://example.com/theme.puml\nclass A\n@enduml")
        assertTrue("expected a rejection: $result", result is PlantUmlRenderService.RenderResult.SyntaxError)
        result as PlantUmlRenderService.RenderResult.SyntaxError
        assertTrue("no refusal in ${result.messages}", result.messages.any { it.contains(CANNOT_OPEN_URL) })
    }

    /**
     * The same for the disk: the sibling file of a diagram is still off limits, so a render can
     * never be turned into a read of something else in the project.
     */
    @Test
    fun `a local include outside the bundle is still refused`() {
        val outside = Files.createTempFile("apollon-outside", ".puml")
        try {
            Files.writeString(outside, "' not the plugin's to read\n")
            val result = PlantUmlRenderService.render("@startuml\n!include $outside\nclass A\n@enduml")
            assertTrue("expected a rejection: $result", result is PlantUmlRenderService.RenderResult.SyntaxError)
            result as PlantUmlRenderService.RenderResult.SyntaxError
            assertTrue("no refusal in ${result.messages}", result.messages.any { it.contains(CANNOT_INCLUDE) })
        } finally {
            Files.deleteIfExists(outside)
        }
    }

    /**
     * Both switches PlantUML offers are *process-wide* system properties, and a JetBrains IDE can
     * have several plugins each carrying its own PlantUML — **PlantUML integration**
     * (`plantuml4idea`), which puts a live preview beside the source, is the common one. Left set,
     * the profile costs that plugin the network and turns every `!includeurl` in its preview into
     * "Cannot open URL"; left set, the include path makes a plain `!include C4.puml` in someone's
     * diagram silently resolve to *our* bundled copy. Neither is ours to impose.
     *
     * Rendering happens first so that both properties have been set and put back by the time they
     * are read here — and the render succeeding is the half that proves our own policy still took.
     */
    @Test
    fun `no PlantUML setting is left behind for the rest of the IDE`() {
        val result = PlantUmlRenderService.render(c4("!include <C4/C4_Context>"))
        assertTrue("render is broken, so this proves nothing: $result", result is PlantUmlRenderService.RenderResult.Rendered)
        assertEquals(
            "another plugin's PlantUML would latch this and lose the network",
            null,
            System.getProperty("PLANTUML_SECURITY_PROFILE"),
        )
        assertEquals(
            "another plugin's includes would start resolving into our bundle",
            null,
            System.getProperty("plantuml.include.path"),
        )
    }

    /** Two editors re-rendering at once must not restore each other's value and leave one set. */
    @Test
    fun `concurrent renders still hand the JVM back unchanged`() {
        val source = c4("!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml")
        val threads =
            (1..4).map {
                Thread { assertTrue(PlantUmlRenderService.render(source) is PlantUmlRenderService.RenderResult.Rendered) }
                    .apply { start() }
            }
        threads.forEach(Thread::join)
        assertEquals(null, System.getProperty("PLANTUML_SECURITY_PROFILE"))
        assertEquals(null, System.getProperty("plantuml.include.path"))
    }

    /** Every name in the bundle's manifest has to be a file the plugin actually ships, or a C4
     *  diagram renders a "cannot include" for whichever one is missing. */
    @Test
    fun `the whole bundle is on disk`() {
        assertTrue("the manifest is empty", C4MacroBundle.names.isNotEmpty())
        C4MacroBundle.names.forEach { name ->
            val path = C4MacroBundle.resolve(name)
            assertNotNull("$name did not resolve", path)
            assertTrue("$name was not extracted", Files.isRegularFile(path!!))
            assertTrue("$name is empty", Files.size(path) > 0)
        }
        // The seven macro files a `!include` can name, plus the C4 themes `plantuml-mit` has not got.
        assertTrue(C4MacroBundle.names.containsAll(setOf("C4.puml", "C4_Context.puml", "C4_Sequence.puml")))
        assertTrue(C4MacroBundle.names.any { it.startsWith("themes/") })
    }

    /** `..` in an include target must not be able to walk out of the bundle. */
    @Test
    fun `a traversal outside the bundle does not resolve`() {
        assertEquals(null, C4MacroBundle.resolve("../../../etc/passwd"))
        assertEquals(null, PlantUmlRenderService.bundledNameFor("../../../etc/passwd"))
    }

    /**
     * The deepest part of the offline guarantee, and the one nothing else here would catch: each
     * `C4_*.puml` decides between including its neighbour from disk and fetching it from GitHub, so
     * a C4 file that renders can still be one include away from the network.
     */
    @Test
    fun `the macro files include each other locally rather than over the network`() {
        val context = C4MacroBundle.resolve("C4_Context.puml")!!
        // Upstream's own switch. If this stops being how they write it, the assertion below is what
        // notices — the render would silently start reaching for raw.githubusercontent.com.
        assertTrue(Files.readString(context).contains("""%variable_exists("RELATIVE_INCLUDE")"""))
        val svg =
            renderedSvg(
                c4("!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml"),
            )
        assertFalse("the nested include went to the network", svg.contains(CANNOT_OPEN_URL))
        assertTrue("the Container macros did not run", wordsIn(svg).any { it.contains("person") })
    }

    // ---------------------------------------------------------------------------------------------
    // A diagram's own project: `!include ../lib/house-style.puml`, which is how real PlantUML
    // projects are laid out. The buffer has no location, so the renderer has to be told one.
    // ---------------------------------------------------------------------------------------------

    /**
     * The layout these tests build, which is the one C4 projects converge on — a house-style file
     * per view, in a sibling directory, itself including the C4 macros:
     *
     * ```
     * <root>/c4/system-context.puml   !include ../lib/house-style.puml
     * <root>/lib/house-style.puml     !include ./C4_Context.puml  +  !include ./layout.puml
     * <root>/lib/layout.puml
     * ```
     *
     * Two levels deep on purpose: the nested includes are relative to `lib/`, not to the diagram, so
     * a renderer that only knew the diagram's own directory would resolve the first and fail the
     * second.
     */
    private fun project(vendorC4: Boolean = false): Path {
        val root = Files.createTempDirectory("apollon-project-")
        Files.createDirectories(root.resolve("c4"))
        Files.createDirectories(root.resolve("lib"))
        val macros = if (vendorC4) "./C4_Context.puml" else requireNotNull(C4MacroBundle.resolve("C4_Context.puml"))
        Files.writeString(
            root.resolve("lib/house-style.puml"),
            "!include $macros\nSHOW_PERSON_OUTLINE()\n!include ./layout.puml\n",
        )
        Files.writeString(root.resolve("lib/layout.puml"), "LAYOUT_TOP_DOWN()\n")
        if (vendorC4) {
            Files.copy(requireNotNull(C4MacroBundle.resolve("C4_Context.puml")), root.resolve("lib/C4_Context.puml"))
            Files.copy(requireNotNull(C4MacroBundle.resolve("C4.puml")), root.resolve("lib/C4.puml"))
        }
        Files.writeString(root.resolve("c4/system-context.puml"), c4("!include ../lib/house-style.puml"))
        return root
    }

    private fun contextFor(root: Path) =
        PlantUmlRenderService.RenderContext(
            baseDirectory = root.resolve("c4"),
            allowedRoots = listOf(root),
        )

    private fun renderProject(root: Path): PlantUmlRenderService.RenderResult =
        PlantUmlRenderService.render(Files.readString(root.resolve("c4/system-context.puml")), contextFor(root))

    private fun deleteTree(root: Path) {
        Files.walk(root).sorted(Comparator.reverseOrder()).forEach(Files::delete)
    }

    /**
     * The failure this whole mechanism exists for: `cannot include ../lib/…`, which is what every
     * diagram in a project with a house-style file used to report. Both levels have to resolve, and
     * the C4 macros the house-style file pulls in have to run.
     */
    @Test
    fun `a relative include of the project's own files resolves, two levels deep`() {
        val root = project()
        try {
            val result = renderProject(root)
            assertTrue("expected a render: $result", result is PlantUmlRenderService.RenderResult.Rendered)
            val svg = (result as PlantUmlRenderService.RenderResult.Rendered).pages.single()
            assertFalse(svg.contains(CANNOT_OPEN_URL))
            assertFalse(svg.lowercase().contains(CANNOT_INCLUDE))
            val words = wordsIn(svg)
            assertTrue("the C4 macros did not run: $words", words.any { it.contains("person") })
            assertTrue("the diagram's own labels are missing: $words", words.containsAll(setOf("Customer", "Order")))
        } finally {
            deleteTree(root)
        }
    }

    /** Without a location there is nothing for `../lib/…` to be relative to, and the honest answer
     *  is the refusal — not a silent hunt through whatever directory the IDE happens to be in. */
    @Test
    fun `the same file with no location resolves nothing locally`() {
        val root = project()
        try {
            val result = PlantUmlRenderService.render(Files.readString(root.resolve("c4/system-context.puml")))
            assertTrue("expected a rejection: $result", result is PlantUmlRenderService.RenderResult.SyntaxError)
            result as PlantUmlRenderService.RenderResult.SyntaxError
            assertTrue("no refusal in ${result.messages}", result.messages.any { it.contains(CANNOT_INCLUDE) })
        } finally {
            deleteTree(root)
        }
    }

    /**
     * A project that vendors C4-PlantUML itself — plenty do, at a version they picked — must get
     * *its* copy, not ours. Silently swapping in a different release of the macros would change how
     * their diagrams look with nothing in the file to explain it.
     */
    @Test
    fun `the project's own C4 macros win over the bundled copy`() {
        val root = project(vendorC4 = true)
        try {
            val vendored = "!include ../lib/C4_Context.puml"
            assertEquals(
                "the project's own macro file was rewritten away",
                vendored,
                PlantUmlRenderService.withLocalC4Includes(vendored, root.resolve("c4")).trim(),
            )
            // Same line, same name, but nothing of the sort on disk: now the bundle answers it.
            val rewritten = PlantUmlRenderService.withLocalC4Includes(vendored, root.resolve("nowhere")).trim()
            assertTrue("expected the bundle: $rewritten", rewritten.startsWith("!include $bundle"))
        } finally {
            deleteTree(root)
        }
    }

    /** The boundary that does hold: an absolute path outside every allow-listed root is refused. */
    @Test
    fun `a diagram cannot read an absolute path outside the project`() {
        val root = project()
        val outside = Files.createTempFile("apollon-outside", ".puml")
        try {
            Files.writeString(outside, "' not the project's to read\n")
            val result =
                PlantUmlRenderService.render("@startuml\n!include $outside\nclass A\n@enduml", contextFor(root))
            assertTrue("expected a rejection: $result", result is PlantUmlRenderService.RenderResult.SyntaxError)
            result as PlantUmlRenderService.RenderResult.SyntaxError
            assertTrue("no refusal in ${result.messages}", result.messages.any { it.contains(CANNOT_INCLUDE) })
        } finally {
            Files.deleteIfExists(outside)
            deleteTree(root)
        }
    }

    /**
     * The boundary that does **not** hold, pinned deliberately so the documentation cannot drift into
     * claiming otherwise.
     *
     * PlantUML's allow-list is `target.cleanPath.startsWith(entry.cleanPath)` and its "clean" path
     * leaves `..` in place, so a traversal that begins inside an allow-listed directory passes the
     * test. Nothing this plugin sets changes that — a relative include is resolved against the
     * including file's own directory, which PlantUML tracks internally. If this test ever starts
     * failing, PlantUML began normalizing and the caveat in [PlantUmlRenderService.RenderContext]
     * (and in `README.dev.md`) can come out.
     */
    @Test
    fun `PlantUML's own allow-list does not stop a traversal out of the project`() {
        val root = project()
        val outside = Files.createTempDirectory("apollon-elsewhere-")
        try {
            Files.writeString(outside.resolve("reachable.puml"), "' reached\n")
            val climb = root.resolve("c4").relativize(outside.resolve("reachable.puml"))
            val result = PlantUmlRenderService.render("@startuml\n!include $climb\nclass A\n@enduml", contextFor(root))
            assertTrue(
                "PlantUML now refuses a traversal — the documented caveat is stale: $result",
                result is PlantUmlRenderService.RenderResult.Rendered,
            )
        } finally {
            deleteTree(outside)
            deleteTree(root)
        }
    }

    /**
     * `FileSystem.currentDir` is a `ThreadLocal` on a singleton PlantUML initialises to the process's
     * working directory, and the thread a render runs on belongs to the platform's pool and will go
     * on to do other work — so it is handed back the way the two system properties are, rather than
     * left pointing at the last diagram someone opened.
     */
    @Test
    fun `the current directory is put back after a render`() {
        val root = project()
        val fileSystem = net.sourceforge.plantuml.FileSystem.getInstance()
        val before = fileSystem.currentDir?.absolutePath
        try {
            assertTrue(renderProject(root) is PlantUmlRenderService.RenderResult.Rendered)
            assertEquals(before, fileSystem.currentDir?.absolutePath)
            assertFalse(
                "the render's own directory is still current",
                fileSystem.currentDir?.absolutePath == root.resolve("c4").toString(),
            )
        } finally {
            deleteTree(root)
        }
    }
}
