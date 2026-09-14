package de.tum.cit.aet.apollon.document

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.util.Alarm
import de.tum.cit.aet.apollon.puml.DispatchedImport
import de.tum.cit.aet.apollon.puml.LAYOUT_SIDECAR_SUFFIX
import de.tum.cit.aet.apollon.puml.PlantUmlDiagramExporter
import de.tum.cit.aet.apollon.puml.PlantUmlDiagramImporter
import de.tum.cit.aet.apollon.puml.PumlLayoutSidecar
import de.tum.cit.aet.apollon.puml.PumlResidual
import de.tum.cit.aet.apollon.puml.PumlScaffold
import de.tum.cit.aet.apollon.puml.RoundTripValidator
import kotlinx.serialization.json.JsonObject
import java.nio.file.Files
import java.nio.file.Path

/** Coalesce a burst of canvas edits into one document write. */
private const val COMMIT_DEBOUNCE_MS = 300

/** Coalesce typing in the Text tab into one re-import. Unlike a `.apollon` document, where an
 *  external change is a cheap JSON parse, each of these re-runs the PlantUML grammar and replaces
 *  the whole canvas model — far too much to do per keystroke. */
private const val REIMPORT_DEBOUNCE_MS = 300

/** What the canvas should be showing for the current `.puml` text. */
sealed interface PumlCanvasState {
    data class Model(val model: JsonObject, val unsupportedCount: Int) : PumlCanvasState

    /** Nothing in the file yet. Distinct from [Unsupported] because it is the one case the canvas
     *  can resolve on its own: the picker writes a starter diagram (see [PumlDocumentBridge.scaffold]),
     *  where an unreadable file can only be repaired in the Text tab. */
    data object Empty : PumlCanvasState

    /** The file parses as PlantUML this plugin cannot put on the canvas (a Sequence diagram,
     *  unsupported alias syntax). Not an error — the View and Text tabs still work. */
    data class Unsupported(val reason: String) : PumlCanvasState
}

/**
 * Two-way sync between a `.puml` [Document] and the canvas editing it.
 *
 * The counterpart of [DocumentSync], for the file format that needs a translation on each leg:
 * PlantUML text in through [PlantUmlDiagramImporter], an Apollon model out through
 * [PlantUmlDiagramExporter]. The `.puml` file is the document — there is no derived working copy —
 * so dirty state, undo, save and external-change detection are all the platform's, exactly as they
 * are for a `.apollon` file.
 *
 * Two facts do not survive the trip through PlantUML and are handled separately:
 *
 *  - **Residual** ([PumlResidual]) — preamble, unsupported lines, the exact arrow and keyword
 *    tokens. Entirely re-derived from the source text on each import, so it is held in memory and
 *    never persisted.
 *  - **Geometry** ([PumlLayoutSidecar]) — positions, sizes, waypoints, colours. PlantUML has no
 *    syntax for these, so they go to a committed sibling file. Note that dragging a node produces
 *    identical PlantUML, so it never touches the document at all; the sidecar write is what
 *    records it.
 *
 * Every public method must be called on the EDT — [Document] mutation and [Alarm] (`SWING_THREAD`)
 * both require it, and the caller (the JCEF message bridge) already hops to the EDT.
 */
