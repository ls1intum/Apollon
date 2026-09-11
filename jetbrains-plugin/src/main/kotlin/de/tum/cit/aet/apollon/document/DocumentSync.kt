package de.tum.cit.aet.apollon.document

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.project.Project
import com.intellij.util.Alarm
import kotlinx.serialization.json.JsonObject

/** Coalesce a burst of canvas edits into one document write. */
private const val COMMIT_DEBOUNCE_MS = 300

/**
 * Two-way sync between a `.apollon` [Document] and the canvas editing it.
 *
 * Ported from the VS Code extension's `DocumentSync`. IntelliJ, like VS Code,
 * owns the [Document] and everything that comes with it — dirty state, save,
 * undo, external-change detection — so nothing here touches the filesystem;
 * [document] is written through [WriteCommandAction] and [document]'s own
 * listener tells our own writes apart from anyone else's (git, a split JSON
 * editor, a revert) by the text this class last wrote.
 *
 * Every public method must be called on the EDT — [Document] mutation and
 * [Alarm] (`SWING_THREAD`) both require it, and the caller (the JCEF message
 * bridge) already has to hop to the EDT to touch the editor at all.
 */
class DocumentSync(
    private val project: Project,
    private val document: Document,
    parentDisposable: Disposable,
) {
    /** The document text as last written by us — anything else is someone else's. */
    private var written: String = document.text

    /** The newest model the canvas has produced, not necessarily written yet. */
    private var pending: JsonObject? = null
    private val alarm = Alarm(Alarm.ThreadToUse.SWING_THREAD, parentDisposable)

    /** Called when something other than our own write changed the document. */
    var onExternalChange: ((DocumentState) -> Unit)? = null

    private val listener =
        object : DocumentListener {
            override fun documentChanged(event: DocumentEvent) {
                val text = document.text
                if (text == written) {
                    // Our own write (or an echo of one) — the canvas already agrees.
                    return
                }
                written = text
                pending = null
                alarm.cancelAllRequests()
                onExternalChange?.invoke(readDocument(text))
            }
        }

    init {
        // The single-arg overload is deprecated in favor of this one, which
        // also unregisters the listener when parentDisposable is disposed —
        // a safety net alongside dispose()'s own explicit
        // removeDocumentListener() below, not a replacement for it: dispose()
        // must still flush the pending write before detaching.
        document.addDocumentListener(listener, parentDisposable)
    }

    /** The canvas produced a new model. It reaches the document on a debounce. */
    fun onCanvasModel(model: JsonObject) {
        pending = model
        alarm.cancelAllRequests()
        alarm.addRequest({ write() }, COMMIT_DEBOUNCE_MS)
    }

    /** A save must persist what the canvas shows, even mid-debounce. */
    fun flushForSave() {
        alarm.cancelAllRequests()
        write()
    }

    /**
     * An editor tab can close inside the debounce window with the last canvas
     * edit still only in memory. Write it now, while the document is alive,
     * and detach — mirroring the VS Code extension's dispose-time flush.
     */
    fun dispose() {
        alarm.cancelAllRequests()
        write()
        document.removeDocumentListener(listener)
    }

    private fun write() {
        val model = pending ?: return
        pending = null
        val before = document.text
        val text = writeDocumentText(before, model)
        if (text == before) {
            return
        }
        // Optimistic: the listener above fires synchronously inside the write
        // command and must recognise this as our own write, not an external one.
        written = text
        ApplicationManager.getApplication().assertIsDispatchThread()
        WriteCommandAction.runWriteCommandAction(
            project,
            "Update Apollon Diagram",
            null,
            { document.setText(text) },
        )
    }
}
