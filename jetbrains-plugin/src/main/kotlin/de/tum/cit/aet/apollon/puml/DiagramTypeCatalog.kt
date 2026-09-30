package de.tum.cit.aet.apollon.puml

/**
 * The diagram kinds the "New Architecture Diagram" wizard offers and [PumlDiagramMetadata] can
 * name, grouped into the two families the menu shows as submenus.
 *
 * [Entry.tag] is a plain `String`, not a Kotlin `enum class`, by design: a real crash was traced to
 * `TextEditorWithPreview.Layout.entries` — Kotlin's `.entries` sugar resolving `kotlin.enums.EnumEntries`
 * across the plugin/platform classloader boundary (fixed in [PumlSplitFileEditor]) — so this catalog
 * stays a fixed list of string values, an "enum used as a marker only", never a JVM enum type.
 */
object DiagramTypeCatalog {
    data class Entry(val tag: String, val group: String, val label: String)

    val ENTRIES: List<Entry> =
        listOf(
            Entry("C4-CONTEXT", "C4", "Context"),
            Entry("C4-CONTAINER", "C4", "Container"),
            Entry("C4-COMPONENT", "C4", "Component"),
            Entry("C4-DYNAMIC", "C4", "Dynamic"),
            Entry("UML-CLASS", "UML", "Class"),
            Entry("UML-OBJECT", "UML", "Object"),
            Entry("UML-USE-CASE", "UML", "Use Case"),
            Entry("UML-COMPONENT", "UML", "Component"),
            Entry("UML-DEPLOYMENT", "UML", "Deployment"),
            Entry("UML-ACTIVITY", "UML", "Activity"),
            Entry("UML-SEQUENCE", "UML", "Sequence"),
        )

    val GROUPS: List<String> = listOf("C4", "UML")

    fun byTag(tag: String?): Entry? = tag?.let { t -> ENTRIES.firstOrNull { it.tag == t } }

    fun byGroup(group: String): List<Entry> = ENTRIES.filter { it.group == group }
}