class PumlDocumentBridge(
    private val project: Project,
    private val document: Document,
    private val file: VirtualFile,
    parentDisposable: Disposable,
) {
    /** The document text as last written by us — anything else is someone else's. */
    private var written: String = document.text

    /** Re-derived on every import; the export leg reads it to reproduce what the canvas dropped. */
    private var residual: PumlResidual = PumlResidual.empty()

    /** The newest model the canvas has produced, not necessarily written yet. */
    private var pending: JsonObject? = null

    /** The sidecar as last read or written, so an open-and-look-around writes nothing. */
    private var sidecarOnDisk: String? = null

    private val alarm = Alarm(Alarm.ThreadToUse.SWING_THREAD, parentDisposable)
    private val reimportAlarm = Alarm(Alarm.ThreadToUse.SWING_THREAD, parentDisposable)

    /** Called when something other than our own write changed the document. */
    var onExternalChange: ((PumlCanvasState) -> Unit)? = null

    /** Called when a canvas edit could not be safely written back as PlantUML. The document is
     *  left untouched, so the canvas and the text have diverged until the caller resolves it. */
    var onWriteRejected: ((String) -> Unit)? = null

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
                reimportAlarm.cancelAllRequests()
                reimportAlarm.addRequest({
                    onExternalChange?.invoke(importFrom(document.text))
                }, REIMPORT_DEBOUNCE_MS)
            }
        }

    init {
        document.addDocumentListener(listener, parentDisposable)
    }

    /** Parse the document as it stands. Also refreshes [residual], so this must run at least once
     *  before any canvas edit can be exported. */
    fun currentState(): PumlCanvasState = importFrom(document.text)

    private fun importFrom(text: String): PumlCanvasState {
        if (text.isBlank()) {
            residual = PumlResidual.empty()
            return PumlCanvasState.Empty
        }
        return when (val parsed = PlantUmlDiagramImporter.parse(text)) {
            is DispatchedImport.Rejected -> {
                residual = PumlResidual.empty()
                PumlCanvasState.Unsupported(parsed.reason)
            }
            is DispatchedImport.Parsed -> {
                val sidecar = readSidecar()
                sidecarOnDisk = if (sidecar.isEmpty()) null else sidecar.toJson()
                val mapped = parsed.toApollonModel(sidecar.toPreviousModel(), titleFor(file.name))
                residual = parsed.residual.withImported(mapped)
                // The title/description block is in no importer's output — nothing in the
                // PlantUML mentions it — so the sidecar has to put it back before the canvas ever
                // sees the model. Notes go through the `.puml` itself now (see PumlNotes).
                PumlCanvasState.Model(sidecar.withAnnotations(mapped.model), parsed.unsupportedCount)
            }
        }
    }

    /**
     * The picker chose a diagram type for an empty file: write that family's starter PlantUML and
     * hand back the canvas state it imports to.
     *
     * Unlike [write] this is immediate rather than debounced, and it goes through the normal
     * undoable write command — a mis-click is one Ctrl+Z from an empty file again, matching how a
     * `.apollon` scaffold behaves. Returns `null` if the file stopped being empty in the meantime
     * (a race with the Text tab) or the type has no PlantUML exporter, in which case the caller
     * should leave the document alone.
     */
    fun scaffold(diagramType: String): PumlCanvasState? {
        if (document.text.isNotBlank()) return null
        val text = PumlScaffold.textFor(diagramType) ?: return null
        // Set before the write: the listener fires synchronously inside the command and must read
        // this as our own change, or it would schedule a redundant re-import on top of the state
        // we are about to return.
        written = text
        ApplicationManager.getApplication().assertIsDispatchThread()
        WriteCommandAction.runWriteCommandAction(project, "New PlantUML Diagram", null, { document.setText(text) })
        return currentState()
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
     * An editor tab can close inside the debounce window with the last canvas edit still only in
     * memory. Write it now, while the document is alive.
     *
     * The listener is not removed here: [init] registered it against `parentDisposable`, so the
     * platform has already detached it by the time this runs, and removing it a second time is
     * what `DocumentImpl` logs as "Can't remove document listener". [write] does not need it
     * either — it recognises its own text through [written], not through the listener.
     */
    fun dispose() {
        alarm.cancelAllRequests()
        reimportAlarm.cancelAllRequests()
        write()
    }

    private fun write() {
        val model = pending ?: return
        pending = null

        // Geometry first, and unconditionally: a node drag re-exports to byte-identical PlantUML,
        // so the document comparison below would skip it and the move would be lost on reopen.
        persistLayout(model)

        val before = document.text
        val dispatched = PlantUmlDiagramExporter.render(model, residual)
        val candidate = dispatched.text
        if (candidate == before) {
            residual = dispatched.residual
            return
        }
        RoundTripValidator.validate(candidate, model, dispatched.residual)?.let { reason ->
            onWriteRejected?.invoke(reason)
            return
        }
        residual = dispatched.residual
        // Optimistic: the listener above fires synchronously inside the write command and must
        // recognise this as our own write, not an external one.
        written = candidate
        ApplicationManager.getApplication().assertIsDispatchThread()
        WriteCommandAction.runWriteCommandAction(
            project,
            "Update PlantUML Diagram",
            null,
            { document.setText(candidate) },
        )
    }

    private fun sidecarPath(): Path? =
        if (file.isInLocalFileSystem) Path.of(file.path + LAYOUT_SIDECAR_SUFFIX) else null

    private fun readSidecar(): PumlLayoutSidecar {
        val path = sidecarPath() ?: return PumlLayoutSidecar.empty()
        if (!Files.exists(path)) return PumlLayoutSidecar.empty()
        return runCatching { PumlLayoutSidecar.fromJson(Files.readString(path)) }
            .getOrDefault(PumlLayoutSidecar.empty())
    }

    private fun persistLayout(model: JsonObject) {
        val path = sidecarPath() ?: return
        val sidecar = PumlLayoutSidecar.fromModel(model)
        if (sidecar.isEmpty()) return
        val text = sidecar.toJson()
        if (text == sidecarOnDisk) return
        // Dragging a node fires this every debounce window, so only the write that creates the file
        // refreshes the VFS — that is the one that has to make it appear in the Project view, and a
        // refresh per drag would be a needless EDT stall.
        val isNew = !Files.exists(path)
        runCatching {
            writeAtomically(path, text)
            if (isNew) {
                // Asynchronous on purpose: this runs on the EDT (see the class doc), and the
                // synchronous `refreshAndFindFileByNioFile` walks the VFS there, which trips
                // `SlowOperations.assertSlowOperationsAreAllowed`. Nothing here needs the
                // VirtualFile back — the refresh exists only so the sidecar shows up in the
                // Project view.
                VfsUtil.markDirtyAndRefresh(true, false, false, path.parent.toFile())
            }
        }.onSuccess { sidecarOnDisk = text }
    }
}

/** The diagram a `.puml` file names — `orders.puml` -> `orders`. */
private fun titleFor(fileName: String): String = Regex("\\.[^.]+$").replace(fileName, "")
