package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.WeighedFileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import de.tum.cit.aet.apollon.puml.isPlantUmlExtension

/**
 * The **View** tab, first of the three a `.puml` file opens with. Registered in `plugin.xml` under
 * `com.intellij.fileEditorProvider`.
 */
class PlantUmlPreviewFileEditorProvider : WeighedFileEditorProvider(), DumbAware {
    override fun accept(
        project: Project,
        file: VirtualFile,
    ): Boolean = !file.isDirectory && isPlantUmlExtension(file.extension)

    override fun createEditor(
        project: Project,
        file: VirtualFile,
    ): FileEditor = PlantUmlPreviewFileEditor(project, file)

    override fun getEditorTypeId(): String = "architect-studio-puml-preview"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.PLACE_BEFORE_DEFAULT_EDITOR

    /** The lightest of this plugin's `.puml` tabs, so View comes first and is what the file opens
     *  on: it is read-only, it renders through PlantUML's own engine so it is right for every
     *  diagram family, and it never imports anything. */
    override fun getWeight(): Double = PUML_PREVIEW_TAB_WEIGHT
}
