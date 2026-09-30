package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.editor.Document
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileDocumentManagerListener
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManager
import de.tum.cit.aet.apollon.protocol.AutoExport
import de.tum.cit.aet.apollon.protocol.ExportFormat
import de.tum.cit.aet.apollon.settings.ApollonSettings

/**
 * Flushes a pending canvas edit before a save persists the document — the
 * Kotlin counterpart of the VS Code extension's `onWillSaveTextDocument`
 * hook — and, immediately after, writes the auto-export sibling image if one
 * is configured (the extension's separate `onDidSaveTextDocument` hook: there
 * is no distinct "after save" signal as convenient as this one, and the
 * document's on-disk write happens synchronously right after this callback
 * returns, so a few milliseconds early is close enough).
 *
 * `FileDocumentManagerListener` only exists at application scope (see its
 * `TOPIC`), so this walks every open project's editors for the file being
 * saved rather than being registered per-project.
 */
class ApollonSaveListener : FileDocumentManagerListener {
    override fun beforeDocumentSaving(document: Document) {
        val file = FileDocumentManager.getInstance().getFile(document) ?: return
        // An untitled or otherwise non-local file has no sibling to write an export next to.
        val canExport = file.isInLocalFileSystem
        for (project in ProjectManager.getInstance().openProjects) {
            for (editor in FileEditorManager.getInstance(project).getEditors(file)) {
                // Both canvases write into this same document — a `.puml` one via an export to
                // PlantUML — so the flush has to land before the platform persists it. There is no
                // second file to reconcile afterwards.
                val export: ((ExportFormat, Boolean) -> Unit) =
                    when (editor) {
                        is PumlCanvasFileEditor -> {
                            editor.flushForSave()
                            editor::export
                        }
                        is ApollonFileEditor -> {
                            editor.flushForSave()
                            editor::export
                        }
                        else -> continue
                    }
                if (canExport) {
                    runAutoExport(project, export)
                }
            }
        }
    }

    private fun runAutoExport(
        project: Project,
        export: (ExportFormat, Boolean) -> Unit,
    ) {
        when (ApollonSettings.getInstance(project).autoExport) {
            AutoExport.off -> {}
            AutoExport.svg -> export(ExportFormat.svg, true)
            AutoExport.png -> export(ExportFormat.png, true)
        }
    }
}
