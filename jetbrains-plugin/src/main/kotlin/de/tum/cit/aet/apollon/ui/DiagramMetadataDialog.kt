package de.tum.cit.aet.apollon.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.ValidationInfo
import com.intellij.ui.ColoredListCellRenderer
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTextArea
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import de.tum.cit.aet.apollon.puml.DiagramTypeCatalog
import de.tum.cit.aet.apollon.puml.PumlDiagramMetadata
import javax.swing.JComboBox
import javax.swing.JComponent
import javax.swing.JList

/**
 * Asks for a diagram's name, description and (when not already chosen via the "New Architecture
 * Diagram" submenu) type. Used both by that wizard, where [preselectedType] is fixed, and by
 * [de.tum.cit.aet.apollon.editor.PumlCanvasFileEditor] when an existing `.puml` has no
 * [PumlDiagramMetadata] yet, where the type is asked here instead.
 */
class DiagramMetadataDialog private constructor(
    project: Project,
    private val preselectedType: String?,
) : DialogWrapper(project) {
    private val nameField = JBTextField()
    private val descriptionField = JBTextArea(4, 40).apply { lineWrap = true; wrapStyleWord = true }
    private val typeCombo =
        JComboBox(DiagramTypeCatalog.ENTRIES.toTypedArray()).apply {
            renderer =
                object : ColoredListCellRenderer<DiagramTypeCatalog.Entry>() {
                    override fun customizeCellRenderer(
                        list: JList<out DiagramTypeCatalog.Entry>,
                        value: DiagramTypeCatalog.Entry,
                        index: Int,
                        selected: Boolean,
                        hasFocus: Boolean,
                    ) {
                        append("${value.group} — ${value.label}")
                    }
                }
        }

    init {
        title = if (preselectedType != null) "New Architecture Diagram" else "Describe This Diagram"
        preselectedType?.let { tag -> DiagramTypeCatalog.byTag(tag)?.let { typeCombo.selectedItem = it } }
        init()
    }

    override fun createCenterPanel(): JComponent {
        val typeComponent: JComponent =
            if (preselectedType != null) {
                JBLabel(DiagramTypeCatalog.byTag(preselectedType)?.let { "${it.group} — ${it.label}" } ?: preselectedType)
            } else {
                typeCombo
            }
        return FormBuilder.createFormBuilder()
            .addLabeledComponent("Type", typeComponent)
            .addLabeledComponent("Name", nameField)
            .addLabeledComponent("Description", JBScrollPane(descriptionField))
            .panel
    }

    override fun getPreferredFocusedComponent(): JComponent = nameField

    override fun doValidate(): ValidationInfo? =
        if (nameField.text.isBlank()) ValidationInfo("Name is required", nameField) else null

    private fun selectedType(): String? = preselectedType ?: (typeCombo.selectedItem as? DiagramTypeCatalog.Entry)?.tag

    companion object {
        /** Shows the dialog and returns what the user entered, or `null` if they cancelled. */
        fun show(
            project: Project,
            preselectedType: String?,
        ): PumlDiagramMetadata? {
            val dialog = DiagramMetadataDialog(project, preselectedType)
            if (!dialog.showAndGet()) return null
            val type = dialog.selectedType() ?: return null
            return PumlDiagramMetadata(
                type = type,
                name = dialog.nameField.text.trim(),
                description = dialog.descriptionField.text.trim(),
            )
        }
    }
}
