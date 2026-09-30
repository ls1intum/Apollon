package de.tum.cit.aet.apollon.actions

import com.intellij.openapi.actionSystem.ActionGroup
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.actionSystem.LangDataKeys
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.vfs.VirtualFile
import de.tum.cit.aet.apollon.puml.DiagramTypeCatalog
import de.tum.cit.aet.apollon.puml.PumlScaffold
import de.tum.cit.aet.apollon.ui.DiagramMetadataDialog

/**
 * "Architecture Diagram" under the platform's own `NewGroup` — the extension point behind both the
 * File > New menu and the Project view's right-click New menu, so one registration in `plugin.xml`
 * covers both. Built dynamically from [DiagramTypeCatalog] rather than one `<action>` per type in
 * `plugin.xml`, so a new catalog entry needs no XML change.
 */
class NewArchitectureDiagramActionGroup : ActionGroup(), DumbAware {
    init {
        isPopup = true
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    override fun getChildren(e: AnActionEvent?): Array<AnAction> =
        DiagramTypeCatalog.GROUPS.map { group ->
            val submenu = DefaultActionGroup(group, true)
            DiagramTypeCatalog.byGroup(group).forEach { entry ->
                submenu.add(
                    object : DumbAwareAction(entry.label) {
                        override fun actionPerformed(event: AnActionEvent) = createArchitectureDiagram(event, entry)
                    },
                )
            }
            submenu
        }.toTypedArray()

    private fun createArchitectureDiagram(
        e: AnActionEvent,
        entry: DiagramTypeCatalog.Entry,
    ) {
        val project = e.project ?: return
        val directory =
            e.dataContext.getData(LangDataKeys.IDE_VIEW)?.getOrChooseDirectory() ?: return
        val metadata = DiagramMetadataDialog.show(project, entry.tag) ?: return
        val text = PumlScaffold.textForTag(entry.tag, metadata) ?: return
        val fileName = uniqueFileName(directory.virtualFile, slugify(metadata.name ?: entry.label))

        var created: VirtualFile? = null
        WriteCommandAction.runWriteCommandAction(project, "New Architecture Diagram", null, {
            val vFile = directory.virtualFile.createChildData(this, fileName)
            VfsUtil.saveText(vFile, text)
            created = vFile
        })
        val virtualFile = created ?: return

        val editorManager = FileEditorManager.getInstance(project)
        editorManager.openFile(virtualFile, true)
        editorManager.setSelectedEditor(virtualFile, "architect-studio-puml-canvas")
    }

    private fun slugify(raw: String): String =
        raw.trim().replace(Regex("[^A-Za-z0-9]+"), "-").trim('-').ifEmpty { "diagram" }

    private fun uniqueFileName(
        directory: VirtualFile,
        base: String,
    ): String {
        var candidate = "$base.puml"
        var counter = 2
        while (directory.findChild(candidate) != null) {
            candidate = "$base-$counter.puml"
            counter++
        }
        return candidate
    }
}
