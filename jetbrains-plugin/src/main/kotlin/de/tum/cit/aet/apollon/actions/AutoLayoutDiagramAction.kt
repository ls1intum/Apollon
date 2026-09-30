package de.tum.cit.aet.apollon.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorManager
import de.tum.cit.aet.apollon.editor.ApollonFileEditor
import de.tum.cit.aet.apollon.editor.PumlCanvasFileEditor

/**
 * Re-arranges the focused canvas: relationships decide the rows, unconnected elements are packed
 * into a grid underneath (see [de.tum.cit.aet.apollon.puml.PumlAutoLayout]).
 *
 * Offered for both canvases this plugin hosts — a native `.apollon` diagram and the **Edit** tab of
 * a `.puml` — unlike [ExportDiagramAction], which only ever matched `ApollonFileEditor` and is
 * therefore invisible on a `.puml` canvas that can export perfectly well.
 *
 * The work is not done here: the canvas is asked for its model first, because it holds the sizes the
 * browser measured and any edit still inside the host's commit debounce. It comes back through
 * `WebviewMessage.AutoLayout`.
 */
class AutoLayoutDiagramAction : AnAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = focusedCanvas(e) != null
    }

    override fun actionPerformed(e: AnActionEvent) {
        when (val editor = focusedCanvas(e)) {
            is ApollonFileEditor -> editor.requestAutoLayout()
            is PumlCanvasFileEditor -> editor.requestAutoLayout()
            else -> Unit
        }
    }

    private fun focusedCanvas(e: AnActionEvent): FileEditor? {
        val project = e.project ?: return null
        return FileEditorManager.getInstance(project).selectedEditor
            ?.takeIf { it is ApollonFileEditor || it is PumlCanvasFileEditor }
    }
}
