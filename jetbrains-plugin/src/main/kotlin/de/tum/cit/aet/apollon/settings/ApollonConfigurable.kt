package de.tum.cit.aet.apollon.settings

import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import de.tum.cit.aet.apollon.editor.ApollonFileEditor
import de.tum.cit.aet.apollon.protocol.AutoExport
import java.awt.BorderLayout
import javax.swing.JComboBox
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JPanel

/** Project settings page: Settings/Preferences > Tools > Apollon. */
class ApollonConfigurable(private val project: Project) : Configurable {
    private var combo: JComboBox<AutoExport>? = null

    override fun getDisplayName(): String = "Apollon"

    override fun createComponent(): JComponent {
        val box = JComboBox(AutoExport.entries.toTypedArray())
        box.selectedItem = ApollonSettings.getInstance(project).autoExport
        combo = box
        return JPanel(BorderLayout(8, 0)).apply {
            add(JLabel("Export image on save:"), BorderLayout.WEST)
            add(box, BorderLayout.CENTER)
        }
    }

    override fun isModified(): Boolean = combo?.selectedItem != ApollonSettings.getInstance(project).autoExport

    override fun apply() {
        val value = combo?.selectedItem as? AutoExport ?: return
        ApollonSettings.getInstance(project).autoExport = value
        // Persisting the setting doesn't reach already-open canvases on its
        // own — push it so they reflect the change without needing to be
        // reopened.
        FileEditorManager.getInstance(project).allEditors
            .filterIsInstance<ApollonFileEditor>()
            .forEach { it.applyAutoExportSetting() }
    }

    override fun reset() {
        combo?.selectedItem = ApollonSettings.getInstance(project).autoExport
    }

    override fun disposeUIResources() {
        combo = null
    }
}
