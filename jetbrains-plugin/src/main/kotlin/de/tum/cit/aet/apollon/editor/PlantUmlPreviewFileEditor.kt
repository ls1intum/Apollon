package de.tum.cit.aet.apollon.editor

import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.colors.EditorColorsListener
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ProjectRootManager
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VfsUtilCore
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.util.Alarm
import de.tum.cit.aet.apollon.render.PlantUmlRenderService
import de.tum.cit.aet.apollon.theme.currentThemeTokens
import de.tum.cit.aet.apollon.theme.toInjectionScript
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import java.awt.event.ComponentAdapter
import java.awt.event.ComponentEvent
import java.beans.PropertyChangeListener
import java.beans.PropertyChangeSupport
import java.nio.file.Path
import java.util.concurrent.atomic.AtomicInteger
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.SwingConstants

private val LOG = Logger.getInstance(PlantUmlPreviewFileEditor::class.java)

/**
 * The read-only render half of the **View** tab for any `.puml`/`.plantuml` file: goes through
 * [PlantUmlRenderService], the real `plantuml-mit` engine, so it works for every diagram family —
 * including the ones [de.tum.cit.aet.apollon.puml.PlantUmlDiagramImporter] can't put on the
 * [PumlCanvasFileEditor] canvas (State, Timing, Gantt, MindMap, ...). That coverage is why this,
 * and not Edit, is the tab a `.puml` opens on.
 *
 * [PumlSplitFileEditor] is what the tab actually is: this pane beside the file's source, with the
 * platform's Editor / Split / Preview switch between them. This class works the same either way —
 * it re-renders whenever the document changes, whoever changed it.
 *
 * The browser is navigated **once**, to a static shell page, and every render after that is pushed
 * into it with `executeJavaScript` — the same arrangement [ApollonCanvasHost] uses for the canvas,
 * and here it is load-bearing rather than stylistic. `JBCefBrowser.loadHTML(html)` hardcodes the
 * target URL `about:blank`, derives the navigation URL as a pure function of it, and
 * `JBCefBrowserBase.loadUrlImpl` opens with `if (Objects.equals(myLoadingUrl, url)) return;` —
 * a field nothing ever resets. So the second and every later `loadHTML` on one browser is silently
 * dropped, and a preview built that way shows the file as it was when the tab was created and never
 * updates again.
 *
 * The shell also owns the fit/zoom controls, which is what makes a large C4 diagram readable in a
 * narrow editor tab.
 */
