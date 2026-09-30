package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.fileEditor.TextEditor
import com.intellij.openapi.fileEditor.TextEditorWithPreview

/**
 * The **View** tab of a `.puml` file: the PlantUML source on one side, [PlantUmlPreviewFileEditor]'s
 * render on the other, with the platform's usual Editor / Split / Preview switch in the tab's
 * top-right corner. The same arrangement the bundled Markdown plugin uses, and the layout you pick
 * is remembered for the next file you open.
 *
 * This exists so a source-beside-render layout works **offline**: the render comes from
 * [de.tum.cit.aet.apollon.render.PlantUmlRenderService], which answers a C4 include from the macros
 * the plugin ships rather than fetching it, so a C4 file renders on a plane. A split editor from
 * another PlantUML plugin fetches its own includes over the network and cannot.
 *
 * [TextEditorWithPreview] disposes both halves in its own `dispose`, so neither is registered as a
 * child of anything else — see `PlantUmlPreviewFileEditorProvider.createEditor`.
 */
class PumlSplitFileEditor(
    editor: TextEditor,
    preview: PlantUmlPreviewFileEditor,
) : TextEditorWithPreview(editor, preview, TAB_NAME, DEFAULT_LAYOUT) {
    /** Ours, not the platform's shared `TextEditorWithPreview.SplitterProportionKey`: that one is
     *  the same string for every split editor in the IDE, so dragging this divider would move
     *  Markdown's too. */
    override val splitterProportionKey: String
        get() = "ArchitectStudio.PumlSplitEditor.Proportion"

    companion object {
        const val TAB_NAME = "View"

        /** Split, so opening a `.puml` shows the source next to the render. The platform remembers
         *  a different choice in `PropertiesComponent` under this editor's name, so this is only
         *  what an IDE that has never been told otherwise starts with. */
        val DEFAULT_LAYOUT: TextEditorWithPreview.Layout = TextEditorWithPreview.Layout.SHOW_EDITOR_AND_PREVIEW
    }
}

/**
 * The [TextEditorWithPreview.Layout] an id written into the workspace file names, or `null` for an id
 * this version does not know — or none at all, for a `.puml` last opened before this tab could split.
 *
 * Null rather than a fallback on purpose: it is what
 * `PlantUmlPreviewFileEditorProvider.readState` needs to say "this file has no opinion", leaving the
 * layout to the application-wide one the platform remembers.
 */
internal fun pumlSplitLayoutFromId(id: String?): TextEditorWithPreview.Layout? =
    // .values(), not the Kotlin `.entries` property: that resolves kotlin.enums.EnumEntries, which
    // for a *platform*-defined enum can throw a LinkageError across the plugin/platform classloader
    // boundary if the two disagree on which Kotlin stdlib built it. .values() is the plain
    // Java-visible static method and has no such indirection.
    TextEditorWithPreview.Layout.values().firstOrNull { it.id == id }
