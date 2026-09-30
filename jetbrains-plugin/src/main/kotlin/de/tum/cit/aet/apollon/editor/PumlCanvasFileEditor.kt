package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Document
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.components.JBLabel
import de.tum.cit.aet.apollon.document.PumlCanvasState
import de.tum.cit.aet.apollon.document.PumlDocumentBridge
import de.tum.cit.aet.apollon.export.DiagramExporter
import de.tum.cit.aet.apollon.notify.ArchitectStudioNotifications
import de.tum.cit.aet.apollon.protocol.ExportFormat
import de.tum.cit.aet.apollon.protocol.HostMessage
import de.tum.cit.aet.apollon.protocol.ProtocolException
import de.tum.cit.aet.apollon.protocol.WebviewMessage
import de.tum.cit.aet.apollon.protocol.parseWebviewMessage
import de.tum.cit.aet.apollon.puml.DiagramTypeCatalog
import de.tum.cit.aet.apollon.puml.PumlAutoLayout
import de.tum.cit.aet.apollon.puml.PumlDiagramMetadataCodec
import de.tum.cit.aet.apollon.puml.PumlScaffold
import de.tum.cit.aet.apollon.settings.ApollonConfigurable
import de.tum.cit.aet.apollon.settings.ApollonSettings
import de.tum.cit.aet.apollon.ui.DiagramMetadataDialog
import java.awt.BorderLayout
import java.beans.PropertyChangeListener
import java.beans.PropertyChangeSupport
import javax.swing.JComponent
import javax.swing.JPanel

private val LOG = Logger.getInstance(PumlCanvasFileEditor::class.java)

/**
 * The **Edit** tab of a `.puml` file: the Apollon canvas, bound to the PlantUML file itself.
 *
 * Sits alongside [PumlSplitFileEditor] ("View") and the platform's own text editor on the one
 * document, so the three tabs are three views of a single file — an edit made on the canvas is
 * already there when you switch to the text, and vice versa. [PumlDocumentBridge] owns the
 * translation in both directions; this class is only the JCEF wiring and the protocol.
 *
 * A `.puml` whose family this plugin cannot model yet (Sequence, Activity, C4, ...) still gets this
 * tab, showing why rather than hiding: the render in View works for every family, so a missing Edit
 * tab would read as the file being broken instead of the feature being unfinished.
 */
