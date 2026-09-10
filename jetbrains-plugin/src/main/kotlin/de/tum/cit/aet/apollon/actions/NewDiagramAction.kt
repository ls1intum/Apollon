package de.tum.cit.aet.apollon.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileChooser.FileChooserFactory
import com.intellij.openapi.fileChooser.FileSaverDescriptor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.vfs.LocalFileSystem
import de.tum.cit.aet.apollon.document.diagramTitle
import de.tum.cit.aet.apollon.document.scaffoldDocument
import de.tum.cit.aet.apollon.protocol.DIAGRAM_TYPES
import java.nio.file.Files
import java.nio.file.Path

/**
 * Create a diagram: pick a type, pick a location, open it. Ported from the
 * VS Code extension's `newDiagram` command — the save dialog is the
 * platform's own, so the filename is legal by construction.
 */
class NewDiagramAction : AnAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val popup =
            JBPopupFactory.getInstance()
                .createPopupChooserBuilder(DIAGRAM_TYPES.entries.toList())
                .setTitle("New Apollon Diagram")
                .setRenderer { _, value, _, _, _ -> javax.swing.JLabel(value.value) }
                .setItemChosenCallback { entry -> createDiagram(project, entry.key) }
                .createPopup()
        popup.showCenteredInCurrentWindow(project)
    }

    private fun createDiagram(
        project: Project,
        diagramType: String,
    ) {
        val descriptor = FileSaverDescriptor("Create Diagram", "Choose where to save the new diagram", "apollon")
        val dialog = FileChooserFactory.getInstance().createSaveFileDialog(descriptor, project)
        val baseDir = Path.of(project.basePath ?: System.getProperty("user.home"))
        val wrapper = dialog.save(baseDir, "diagram.apollon") ?: return
        val path = wrapper.file.toPath()
        val contents = scaffoldDocument(diagramType, diagramTitle(path.fileName.toString()))
        Files.writeString(path, contents)
        val virtualFile = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(path) ?: return
        FileEditorManager.getInstance(project).openFile(virtualFile, true)
    }
}
