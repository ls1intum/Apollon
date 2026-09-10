package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

/** Registered in `plugin.xml` under `com.intellij.fileEditorProvider`. */
class ApollonFileEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(
        project: Project,
        file: VirtualFile,
    ): Boolean = !file.isDirectory && "apollon".equals(file.extension, ignoreCase = true)

    override fun createEditor(
        project: Project,
        file: VirtualFile,
    ): FileEditor = ApollonFileEditor(project, file)

    override fun getEditorTypeId(): String = "apollon-diagram-editor"

    // Diagram tab alongside the plain-text tab, diagram selected first — not
    // HIDE_DEFAULT_EDITOR (its javadoc now points at HIDE_OTHER_EDITORS
    // instead). Keeping the text tab is what makes `reopenAsText` meaningful
    // and gives the invalid-file notice somewhere to send the user.
    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.PLACE_BEFORE_DEFAULT_EDITOR
}
