package de.tum.cit.aet.apollon.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.ui.popup.JBPopupFactory
import de.tum.cit.aet.apollon.editor.ApollonFileEditor
import de.tum.cit.aet.apollon.protocol.ExportFormat

/** Export the focused diagram to a sibling image, asking for the format. */
class ExportDiagramAction : AnAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabledAndVisible =
            project != null && FileEditorManager.getInstance(project).selectedEditor is ApollonFileEditor
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = FileEditorManager.getInstance(project).selectedEditor as? ApollonFileEditor
        if (editor == null) {
            Messages.showErrorDialog(project, "No Apollon diagram is focused.", "Export Diagram")
            return
        }
        val popup =
            JBPopupFactory.getInstance()
                .createPopupChooserBuilder(ExportFormat.entries.toList())
                .setTitle("Export Diagram")
                .setRenderer { _, value, _, _, _ -> javax.swing.JLabel(value.name.uppercase()) }
                .setItemChosenCallback { format -> editor.export(format, silent = false) }
                .createPopup()
        popup.showCenteredInCurrentWindow(project)
    }
}