class PumlCanvasFileEditor(
    private val project: Project,
    private val file: VirtualFile,
) : UserDataHolderBase(), FileEditor {
    private val changeSupport = PropertyChangeSupport(this)
    private val exporter = DiagramExporter()
    private val host =
        ApollonCanvasHost(
            this,
            "This IDE was built without JCEF support, so the Architect Studio canvas cannot render.",
            ::onWebviewMessage,
        )

    /** Phase-1 stand-in for a real per-type palette (plan §4): names the diagram's recorded type,
     *  or says none is set yet, rather than showing any actual different tools. */
    private val toolsetBanner = JBLabel()
    private val rootComponent =
        JPanel(BorderLayout()).apply {
            add(toolsetBanner, BorderLayout.NORTH)
            add(host.component, BorderLayout.CENTER)
        }
    private var bridge: PumlDocumentBridge? = null

    /** Reported once per import, not once per keystroke — the balloon is a heads-up, not a log. */
    private var reportedUnsupportedCount = -1

    /** Whether this editor instance has already asked about a missing [PumlDiagramMetadataCodec]
     *  block — asked at most once per time the file is opened, not on every focus. */
    private var promptedForMetadata = false

    init {
        FileDocumentManager.getInstance().getDocument(file)?.let { document ->
            val documentBridge = PumlDocumentBridge(project, document, file, this)
            documentBridge.onExternalChange = { state -> publish(state, HostMessage::ExternalUpdate) }
            documentBridge.onWriteRejected = { reason ->
                ArchitectStudioNotifications.error(
                    project,
                    "Could not update \"${file.name}\"",
                    "This canvas edit could not be written back as PlantUML safely, so the file was left " +
                        "as it was: $reason. Undo the edit to bring the canvas back in line with the file.",
                )
            }
            bridge = documentBridge
            refreshToolsetBanner(document.text)
            ApplicationManager.getApplication().invokeLater {
                if (!project.isDisposed) ensureMetadata(document)
            }
        }
    }

    /** An existing file with no diagram-type metadata: ask once, then write the answer in as the
     *  file's own `' @architect-studio-diagram ...` comment (see [PumlDiagramMetadataCodec]) so it
     *  opens straight to its tools next time. Declining leaves the file untouched. */
    private fun ensureMetadata(document: Document) {
        if (promptedForMetadata || document.text.isBlank()) return
        promptedForMetadata = true
        if (DiagramTypeCatalog.byTag(PumlDiagramMetadataCodec.parse(document.text).type) != null) return
        val metadata = DiagramMetadataDialog.show(project, preselectedType = null) ?: return
        WriteCommandAction.runWriteCommandAction(project, "Set Diagram Metadata", null, {
            document.setText(PumlDiagramMetadataCodec.withMetadata(document.text, metadata))
        })
        refreshToolsetBanner(document.text)
    }

    private fun refreshToolsetBanner(text: String) {
        val metadata = PumlDiagramMetadataCodec.parse(text)
        toolsetBanner.text =
            DiagramTypeCatalog.byTag(metadata.type)
                ?.let { "  ${it.group} ${it.label} diagram tools loaded" }
                ?: "  No diagram type set — tools not loaded"
    }

    /** Push [state] to the canvas, choosing the message the current phase calls for: the initial
     *  handshake needs an `init`, a later document change needs an `externalUpdate`. */
    private fun publish(
        state: PumlCanvasState,
        asUpdate: (kotlinx.serialization.json.JsonObject?) -> HostMessage,
    ) {
        FileDocumentManager.getInstance().getDocument(file)?.let { refreshToolsetBanner(it.text) }
        when (state) {
            is PumlCanvasState.Model -> {
                host.post(asUpdate(state.model))
                reportUnsupported(state.unsupportedCount)
            }
            // Always an `init`, never an `externalUpdate`: emptying the file out from under the
            // canvas (an undone scaffold, a revert) has to put the picker back, and only `init`
            // carries the type list the picker is allowed to offer.
            is PumlCanvasState.Empty -> host.post(HostMessage.Init(null, autoExportSetting(), PumlScaffold.diagramTypes))
            is PumlCanvasState.Unsupported -> host.post(HostMessage.Invalid("This file ${state.reason}."))
        }
    }

    private fun reportUnsupported(count: Int) {
        if (count <= 0 || count == reportedUnsupportedCount) {
            return
        }
        reportedUnsupportedCount = count
        ArchitectStudioNotifications.warn(
            project,
            "Some PlantUML is kept but not shown on the canvas",
            "\"${file.name}\" has $count line(s) Architect Studio can't display. They're preserved " +
                "as-is and will still be there after you save.",
        )
    }

    private fun onWebviewMessage(raw: String) {
        val message =
            try {
                parseWebviewMessage(raw)
            } catch (e: ProtocolException) {
                LOG.warn("dropping malformed webview message", e)
                return
            }
        val bridge = bridge ?: return
        when (message) {
            is WebviewMessage.Ready ->
                publish(bridge.currentState()) { model -> HostMessage.Init(model, autoExportSetting()) }
            // The picker only ever offers `PumlScaffold.diagramTypes`, but the choice arrives from
            // the webview, so the bridge re-checks it rather than trusting the message.
            is WebviewMessage.Create ->
                bridge.scaffold(message.diagramType)?.let { state ->
                    publish(state) { model -> HostMessage.Init(model, autoExportSetting()) }
                }
            is WebviewMessage.ModelChanged -> bridge.onCanvasModel(message.model)
            is WebviewMessage.ReopenAsText ->
                FileEditorManager.getInstance(project).setSelectedEditor(file, TEXT_EDITOR_TYPE_ID)
            is WebviewMessage.ConfigureAutoExport ->
                ShowSettingsUtil.getInstance().showSettingsDialog(project, ApollonConfigurable(project))
            is WebviewMessage.ExportResult -> exporter.settle(message.requestId, message.payload, null)
            is WebviewMessage.ExportFailed -> exporter.settle(message.requestId, null, message.reason)
            // Arranging changes positions only, so the regenerated PlantUML is byte-identical and
            // the document is never touched — the sidecar write inside `onCanvasModel` is what
            // records it, exactly as it does for a node drag.
            is WebviewMessage.AutoLayout -> host.post(HostMessage.ApplyLayout(PumlAutoLayout.arrange(message.model)))
        }
    }

    /** Arrange this canvas, for the auto-layout action. */
    fun requestAutoLayout() = host.post(HostMessage.AutoLayoutRequested)

    private fun autoExportSetting() = ApollonSettings.getInstance(project).autoExport

    /** Flush a pending canvas edit before a save persists the document. */
    fun flushForSave() = bridge?.flushForSave()

    /** Push the current auto-export setting to this canvas, e.g. after it changes in Settings. */
    fun applyAutoExportSetting() = host.post(HostMessage.AutoExportChanged(autoExportSetting()))

    /** Render the diagram in this editor's canvas, for the export action/auto-export. */
    fun export(
        format: ExportFormat,
        silent: Boolean,
    ) {
        exporter.write(file.path, format, silent) { requestId ->
            host.post(HostMessage.Export(format, requestId))
        }
    }

    override fun getComponent(): JComponent = rootComponent

    override fun getPreferredFocusedComponent(): JComponent = host.component

    override fun getName(): String = "Edit"

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
        bridge?.dispose()
    }
}
