package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.fileEditor.TextEditor
import com.intellij.openapi.fileEditor.TextEditorWithPreview
import com.intellij.openapi.fileEditor.WeighedFileEditorProvider
import com.intellij.openapi.fileEditor.impl.text.TextEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import de.tum.cit.aet.apollon.puml.isPlantUmlExtension
import org.jdom.Element

/**
 * The **View** tab, first of the three a `.puml` file opens with. Registered in `plugin.xml` under
 * `com.intellij.fileEditorProvider`.
 *
 * Builds a [PumlSplitFileEditor]: the file's source and [PlantUmlPreviewFileEditor]'s render side by
 * side, switchable between Editor / Split / Preview. The tab is named and weighted as before, so it
 * is still the tab a `.puml` opens on; only its contents gained a source pane.
 */
class PlantUmlPreviewFileEditorProvider : WeighedFileEditorProvider(), DumbAware {
    override fun accept(
        project: Project,
        file: VirtualFile,
    ): Boolean = !file.isDirectory && isPlantUmlExtension(file.extension)

    /** The halves are handed straight to [PumlSplitFileEditor] and registered as a child of nothing:
     *  [TextEditorWithPreview.dispose] disposes both itself, and disposing one thing twice is an
     *  error the platform logs. A file the platform will not give a text editor for still gets the
     *  render on its own rather than no tab at all. */
    override fun createEditor(
        project: Project,
        file: VirtualFile,
    ): FileEditor {
        // The text editor first, so a file the platform declines one for costs nothing: the other
        // order would have already built a JCEF browser with nobody left to dispose it.
        val textEditor = createTextEditor(project, file)
        val preview = PlantUmlPreviewFileEditor(project, file)
        return if (textEditor == null) preview else PumlSplitFileEditor(textEditor, preview)
    }

    private fun createTextEditor(
        project: Project,
        file: VirtualFile,
    ): TextEditor? {
        val provider = TextEditorProvider.getInstance()
        if (!provider.accept(project, file)) return null
        return provider.createEditor(project, file) as? TextEditor
    }

    /** Which layout the tab was left in for *this* file, and where the caret was in its source pane.
     *  [TextEditorWithPreview] already remembers a layout application-wide, in
     *  `PropertiesComponent`; this is what makes it per-file.
     *
     *  Every field is left null when the workspace does not name it — a `.puml` last opened before
     *  this tab could split has none of them — because `TextEditorWithPreview.setState` skips a null
     *  rather than applying it. Reading a missing layout as
     *  [PumlSplitFileEditor.DEFAULT_LAYOUT] instead would quietly override the application-wide
     *  choice on the first file anyone opens after updating. */
    override fun readState(
        sourceElement: Element,
        project: Project,
        file: VirtualFile,
    ): FileEditorState =
        TextEditorWithPreview.MyFileEditorState(
            pumlSplitLayoutFromId(sourceElement.getAttributeValue(LAYOUT_ATTRIBUTE)),
            sourceElement.getChild(SOURCE_STATE_ELEMENT)
                ?.let { TextEditorProvider.getInstance().readState(it, project, file) },
            null,
            sourceElement.getAttributeValue(VERTICAL_ATTRIBUTE).toBoolean(),
        )

    override fun writeState(
        state: FileEditorState,
        project: Project,
        targetElement: Element,
    ) {
        val split = state as? TextEditorWithPreview.MyFileEditorState ?: return
        split.splitLayout?.let { targetElement.setAttribute(LAYOUT_ATTRIBUTE, it.id) }
        targetElement.setAttribute(VERTICAL_ATTRIBUTE, split.isVerticalSplit.toString())
        val sourceState = split.firstState
        if (sourceState != null && sourceState !== FileEditorState.INSTANCE) {
            val child = Element(SOURCE_STATE_ELEMENT)
            TextEditorProvider.getInstance().writeState(sourceState, project, child)
            targetElement.addContent(child)
        }
    }

    override fun getEditorTypeId(): String = "architect-studio-puml-preview"

    /** Deliberately not `HIDE_DEFAULT_EDITOR`, which is what the platform's own
     *  `TextEditorWithPreviewProvider` uses: this tab's source pane is a convenience beside the
     *  render, not a replacement for the **Text** tab, which stays the full-width editor and stays
     *  the target of the canvas's "open as text". */
    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.PLACE_BEFORE_DEFAULT_EDITOR

    /** The lightest of this plugin's `.puml` tabs, so View comes first and is what the file opens
     *  on: it renders through PlantUML's own engine so it is right for every diagram family, and it
     *  never imports anything. */
    override fun getWeight(): Double = PUML_PREVIEW_TAB_WEIGHT

    private companion object {
        const val LAYOUT_ATTRIBUTE = "split-layout"
        const val VERTICAL_ATTRIBUTE = "vertical-split"
        const val SOURCE_STATE_ELEMENT = "source"
    }
}
