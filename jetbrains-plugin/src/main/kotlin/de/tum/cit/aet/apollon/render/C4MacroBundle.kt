package de.tum.cit.aet.apollon.render

import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

/**
 * The C4-PlantUML macro files this plugin ships, on disk and ready for PlantUML to `!include`.
 *
 * Rendering a C4 diagram means running C4-PlantUML's macros, and a `.puml` file in the wild asks
 * for them with an `!includeurl` to GitHub. Neither of the two ways to answer that without the
 * network is dependable on its own:
 *
 *  - fetching it is out — the View tab must not make a request because a file was opened, and an
 *    offline IDE would show "Cannot open URL" instead of a diagram;
 *  - `!include <C4/…>`, PlantUML's own bundled copy, is a resource lookup inside `plantuml-mit`
 *    that this plugin neither controls nor versions — whether it resolves depends on how the jar
 *    is packaged and how the IDE's classloader serves `/stdlib/…`, and when it doesn't the failure
 *    is the same "cannot include" with nothing pointing at the cause.
 *
 * So the macros are vendored under `resources/c4/` (see the README there) and extracted here. A
 * classloader cannot list a resource directory, hence [INDEX] — a generated manifest of the names
 * to copy. A fresh directory per IDE run, rather than a cached one keyed by version: extracting
 * thirty small text files costs nothing next to one render, and a cache would have to be invalidated
 * against a half-written or hand-edited copy. [VERSION] is in the name only so that a directory
 * found in a bug report says which C4-PlantUML release it holds.
 *
 * Nothing here widens what PlantUML may read on its own: [PlantUmlRenderService] allow-lists this
 * one directory and nothing else.
 */
object C4MacroBundle {
    /** The vendored C4-PlantUML release. Part of the directory name — bump it with the files. */
    const val VERSION = "2.13.0"

    /** Where the vendored files sit on the classpath. */
    private const val RESOURCE_ROOT = "/c4"

    /** One relative path per line — the names [extract] copies, since a jar directory can't be listed. */
    private const val INDEX = "$RESOURCE_ROOT/index.txt"

    /**
     * The extracted directory, or `null` if the bundle is missing or could not be written out.
     *
     * Computed once and remembered either way: a failure here is a packaging or disk problem, not
     * something a later render would succeed at, and retrying it on every keystroke in the Text tab
     * would be pure noise. `null` is a degradation, not an error — [PlantUmlRenderService] falls
     * back to PlantUML's own `stdlib` copy of the macros.
     */
    val directory: Path? by lazy {
        if (names.isEmpty()) null else runCatching { extract() }.getOrNull()
    }

    /**
     * The bundle-relative path of the file an `!include` names, or `null` if this bundle has no
     * such file.
     *
     * Matched on the base name alone and case-insensitively, so `C4_Context`, `C4/C4_Context` and
     * `https://…/master/C4_Context.puml` all land on the same entry — the caller is only expected
     * to have stripped PlantUML's decorations around the path. No two files in the bundle share a
     * base name — the themes are all `puml-theme-C4…` — so there is nothing to disambiguate.
     */
    fun nameFor(include: String): String? {
        val file = include.substringAfterLast('/').substringAfterLast('\\')
        if (file.isEmpty()) return null
        val withSuffix = if (file.endsWith(".puml", ignoreCase = true)) file else "$file.puml"
        return byBaseName[withSuffix.lowercase()]
    }

    /** The absolute path of a bundled file, by one of the relative names [names] lists. */
    fun resolve(name: String): Path? {
        val root = directory ?: return null
        // Only ever a name from this bundle's own manifest, so `..` cannot walk out of `root`.
        if (name !in names) return null
        return root.resolve(name)
    }

    /**
     * Every file in the bundle, as the relative paths [INDEX] lists — empty if the manifest is
     * missing, which means the plugin was packaged without the bundle.
     */
    internal val names: Set<String> by lazy {
        runCatching { readIndex() }.getOrDefault(emptySet())
    }

    /** [names], keyed by lowercased base name — the form an `!include` target reduces to. */
    private val byBaseName: Map<String, String> by lazy {
        names.associateBy { it.substringAfterLast('/').lowercase() }
    }

    private fun readIndex(): Set<String> {
        val index =
            C4MacroBundle::class.java.getResourceAsStream(INDEX)
                ?: throw IOException("the plugin is missing $INDEX")
        return index.use { stream ->
            stream
                .reader(Charsets.UTF_8)
                .readLines()
                .map(String::trim)
                .filter { it.isNotEmpty() }
                .toSet()
        }
    }

    /**
     * Writes the bundle to a temporary directory and returns it.
     *
     * Written file by file rather than left in the jar because PlantUML resolves an `!include`
     * through its own `SFile`, which is a real filesystem path — there is no hook for handing it a
     * classpath resource.
     *
     * Registration order matters: `deleteOnExit` runs its entries last-registered-first and refuses
     * a non-empty directory, so the directories go in before the files they hold. Miss the
     * `themes/` subdirectory and every IDE run leaves a temporary directory behind.
     */
    private fun extract(): Path {
        val root = Files.createTempDirectory("apollon-c4-$VERSION-")
        root.toFile().deleteOnExit()
        names.mapNotNullTo(sortedSetOf()) { root.resolve(it).parent?.takeIf { parent -> parent != root } }
            .forEach { directory ->
                Files.createDirectories(directory)
                directory.toFile().deleteOnExit()
            }
        for (name in names) {
            val target = root.resolve(name)
            val source =
                C4MacroBundle::class.java.getResourceAsStream("$RESOURCE_ROOT/$name")
                    ?: throw IOException("$INDEX names $name, which the plugin does not ship")
            source.use { Files.copy(it, target, StandardCopyOption.REPLACE_EXISTING) }
            target.toFile().deleteOnExit()
        }
        return root
    }
}