class PlantUmlPreviewFileEditor(
    private val project: Project,
    private val file: VirtualFile,
) : UserDataHolderBase(), FileEditor {
    private val changeSupport = PropertyChangeSupport(this)
    private val alarm = Alarm(Alarm.ThreadToUse.SWING_THREAD, this)
    private val browser: JBCefBrowser?
    private val component: JComponent

    /** Stamps each render so a slow one cannot overwrite the result of a newer one. */
    private val renderSequence = AtomicInteger()

    /** The last payload pushed, replayed on load so a render that beat the shell is not lost. */
    private var lastPayload: JsonObject? = null

    private var shellLoaded = false
    private var disposed = false

    /** Whether this pane is on screen. [PumlSplitFileEditor] hides it outright — `setVisible(false)`
     *  on this component — for its Editor-only layout, and a PlantUML layout pass per keystroke into
     *  a hidden pane is pure waste. False only ever *defers* a render: [renderDeferred] brings it
     *  back the moment the pane is shown again, so a listener that somehow missed a
     *  `componentShown` costs a stale pixel, never a permanently blank one. */
    private var paneShowing = true
    private var renderDeferred = false

    init {
        if (!JBCefApp.isSupported()) {
            browser = null
            component = JLabel("This IDE was built without JCEF support, so the PlantUML preview cannot render.", SwingConstants.CENTER)
        } else {
            val b = JBCefBrowser()
            Disposer.register(this, b)
            browser = b
            component = b.component

            b.jbCefClient.addLoadHandler(
                object : CefLoadHandlerAdapter() {
                    override fun onLoadEnd(
                        cefBrowser: CefBrowser,
                        frame: CefFrame,
                        httpStatusCode: Int,
                    ) {
                        if (!frame.isMain) return
                        ApplicationManager.getApplication().invokeLater({
                            shellLoaded = true
                            pushTheme()
                            lastPayload?.let(::push)
                        }, ModalityState.any())
                    }
                },
                b.cefBrowser,
            )

            ApplicationManager.getApplication().messageBus.connect(this).apply {
                subscribe(
                    LafManagerListener.TOPIC,
                    LafManagerListener { ApplicationManager.getApplication().invokeLater(::pushTheme) },
                )
                subscribe(
                    EditorColorsManager.TOPIC,
                    EditorColorsListener { ApplicationManager.getApplication().invokeLater(::pushTheme) },
                )
            }

            b.loadHTML(SHELL_HTML)
        }

        component.addComponentListener(
            object : ComponentAdapter() {
                override fun componentShown(event: ComponentEvent) {
                    paneShowing = true
                    if (renderDeferred) scheduleRender()
                }

                override fun componentHidden(event: ComponentEvent) {
                    paneShowing = false
                }
            },
        )

        FileDocumentManager.getInstance().getDocument(file)?.addDocumentListener(
            object : DocumentListener {
                override fun documentChanged(event: DocumentEvent) = scheduleRender()
            },
            this,
        )
        // Scheduled, not immediate: this constructor runs inside `createEditor` on the EDT, and a
        // render is a few hundred milliseconds of PlantUML layout.
        scheduleRender()
    }

    private fun scheduleRender() {
        if (!paneShowing) {
            renderDeferred = true
            return
        }
        renderDeferred = false
        alarm.cancelAllRequests()
        alarm.addRequest(::renderNow, RENDER_DEBOUNCE_MILLIS)
    }

    /** Reads the source on the EDT, renders it on a pooled thread, pushes the result back. */
    private fun renderNow() {
        if (browser == null || disposed) return
        val text = readSource()
        if (text == null) {
            push(messagePayload("Architect Studio cannot read this file", listOf("Its contents are not available as text.")))
            return
        }
        val stamp = renderSequence.incrementAndGet()
        // Read on the EDT with the rest of the source: both come from the project model.
        val context = renderContext()
        ApplicationManager.getApplication().executeOnPooledThread {
            val payload = payloadFor(PlantUmlRenderService.render(text, context))
            ApplicationManager.getApplication().invokeLater({
                if (!disposed && stamp == renderSequence.get()) {
                    push(payload)
                }
            }, ModalityState.any())
        }
    }

    /**
     * What an `!include` in this file is allowed to resolve to: the file's own directory, and the
     * project's content roots.
     *
     * A diagram is rendered from the buffer rather than from disk, so PlantUML has to be told where
     * the buffer came from or `!include ../lib/house-style.puml` has nothing to be relative to. The
     * content roots are the boundary — the same project the IDE already has open, and no wider: an
     * include that resolves outside them is refused.
     *
     * A `.puml` on a non-local file system (a remote or in-memory one) has no `nio` path, so it gets
     * no base directory and its includes fail the way they did before — the honest answer, since
     * there is no directory for them to be relative to.
     */
    private fun renderContext(): PlantUmlRenderService.RenderContext =
        PlantUmlRenderService.RenderContext(
            baseDirectory = file.parent?.let(::nioPathOf),
            allowedRoots = ProjectRootManager.getInstance(project).contentRoots.mapNotNull(::nioPathOf),
        )

    private fun nioPathOf(candidate: VirtualFile): Path? =
        runCatching { candidate.takeIf { it.isInLocalFileSystem }?.toNioPath() }
            .onFailure { LOG.debug("no local path for ${candidate.name}", it) }
            .getOrNull()

    /** The document if the platform has one, else the file itself — a `.puml` big enough or odd
     *  enough that `FileDocumentManager` declines it still has readable bytes, and a silent blank
     *  tab is the worst of the available answers. */
    private fun readSource(): String? {
        FileDocumentManager.getInstance().getDocument(file)?.let { return it.text }
        return runCatching { VfsUtilCore.loadText(file) }
            .onFailure { LOG.warn("could not read ${file.name} for the PlantUML preview", it) }
            .getOrNull()
    }

    private fun payloadFor(result: PlantUmlRenderService.RenderResult): JsonObject =
        when (result) {
            is PlantUmlRenderService.RenderResult.Rendered ->
                buildJsonObject {
                    put("pages", JsonArray(result.pages.map { JsonPrimitive(it) }))
                }
            is PlantUmlRenderService.RenderResult.SyntaxError ->
                messagePayload(
                    if (result.line == null) {
                        "PlantUML could not parse this diagram"
                    } else {
                        "PlantUML could not parse this diagram (line ${result.line})"
                    },
                    result.messages,
                )
            is PlantUmlRenderService.RenderResult.Failed -> {
                LOG.warn("PlantUML failed to render ${file.name}: ${result.reason}")
                messagePayload("Could not render this diagram", listOf(result.reason))
            }
        }

    private fun messagePayload(
        heading: String,
        messages: List<String>,
    ): JsonObject =
        buildJsonObject {
            put("heading", heading)
            put("messages", JsonArray(messages.map { JsonPrimitive(it) }))
        }

    private fun push(payload: JsonObject) {
        lastPayload = payload
        if (!shellLoaded) return
        // The payload is already valid JSON, which is a valid JS expression — no escaping needed.
        execute("window.__render && window.__render(${Json.encodeToString(JsonObject.serializer(), payload)});")
    }

    private fun pushTheme() {
        if (!disposed) execute(currentThemeTokens().toInjectionScript())
    }

    private fun execute(script: String) {
        val cefBrowser = browser?.cefBrowser ?: return
        cefBrowser.executeJavaScript(script, cefBrowser.url, 0)
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

    override fun dispose() {
        disposed = true
    }

    companion object {
        private const val RENDER_DEBOUNCE_MILLIS = 300
    }
}

/**
 * The shell the preview browser is navigated to once. Colours come from the `--apollon-*` custom
 * properties [toInjectionScript] sets, so the preview follows the IDE theme the same way the canvas
 * does; every one has a literal fallback for the window between load and the first theme push.
 *
 * `#pages` is filled by `window.__render`, which either splices in one `<svg>` per `@startuml` block
 * or builds a message list with `textContent` — diagnostics from PlantUML are never treated as HTML.
 */
private val SHELL_HTML =
    """
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
      html, body { margin: 0; padding: 0; height: 100%; }
      body {
        display: flex; flex-direction: column;
        font-family: sans-serif; font-size: 13px;
        background: var(--apollon-background, #ffffff);
        color: var(--apollon-foreground, #000000);
      }
      #toolbar {
        flex: 0 0 auto; display: flex; gap: 6px; align-items: center; padding: 5px 8px;
        background: var(--apollon-surface, #f4f4f4);
        border-bottom: 1px solid var(--apollon-border, #ced4da);
      }
      #toolbar button {
        font: inherit; font-size: 12px; line-height: 1.4; padding: 1px 8px; cursor: pointer;
        color: inherit; background: transparent; border-radius: 4px;
        border: 1px solid var(--apollon-border, #ced4da);
      }
      #toolbar button:hover { background: var(--apollon-surface-sunken, #e9ecef); }
      #toolbar button[aria-pressed="true"] { background: var(--apollon-surface-sunken, #e9ecef); }
      #zoom-label { margin-left: auto; font-size: 12px; opacity: 0.7; }
      #scroll {
        flex: 1 1 auto; overflow: auto; padding: 12px;
        /* Diagrams render in black-on-transparent; the surrounding page can follow the IDE theme,
           but the diagram surface itself must stay white so the render stays legible in dark themes. */
        background: #ffffff; color: #000000;
      }
      .page + .page {
        margin-top: 16px; padding-top: 16px;
        border-top: 1px dashed var(--apollon-border, #ced4da);
      }
      .page svg { display: block; }
      .message h2 { margin: 0 0 6px; font-size: 13px; color: var(--apollon-danger, #d33333); }
      .message ul { margin: 0; padding-left: 18px; }
      .message li { margin-bottom: 3px; font-family: monospace; white-space: pre-wrap; }
    </style>
    </head>
    <body>
    <div id="toolbar">
      <button id="fit" type="button" title="Scale the diagram to the width of this tab">Fit width</button>
      <button id="actual" type="button" title="Show the diagram at its own size">1:1</button>
      <button id="out" type="button" title="Zoom out">&minus;</button>
      <button id="in" type="button" title="Zoom in">+</button>
      <span id="zoom-label">Fit</span>
    </div>
    <div id="scroll"><div id="pages"></div></div>
    <script>
    (function () {
      var pages = document.getElementById("pages");
      var label = document.getElementById("zoom-label");
      var fitButton = document.getElementById("fit");
      var actualButton = document.getElementById("actual");
      var mode = "fit";
      var zoom = 1;

      function apply() {
        var svgs = pages.querySelectorAll("svg");
        for (var i = 0; i < svgs.length; i++) {
          var svg = svgs[i];
          if (mode === "fit") {
            svg.style.maxWidth = "100%";
            svg.style.width = "100%";
            svg.style.height = "auto";
          } else {
            var box = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal.width : 0;
            svg.style.maxWidth = "none";
            svg.style.width = box > 0 ? Math.round(box * zoom) + "px" : "auto";
            svg.style.height = "auto";
          }
        }
        label.textContent = mode === "fit" ? "Fit" : Math.round(zoom * 100) + "%";
        fitButton.setAttribute("aria-pressed", mode === "fit" ? "true" : "false");
        actualButton.setAttribute("aria-pressed", mode !== "fit" && zoom === 1 ? "true" : "false");
      }

      function setZoom(next) {
        mode = "zoom";
        zoom = Math.min(8, Math.max(0.1, next));
        apply();
      }

      fitButton.addEventListener("click", function () { mode = "fit"; apply(); });
      actualButton.addEventListener("click", function () { setZoom(1); });
      document.getElementById("in").addEventListener("click", function () { setZoom(zoom * 1.2); });
      document.getElementById("out").addEventListener("click", function () { setZoom(zoom / 1.2); });
      document.getElementById("scroll").addEventListener("wheel", function (event) {
        if (!event.ctrlKey && !event.metaKey) { return; }
        event.preventDefault();
        setZoom((mode === "fit" ? 1 : zoom) * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
      }, { passive: false });

      window.__render = function (payload) {
        pages.textContent = "";
        if (payload.pages) {
          for (var i = 0; i < payload.pages.length; i++) {
            var page = document.createElement("div");
            page.className = "page";
            page.innerHTML = payload.pages[i];
            pages.appendChild(page);
          }
          apply();
          return;
        }
        var box = document.createElement("div");
        box.className = "message";
        var heading = document.createElement("h2");
        heading.textContent = payload.heading;
        box.appendChild(heading);
        var list = document.createElement("ul");
        for (var j = 0; j < payload.messages.length; j++) {
          var item = document.createElement("li");
          item.textContent = payload.messages[j];
          list.appendChild(item);
        }
        box.appendChild(list);
        pages.appendChild(box);
      };
    })();
    </script>
    </body>
    </html>
    """.trimIndent()
