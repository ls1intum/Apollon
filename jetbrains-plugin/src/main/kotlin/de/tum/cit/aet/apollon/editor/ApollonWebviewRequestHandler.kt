package de.tum.cit.aet.apollon.editor

import com.intellij.openapi.Disposable
import com.intellij.ui.jcef.utils.JBCefLocalRequestHandler
import com.intellij.ui.jcef.utils.JBCefStreamResourceHandler
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefResourceHandler
import org.cef.handler.CefResourceRequestHandler
import org.cef.handler.CefResourceRequestHandlerAdapter
import org.cef.misc.BoolRef
import org.cef.network.CefRequest

/** Scheme + authority the webview's assets are served under — see [WEBVIEW_URL]. */
private const val PROTOCOL = "http"
private const val AUTHORITY = "apollon.localhost"

/** Reserved-TLD authority, distinct from `localhost` (already used by the
 * platform's own JCEF image viewer on the same scheme) so the two never
 * collide within one process. */
const val WEBVIEW_URL = "$PROTOCOL://$AUTHORITY/index.html"

/**
 * Serves the webview's built `dist/` assets (bundled into the plugin's own
 * jar as classpath resources, see `processResources`'s `from("webview")`
 * wiring) over a real HTTP-shaped origin.
 *
 * `file://` cannot be used: Chromium enforces CORS on `<script type="module">`
 * loading and refuses same-origin `file://` imports. There is no supported way
 * for a plugin to register a genuinely custom URL *scheme* in JCEF —
 * `JBCefApp.addCefCustomSchemeHandlerFactory` is package-private and scheme
 * registration happens once during `CefApp` init, before any plugin code runs
 * — so this intercepts ordinary `http` requests before they reach the network
 * instead, via [JBCefLocalRequestHandler]'s `CefRequestHandler` hook. See the
 * platform's own `JCefImageViewer` for the reference use of this pattern.
 *
 * [JBCefLocalRequestHandler.addResource] only maps exact paths, and Vite emits
 * content-hashed filenames under `assets/`, so this overrides resource
 * resolution entirely rather than pre-registering a fixed set of paths.
 */
class ApollonWebviewRequestHandler(private val parentDisposable: Disposable) :
    JBCefLocalRequestHandler(PROTOCOL, AUTHORITY) {
    override fun getResourceRequestHandler(
        browser: CefBrowser?,
        frame: CefFrame?,
        request: CefRequest?,
        isNavigation: Boolean,
        isDownload: Boolean,
        requestInitiator: String?,
        disableDefaultHandling: BoolRef?,
    ): CefResourceRequestHandler {
        val prefix = "$PROTOCOL://$AUTHORITY/"
        val url = request?.url
        if (url == null || !url.startsWith(prefix)) {
            // Out of our scope — fall back to the base class's exact-path map
            // (empty here, so this just rejects), rather than returning null,
            // which this override is not allowed to do.
            return super.getResourceRequestHandler(
                browser,
                frame,
                request,
                isNavigation,
                isDownload,
                requestInitiator,
                disableDefaultHandling,
            )
        }
        return object : CefResourceRequestHandlerAdapter() {
            override fun getResourceHandler(
                browser: CefBrowser,
                frame: CefFrame,
                request: CefRequest,
            ): CefResourceHandler? {
                val path = url.removePrefix(prefix).substringBefore('?').ifBlank { "index.html" }
                // Nothing above the webview root is ever servable — the classloader
                // lookup below would happily walk out of `webview/` on a `..` segment.
                if (path.contains("..")) {
                    return null
                }
                val stream = javaClass.getResourceAsStream("/webview/$path") ?: return null
                return JBCefStreamResourceHandler(stream, mimeTypeFor(path), parentDisposable, emptyMap())
            }
        }
    }
}

/** Chromium refuses to execute a module script served with the wrong MIME type. */
private fun mimeTypeFor(path: String): String =
    when (path.substringAfterLast('.', "")) {
        "html" -> "text/html"
        "js", "mjs" -> "text/javascript"
        "css" -> "text/css"
        "json" -> "application/json"
        "svg" -> "image/svg+xml"
        "png" -> "image/png"
        "woff2" -> "font/woff2"
        "woff" -> "font/woff"
        else -> "application/octet-stream"
    }
