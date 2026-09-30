package de.tum.cit.aet.apollon.editor

import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.colors.EditorColorsListener
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import de.tum.cit.aet.apollon.protocol.HostMessage
import de.tum.cit.aet.apollon.protocol.toJsonString
import de.tum.cit.aet.apollon.theme.currentThemeTokens
import de.tum.cit.aet.apollon.theme.toInjectionScript
import org.cef.CefSettings
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefDisplayHandlerAdapter
import org.cef.handler.CefLoadHandler
import org.cef.handler.CefLoadHandlerAdapter
import org.cef.network.CefRequest
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.SwingConstants

private val LOG = Logger.getInstance(ApollonCanvasHost::class.java)

/**
 * One JCEF browser running the `jetbrains-plugin/webview` bundle, plus the message plumbing and
 * theme bridge every canvas needs — shared by [ApollonFileEditor] (a `.apollon` file) and
 * [PumlCanvasFileEditor] (the Edit tab of a `.puml` file), which differ only in what a model means
 * on disk, not in how the canvas is hosted.
 *
 * [onMessage] is always invoked on the EDT, so callers can touch the editor and the document
 * directly without hopping threads themselves.
 */
class ApollonCanvasHost(
    parent: Disposable,
    unsupportedMessage: String,
    private val onMessage: (String) -> Unit,
) {
    private val browser: JBCefBrowser?

    val component: JComponent

    init {
        if (!JBCefApp.isSupported()) {
            browser = null
            component = JLabel(unsupportedMessage, SwingConstants.CENTER)
        } else {
            val b = JBCefBrowser()
            Disposer.register(parent, b)
            browser = b

            b.jbCefClient.addRequestHandler(ApollonWebviewRequestHandler(parent), b.cefBrowser)

            // Synchronous, fire-and-forget: `onQuery` always answers `success("")`
            // immediately, so a real reply (the export round trip) travels back
            // through `post`/`requestId`, not through this call's return.
            val toHost = JBCefJSQuery.create(b as JBCefBrowserBase)
            toHost.addHandler { request ->
                // Runs on the CEF handler thread, not the EDT.
                ApplicationManager.getApplication().invokeLater { onMessage(request) }
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

                    // A bundle that fails to load leaves an empty panel and nothing else. Without
                    // this the only symptom is a blank canvas — indistinguishable from a stale
                    // bundle, an asset the request handler could not resolve, or a JS crash.
                    override fun onLoadError(
                        cefBrowser: CefBrowser,
                        frame: CefFrame,
                        errorCode: CefLoadHandler.ErrorCode,
                        errorText: String,
                        failedUrl: String,
                    ) {
                        LOG.warn("canvas failed to load $failedUrl: $errorText ($errorCode)")
                    }
                },
                b.cefBrowser,
            )

            // The canvas is a web app in a panel with no devtools in reach, so its console is the
            // only account of why it did not come up. Mirroring it into idea.log is what makes a
            // blank canvas diagnosable from a bug report instead of only in person.
            b.jbCefClient.addDisplayHandler(
                object : CefDisplayHandlerAdapter() {
                    override fun onConsoleMessage(
                        cefBrowser: CefBrowser,
                        level: CefSettings.LogSeverity,
                        message: String,
                        source: String,
                        line: Int,
                    ): Boolean {
                        val where = if (source.isEmpty()) "" else " ($source:$line)"
                        when (level) {
                            CefSettings.LogSeverity.LOGSEVERITY_ERROR,
                            CefSettings.LogSeverity.LOGSEVERITY_FATAL,
                            -> LOG.warn("canvas console: $message$where")
                            CefSettings.LogSeverity.LOGSEVERITY_WARNING -> LOG.info("canvas console: $message$where")
                            else -> if (LOG.isDebugEnabled) LOG.debug("canvas console: $message$where")
                        }
                        // False: let CEF do its own default handling too.
                        return false
                    }
                },
                b.cefBrowser,
            )

            ApplicationManager.getApplication().messageBus.connect(parent).apply {
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
    }

    private fun pushTheme() {
        val cefBrowser = browser?.cefBrowser ?: return
        cefBrowser.executeJavaScript(currentThemeTokens().toInjectionScript(), cefBrowser.url, 0)
    }

    fun post(message: HostMessage) {
        val cefBrowser = browser?.cefBrowser ?: return
        // The message is already valid JSON, which is always a valid JS
        // expression — no string-escaping needed to splice it into the call.
        cefBrowser.executeJavaScript(
            "window.__apollonReceiveFromHost && window.__apollonReceiveFromHost(${message.toJsonString()});",
            cefBrowser.url,
            0,
        )
    }
}

/** `TextEditorProvider.getInstance().getEditorTypeId()` — a long-stable platform constant,
 *  referenced by id rather than by class because the class itself is not on this plugin's
 *  compile-time platform classpath. */
const val TEXT_EDITOR_TYPE_ID = "text-editor"
