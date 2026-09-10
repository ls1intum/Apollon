package de.tum.cit.aet.apollon.toolwindow

import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.psi.search.FilenameIndex
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.ui.ColoredListCellRenderer
import com.intellij.ui.SimpleTextAttributes
import com.intellij.ui.components.JBList
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.content.ContentFactory
import com.intellij.util.concurrency.AppExecutorUtil
import java.awt.BorderLayout
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.DefaultListModel
import javax.swing.JButton
import javax.swing.JList
import javax.swing.JPanel
import javax.swing.ListSelectionModel

/**
 * The workspace's diagrams, listed by name — a lightweight IntelliJ
 * counterpart of the VS Code extension's `DiagramTreeProvider` (there, a
 * native tree with a filesystem watcher; here, a flat list with a manual
 * refresh — good enough for a project with a handful of diagrams, and
 * simpler than wiring an async VFS listener for a Phase 5 scaffold).
 * Double-click opens.
 */
class DiagramToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(
        project: Project,
        toolWindow: ToolWindow,
    ) {
        val model = DefaultListModel<VirtualFile>()
        val list = JBList(model)
        list.selectionMode = ListSelectionModel.SINGLE_SELECTION
        list.cellRenderer =
            object : ColoredListCellRenderer<VirtualFile>() {
                override fun customizeCellRenderer(
                    list: JList<out VirtualFile>,
                    value: VirtualFile,
                    index: Int,
                    selected: Boolean,
                    hasFocus: Boolean,
                ) {
                    append(value.name)
                    val parent = value.parent?.path?.removePrefix(project.basePath ?: "")?.trimStart('/')
                    if (!parent.isNullOrEmpty()) {
                        append("  $parent", SimpleTextAttributes.GRAYED_ATTRIBUTES)
                    }
                }
            }
        list.addMouseListener(
            object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    if (e.clickCount == 2) {
                        list.selectedValue?.let { FileEditorManager.getInstance(project).openFile(it, true) }
                    }
                }
            },
        )

        // FilenameIndex reads the index, which needs a read lock — calling it
        // straight from a Swing listener (EDT, no lock held) throws
        // "Read access is allowed from inside read-action only". Off-thread
        // + finishOnUiThread also keeps a large project's index scan from
        // freezing the EDT.
        fun refresh() {
            ReadAction.nonBlocking<List<VirtualFile>> {
                FilenameIndex.getAllFilesByExt(project, "apollon", GlobalSearchScope.projectScope(project))
                    .sortedBy { it.path }
            }
                .finishOnUiThread(ModalityState.defaultModalityState()) { files ->
                    model.clear()
                    files.forEach(model::addElement)
                }
                .submit(AppExecutorUtil.getAppExecutorService())
        }
        refresh()

        val panel =
            JPanel(BorderLayout()).apply {
                add(JBScrollPane(list), BorderLayout.CENTER)
                add(JButton("Refresh").apply { addActionListener { refresh() } }, BorderLayout.SOUTH)
            }
        val content = ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }
}
