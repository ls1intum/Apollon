package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.WeighedFileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import de.tum.cit.aet.apollon.puml.LAYOUT_SIDECAR_SUFFIX
import de.tum.cit.aet.apollon.puml.isPlantUmlExtension

/**
 * The **Edit** tab, second of the three a `.puml` file opens with. Registered in `plugin.xml` under
 * `com.intellij.fileEditorProvider`.
 *
 * `accept` deliberately does not read the file: a PlantUML family this plugin cannot model yet is
 * reported inside the tab ([PumlCanvasFileEditor]), which is both cheaper on a background thread
 * and clearer to the user than a tab that silently disappears for some files.
 */
class PumlCanvasFileEditorProvider : WeighedFileEditorProvider(), DumbAware {
    override fun accept(
        project: Project,
        file: VirtualFile,
    ): Boolean =
        !file.isDirectory &&
            isPlantUmlExtension(file.extension) &&
            // `orders.puml.layout.json` is a sibling of `orders.puml`, not a diagram: `.json` is
            // not a PlantUML extension so this cannot currently match, but the guard keeps the
            // sidecar out of the canvas if the naming scheme ever changes.
            !file.name.endsWith(LAYOUT_SIDECAR_SUFFIX)

    override fun createEditor(
        project: Project,
        file: VirtualFile,
    ): FileEditor = PumlCanvasFileEditor(project, file)

    override fun getEditorTypeId(): String = "architect-studio-puml-canvas"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.PLACE_BEFORE_DEFAULT_EDITOR

    /** Heavier than [PlantUmlPreviewFileEditorProvider]'s, so the tab strip reads View, Edit, Text.
     *  The platform sorts providers by policy first and by this weight second, and selects the
     *  first one for a file it has no remembered choice for — which is why View, not this, is what
     *  a `.puml` opens on. */
    override fun getWeight(): Double = PUML_CANVAS_TAB_WEIGHT
}

internal const val PUML_PREVIEW_TAB_WEIGHT = 10.0
internal const val PUML_CANVAS_TAB_WEIGHT = 20.0
