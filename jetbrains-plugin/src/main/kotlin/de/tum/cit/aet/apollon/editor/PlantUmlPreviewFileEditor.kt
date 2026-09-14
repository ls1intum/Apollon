package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.util.Alarm
import de.tum.cit.aet.apollon.render.PlantUmlRenderService
import de.tum.cit.aet.apollon.theme.currentThemeTokens
import java.awt.Color
import java.beans.PropertyChangeListener
import java.beans.PropertyChangeSupport
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.SwingConstants

/**
 * The read-only **View** tab for any `.puml`/`.plantuml` file: renders through
 * [PlantUmlRenderService], the real `plantuml-mit` engine, so it works for every diagram family —
 * including the ones [de.tum.cit.aet.apollon.puml.PlantUmlDiagramImporter] can't put on the
 * [PumlCanvasFileEditor] canvas (Activity, C4, Sequence, State, Communication). That coverage is
 * why this, and not Edit, is the tab a `.puml` opens on.
 */
class PlantUmlPreviewFileEditor(
    private val project: Project,
    private val file: VirtualFile,
) : UserDataHolderBase(), FileEditor {
    private val changeSupport = PropertyChangeSupport(this)
    private val alarm = Alarm(Alarm.ThreadToUse.SWING_THREAD, this)
    private val browser: JBCefBrowser?
    private val component: JComponent

    init {
        if (!JBCefApp.isSupported()) {
            browser = null
            component = JLabel("This IDE was built without JCEF support, so the PlantUML preview cannot render.", SwingConstants.CENTER)
        } else {
            val b = JBCefBrowser()
            Disposer.register(this, b)
            browser = b
            component = b.component
        }

        FileDocumentManager.getInstance().getDocument(file)?.addDocumentListener(
            object : DocumentListener {
                override fun documentChanged(event: DocumentEvent) = scheduleRender()
            },
            this,
        )
        renderNow()
    }

    private fun scheduleRender() {
        alarm.cancelAllRequests()
        alarm.addRequest(::renderNow, RENDER_DEBOUNCE_MILLIS)
    }

    private fun renderNow() {
        val browser = browser ?: return
        val text = FileDocumentManager.getInstance().getDocument(file)?.text ?: return
        val svg =
            when (val result = PlantUmlRenderService.render(text)) {
                is PlantUmlRenderService.RenderResult.Rendered -> result.svg
                is PlantUmlRenderService.RenderResult.Failed -> errorPlaceholder(result.reason)
            }
        browser.loadHTML(wrapInHtml(svg, currentThemeTokens().background))
    }

    private fun errorPlaceholder(reason: String): String =
        "<p style=\"font-family: sans-serif; color: #d33333;\">Could not render this diagram: ${reason.htmlEscape()}</p>"

    private fun wrapInHtml(
        svg: String,
        background: Color,
    ): String {
        val bg = "#%02x%02x%02x".format(background.red, background.green, background.blue)
        return """
            <html>
            <head><style>
              html, body { margin: 0; padding: 16px; background: $bg; }
              svg { max-width: 100%; height: auto; }
            </style></head>
            <body>$svg</body>
            </html>
            """.trimIndent()
    }

    override fun getComponent(): JComponent = component

    override fun getPreferredFocusedComponent(): JComponent = component

    override fun getName(): String = "View"

    override fun setState(state: FileEditorState) {}

    override fun isModified(): Boolean = false

    override fun isValid(): Boolean = file.isValid

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {
        changeSupport.addPropertyChangeListener(listener)
    }

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {
        changeSupport.removePropertyChangeListener(listener)
    }

    override fun getFile(): VirtualFile = file

    override fun dispose() {}

    companion object {
        private const val RENDER_DEBOUNCE_MILLIS = 300
    }
}

private fun String.htmlEscape(): String = replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
