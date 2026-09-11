package de.tum.cit.aet.apollon.editor

import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.colors.EditorColorsListener
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
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
import de.tum.cit.aet.apollon.protocol.toJsonString
import de.tum.cit.aet.apollon.settings.ApollonConfigurable
import de.tum.cit.aet.apollon.settings.ApollonSettings
import de.tum.cit.aet.apollon.theme.currentThemeTokens
import de.tum.cit.aet.apollon.theme.toInjectionScript
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import org.cef.network.CefRequest
import java.beans.PropertyChangeListener
import java.beans.PropertyChangeSupport
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.SwingConstants

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
    private val browser: JBCefBrowser?
    private val component: JComponent

    init {
        if (!JBCefApp.isSupported()) {
            browser = null
            component =
                JLabel(
                    "This IDE was built without JCEF support, so the Apollon canvas cannot render.",
                    SwingConstants.CENTER,
                )
        } else {
            val b = JBCefBrowser()
            Disposer.register(this, b)
            browser = b

            b.jbCefClient.addRequestHandler(ApollonWebviewRequestHandler(this), b.cefBrowser)

            // Synchronous, fire-and-forget: `onQuery` always answers `success("")`
            // immediately, so a real reply (the export round trip) travels back
            // through `postToWebview`/`requestId`, not through this call's return.
            val toHost = JBCefJSQuery.create(b as JBCefBrowserBase)
            toHost.addHandler { request ->
                // Runs on the CEF handler thread, not the EDT.
                ApplicationManager.getApplication().invokeLater { onWebviewMessage(request) }
                null
            }

            b.jbCefClient.addLoadHandler(
                object : CefLoadHandlerAdapter() {
                    // The webview's `App` posts "ready" from a `useEffect` that fires
                    // as soon as its module script runs — which happens well before
                    // the `load` event, since `onLoadEnd` waits on every subresource
                    // (fonts, the export WASM, workers). Injecting the bridge there
                    // loses the race: `__apollonPostToHost` is still undefined when
                    // "ready" fires, that post is a silent no-op (optional chaining
                    // in `jcefBridge.ts`), and the canvas never leaves its loading
                    // state. `onLoadStart` fires right after navigation commits, before
                    // the new document's own scripts run, so inject it here instead.
                    override fun onLoadStart(
                        cefBrowser: CefBrowser,
                        frame: CefFrame,
                        transitionType: CefRequest.TransitionType,
                    ) {
                        if (frame.isMain) {
                            cefBrowser.executeJavaScript(
                                "window.__apollonPostToHost = function(payload) {" +
                                    toHost.inject("payload") +
                                    "};",
                                cefBrowser.url,
                                0,
                            )
                        }
                    }

                    override fun onLoadEnd(
                        cefBrowser: CefBrowser,
                        frame: CefFrame,
                        httpStatusCode: Int,
                    ) {
                        if (frame.isMain) {
                            pushTheme()
                        }
                    }
                },
                b.cefBrowser,
            )

            ApplicationManager.getApplication().messageBus.connect(this).apply {
                subscribe(
                    LafManagerListener.TOPIC,
                    LafManagerListener { ApplicationManager.getApplication().invokeLater { pushTheme() } },
                )
                subscribe(
                    EditorColorsManager.TOPIC,
                    EditorColorsListener { ApplicationManager.getApplication().invokeLater { pushTheme() } },
                )
            }

            b.loadURL(WEBVIEW_URL)
            component = b.component
        }

        FileDocumentManager.getInstance().getDocument(file)?.let { document ->
            val documentSync = DocumentSync(project, document, this)
            documentSync.onExternalChange = { state ->
                if (state !is DocumentState.Invalid) {
                    postToWebview(
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
                    is DocumentState.Empty -> postToWebview(HostMessage.Init(null, autoExportSetting()))
                    is DocumentState.Model -> postToWebview(HostMessage.Init(state.model, autoExportSetting()))
                    is DocumentState.Invalid -> postToWebview(HostMessage.Invalid(state.reason))
                }
            is WebviewMessage.Create -> {
                // Route the scaffold through the normal edit path, not a direct
                // write: it lands as a dirty, undoable change, matching the VS
                // Code extension's rationale (a mis-click is one Ctrl+Z away).
                if (document.text.isNotBlank()) {
                    return
                }
                val model = scaffoldModel(message.diagramType, diagramTitle(file.path))
                postToWebview(HostMessage.Init(model, autoExportSetting()))
                sync?.onCanvasModel(model)
            }
            is WebviewMessage.ModelChanged -> sync?.onCanvasModel(message.model)
            is WebviewMessage.ReopenAsText ->
                FileEditorManager.getInstance(project).setSelectedEditor(file, TEXT_EDITOR_TYPE_ID)
            is WebviewMessage.ConfigureAutoExport ->
                ShowSettingsUtil.getInstance().showSettingsDialog(project, ApollonConfigurable(project))
            is WebviewMessage.ExportResult -> exporter.settle(message.requestId, message.payload, null)
            is WebviewMessage.ExportFailed -> exporter.settle(message.requestId, null, message.reason)
        }
    }

    private fun autoExportSetting() = ApollonSettings.getInstance(project).autoExport

    private fun pushTheme() {
        val cefBrowser = browser?.cefBrowser ?: return
        cefBrowser.executeJavaScript(currentThemeTokens().toInjectionScript(), cefBrowser.url, 0)
    }

    private fun postToWebview(message: HostMessage) {
        val cefBrowser = browser?.cefBrowser ?: return
        // The message is already valid JSON, which is always a valid JS
        // expression — no string-escaping needed to splice it into the call.
        cefBrowser.executeJavaScript(
            "window.__apollonReceiveFromHost && window.__apollonReceiveFromHost(${message.toJsonString()});",
            cefBrowser.url,
            0,
        )
    }

    /** Flush a pending canvas edit before a save persists the document. */
    fun flushForSave() = sync?.flushForSave()

    /** Push the current auto-export setting to this canvas, e.g. after it changes in Settings. */
    fun applyAutoExportSetting() = postToWebview(HostMessage.AutoExportChanged(autoExportSetting()))

    /** Render the diagram in this editor's canvas, for the export action/auto-export. */
    fun export(
        format: de.tum.cit.aet.apollon.protocol.ExportFormat,
        silent: Boolean,
    ) {
        exporter.write(file.path, format, silent) { requestId ->
            postToWebview(HostMessage.Export(format, requestId))
        }
    }

    override fun getComponent(): JComponent = component

    override fun getPreferredFocusedComponent(): JComponent = component

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

    companion object {
        /** `TextEditorProvider.getInstance().getEditorTypeId()` — a long-stable
         *  platform constant, referenced by id rather than by class because the
         *  class itself is not on this plugin's compile-time platform classpath. */
        private const val TEXT_EDITOR_TYPE_ID = "text-editor"
    }
}
