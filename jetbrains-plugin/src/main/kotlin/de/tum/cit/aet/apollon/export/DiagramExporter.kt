package de.tum.cit.aet.apollon.export

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.vfs.LocalFileSystem
import de.tum.cit.aet.apollon.document.diagramTitle
import de.tum.cit.aet.apollon.document.exportTargetPath
import de.tum.cit.aet.apollon.protocol.ExportFormat
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.util.Base64
import java.util.concurrent.CancellationException
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

private const val RENDER_TIMEOUT_SECONDS = 30L

/**
 * Renders diagrams to sibling image files.
 *
 * Ported from the VS Code extension's `DiagramExporter`: only the canvas can
 * render a diagram, so every export is a round trip through the JS bridge —
 * the host sends an `export` [HostMessage], the webview answers with an
 * `exportResult`/`exportFailed` [WebviewMessage] matched back by [settle]'s
 * `requestId`. One exporter serves every open editor.
 */
class DiagramExporter {
    private val sequence = AtomicInteger()
    private val inFlight = ConcurrentHashMap<Int, CompletableFuture<String>>()

    /**
     * Starts a render/write round trip. [sendExportRequest] must post the
     * `export` message to the webview with the given `requestId`; the result
     * (or timeout) arrives later through [settle].
     */
    fun write(
        filePath: String,
        format: ExportFormat,
        silent: Boolean,
        sendExportRequest: (requestId: Int) -> Unit,
    ) {
        val requestId = sequence.incrementAndGet()
        val future = CompletableFuture<String>()
        inFlight[requestId] = future
        sendExportRequest(requestId)

        val name = "${diagramTitle(filePath)}.${format.name}"
        future
            .orTimeout(RENDER_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .whenComplete { payload, error ->
                inFlight.remove(requestId)
                if (error == null) {
                    writeSibling(filePath, format, payload, name, silent)
                } else if (error !is CancellationException) {
                    reportFailure(name, error.message ?: error.toString())
                }
            }
    }

    /** Hand a webview's answer back to the request that is waiting for it. */
    fun settle(
        requestId: Int,
        payload: String?,
        reason: String?,
    ) {
        val future = inFlight[requestId] ?: return
        if (payload != null) {
            future.complete(payload)
        } else {
            future.completeExceptionally(RuntimeException(reason ?: "export failed"))
        }
    }

    /** A closed editor will never answer; cancel its exports now, not in 30s. */
    fun cancelAll() {
        inFlight.values.forEach { it.cancel(true) }
        inFlight.clear()
    }

    private fun writeSibling(
        sourcePath: String,
        format: ExportFormat,
        payload: String,
        name: String,
        silent: Boolean,
    ) {
        try {
            val bytes =
                if (format == ExportFormat.png) {
                    Base64.getDecoder().decode(payload)
                } else {
                    payload.toByteArray(Charsets.UTF_8)
                }
            val target = Path.of(exportTargetPath(sourcePath, format.name))
            Files.write(target, bytes)
            LocalFileSystem.getInstance().refreshAndFindFileByNioFile(target)
            if (!silent) {
                ApplicationManager.getApplication().invokeLater {
                    Messages.showInfoMessage("Exported $name", "Apollon")
                }
            }
        } catch (e: IOException) {
            reportFailure(name, e.message ?: e.toString())
        } catch (e: IllegalArgumentException) {
            // Malformed base64 payload (Base64.getDecoder().decode) or an
            // invalid sibling path (Path.of) both surface as this.
            reportFailure(name, e.message ?: e.toString())
        }
    }

    private fun reportFailure(
        name: String,
        reason: String,
    ) {
        ApplicationManager.getApplication().invokeLater {
            Messages.showErrorDialog("Apollon could not export $name: $reason", "Export Failed")
        }
    }
}
