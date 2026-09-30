package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import de.tum.cit.aet.apollon.document.DocumentState
import de.tum.cit.aet.apollon.document.DocumentSync
import de.tum.cit.aet.apollon.document.diagramTitle
import de.tum.cit.aet.apollon.document.readDocument
import de.tum.cit.aet.apollon.document.scaffoldModel
import de.tum.cit.aet.apollon.export.DiagramExporter
import de.tum.cit.aet.apollon.protocol.HostMessage
import de.tum.cit.aet.apollon.protocol.ProtocolException
import de.tum.cit.aet.apollon.protocol.WebviewMessage
import de.tum.cit.aet.apollon.protocol.parseWebviewMessage
import de.tum.cit.aet.apollon.puml.PumlAutoLayout
import de.tum.cit.aet.apollon.settings.ApollonConfigurable
import de.tum.cit.aet.apollon.settings.ApollonSettings
import java.beans.PropertyChangeListener
import java.beans.PropertyChangeSupport
import javax.swing.JComponent

private val LOG = Logger.getInstance(ApollonFileEditor::class.java)

/**
 * The Apollon canvas for one `.apollon` file: a JCEF browser loading the
 * `jetbrains-plugin/webview` bundle, a [DocumentSync] keeping it and the
 * IntelliJ [com.intellij.openapi.editor.Document] in step, and the message
 * plumbing between them — the IntelliJ-side counterpart of the VS Code
 * extension's `ApollonEditorProvider` (there, provider and editor are one
 * class because a `CustomTextEditorProvider` panel has no separate identity;
 * here the platform splits them into [ApollonFileEditorProvider] and this).
 */
class ApollonFileEditor(
    private val project: Project,
    private val file: VirtualFile,
) : UserDataHolderBase(), FileEditor {
    private val changeSupport = PropertyChangeSupport(this)
    private val exporter = DiagramExporter()
    private var sync: DocumentSync? = null
    private val host =
        ApollonCanvasHost(
            this,
            "This IDE was built without JCEF support, so the Architect Studio canvas cannot render.",
            ::onWebviewMessage,
        )

    init {
        FileDocumentManager.getInstance().getDocument(file)?.let { document ->
            val documentSync = DocumentSync(project, document, this)
            documentSync.onExternalChange = { state ->
                if (state !is DocumentState.Invalid) {
                    host.post(
                        HostMessage.ExternalUpdate(if (state is DocumentState.Model) state.model else null),
                    )
                }
            }
            sync = documentSync
        }
    }

    private fun onWebviewMessage(raw: String) {
        val message =
            try {
                parseWebviewMessage(raw)
            } catch (e: ProtocolException) {
                LOG.warn("dropping malformed webview message", e)
                return
            }
        val document = FileDocumentManager.getInstance().getDocument(file) ?: return
        when (message) {
            is WebviewMessage.Ready ->
                when (val state = readDocument(document.text)) {
                    is DocumentState.Empty -> host.post(HostMessage.Init(null, autoExportSetting()))
                    is DocumentState.Model -> host.post(HostMessage.Init(state.model, autoExportSetting()))
                    is DocumentState.Invalid ->
                        host.post(
                            HostMessage.Invalid(
                                "Architect Studio could not read this file: ${state.reason}. Open it as text to " +
                                    "repair the contents, then come back to the canvas.",
                            ),
                        )
                }
            is WebviewMessage.Create -> {
                // Route the scaffold through the normal edit path, not a direct
                // write: it lands as a dirty, undoable change, matching the VS
                // Code extension's rationale (a mis-click is one Ctrl+Z away).
                if (document.text.isNotBlank()) {
                    return
                }
                val model = scaffoldModel(message.diagramType, diagramTitle(file.path))
                host.post(HostMessage.Init(model, autoExportSetting()))
                sync?.onCanvasModel(model)
            }
            is WebviewMessage.ModelChanged -> sync?.onCanvasModel(message.model)
            is WebviewMessage.ReopenAsText ->
                FileEditorManager.getInstance(project).setSelectedEditor(file, TEXT_EDITOR_TYPE_ID)
            is WebviewMessage.ConfigureAutoExport ->
                ShowSettingsUtil.getInstance().showSettingsDialog(project, ApollonConfigurable(project))
            is WebviewMessage.ExportResult -> exporter.settle(message.requestId, message.payload, null)
            is WebviewMessage.ExportFailed -> exporter.settle(message.requestId, null, message.reason)
            is WebviewMessage.AutoLayout -> host.post(HostMessage.ApplyLayout(PumlAutoLayout.arrange(message.model)))
        }
    }

    /** Arrange this canvas, for the auto-layout action. */
    fun requestAutoLayout() = host.post(HostMessage.AutoLayoutRequested)

    private fun autoExportSetting() = ApollonSettings.getInstance(project).autoExport

    /** Flush a pending canvas edit before a save persists the document. */
    fun flushForSave() = sync?.flushForSave()

    /** Push the current auto-export setting to this canvas, e.g. after it changes in Settings. */
    fun applyAutoExportSetting() = host.post(HostMessage.AutoExportChanged(autoExportSetting()))

    /** Render the diagram in this editor's canvas, for the export action/auto-export. */
    fun export(
        format: de.tum.cit.aet.apollon.protocol.ExportFormat,
        silent: Boolean,
    ) {
        exporter.write(file.path, format, silent) { requestId ->
            host.post(HostMessage.Export(format, requestId))
        }
    }

    override fun getComponent(): JComponent = host.component

    override fun getPreferredFocusedComponent(): JComponent = host.component

    override fun getName(): String = "Diagram"

    // Required FileEditor override; this editor has no state to restore beyond the file itself.
    override fun setState(state: FileEditorState) = Unit

    override fun isModified(): Boolean = FileDocumentManager.getInstance().isFileModified(file)

    override fun isValid(): Boolean = file.isValid

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {
        changeSupport.addPropertyChangeListener(listener)
    }

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {
        changeSupport.removePropertyChangeListener(listener)
    }

    override fun getFile(): VirtualFile = file

    override fun dispose() {
        exporter.cancelAll()
        sync?.dispose()
    }
}
