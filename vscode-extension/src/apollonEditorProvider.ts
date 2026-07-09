import * as vscode from "vscode"
import type { UMLModel } from "@tumaet/apollon"
import {
  applyTextRangeEdits,
  exportTargetPath,
  modelEdits,
  readDocument,
  scaffoldModel,
} from "./diagramDocument"
import type {
  AutoExport,
  ExportFormat,
  HostMessage,
  WebviewMessage,
} from "./protocol"
import { renderWebviewHtml } from "./webviewHtml"

/** Coalesce a burst of canvas edits into one document write. */
const COMMIT_DEBOUNCE_MS = 300

/** VS Code's reserved viewType for "whatever the built-in editor would be". */
const DEFAULT_EDITOR = "default"

const autoExportSetting = (): AutoExport =>
  vscode.workspace
    .getConfiguration("apollon")
    .get<AutoExport>("autoExport", "off")

/** Only a real file has a sibling to export an image next to. */
const isOnDisk = (uri: vscode.Uri): boolean => uri.scheme === "file"

/** `…/orders.apollon` → `orders`. */
const diagramTitle = (uri: vscode.Uri): string =>
  uri.path
    .split("/")
    .pop()
    ?.replace(/\.apollon$/i, "") ?? "Diagram"

/** The editor closed before it could render. Not a failure worth reporting. */
class ExportCancelled extends Error {}

/**
 * A `.apollon` file edited in the Apollon canvas.
 *
 * VS Code owns the `TextDocument`, and with it dirty state, save, hot exit,
 * backup and revert. This provider only translates between the document's text
 * and the webview's model — it never touches the filesystem for the open file.
 *
 * The webview is the model's source of truth while it lives. Its edits arrive
 * immediately and are written to the document on a debounce; a save flushes any
 * pending write first, so what lands on disk is always what the canvas shows.
 * The document is mirrored back into the webview only when something *else*
 * changed it (git, a split JSON editor, a revert), which we tell apart by
 * comparing models rather than text — so a reformat, which changes bytes but not
 * meaning, never disturbs the canvas.
 */
export class ApollonEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "apollon.diagram"

  /** The focused diagram, for the export command to drive. A custom editor has
   *  no `TextEditor`, so `window.activeTextEditor` never points at one. */
  private active?: { webview: vscode.Webview; document: vscode.TextDocument }
  private exportSequence = 0
  private readonly pendingExports = new Map<
    number,
    {
      webview: vscode.Webview
      settle: (
        result: { payload: string; format: ExportFormat } | Error
      ) => void
    }
  >()

  constructor(private readonly extensionUri: vscode.Uri) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "webview")],
    }

    const post = (message: HostMessage) => panel.webview.postMessage(message)

    /** The document text as last written by us — anything else is someone else's. */
    let committed = document.getText()
    /** The newest model the canvas has produced, not necessarily written yet. */
    let pending: UMLModel | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    /**
     * The pending model as edits against the document's current text, plus the
     * text they produce — or null when the document already says the same thing.
     * `modify` rewrites the model's range unconditionally rather than diffing, so
     * a no-op has to be recognised from the resulting text, not the edit count.
     */
    const takePending = (): {
      edits: vscode.TextEdit[]
      text: string
      model: UMLModel
    } | null => {
      if (!pending) {
        return null
      }
      const model = pending
      const before = document.getText()
      const edits = modelEdits(before, model)
      pending = undefined
      const text = applyTextRangeEdits(before, edits)
      if (text === before) {
        return null
      }
      return {
        edits: edits.map((edit) =>
          vscode.TextEdit.replace(
            new vscode.Range(
              document.positionAt(edit.offset),
              document.positionAt(edit.offset + edit.length)
            ),
            edit.content
          )
        ),
        text,
        model,
      }
    }

    const commit = async () => {
      timer = undefined
      const update = takePending()
      if (!update) {
        return
      }
      // Optimistic: `onDidChangeTextDocument` fires while `applyEdit` is still
      // in flight, and recognises our own write by this text. Rolled back below
      // if the edit is refused, so `committed` never names unwritten text and
      // the canvas edit survives to the next commit.
      const previous = committed
      committed = update.text
      const edit = new vscode.WorkspaceEdit()
      edit.set(document.uri, update.edits)
      if (!(await vscode.workspace.applyEdit(edit))) {
        committed = previous
        pending ??= update.model
      }
    }

    const cancelCommit = () => {
      if (timer) {
        clearTimeout(timer)
      }
      timer = undefined
    }

    const scheduleCommit = () => {
      cancelCommit()
      timer = setTimeout(() => void commit(), COMMIT_DEBOUNCE_MS)
    }

    const subscriptions: vscode.Disposable[] = [
      panel.webview.onDidReceiveMessage((message: WebviewMessage) =>
        this.onWebviewMessage(message, document, {
          post,
          onModelChanged: (model) => {
            pending = model
            scheduleCommit()
          },
        })
      ),

      // Mirror an edit we did NOT make back into the canvas. Ours is recognised
      // by the text we wrote, so an external reformat still round-trips through
      // the model comparison below rather than remounting the editor.
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.toString() !== document.uri.toString()) {
          return
        }
        const text = document.getText()
        if (text === committed) {
          return
        }
        committed = text
        // Any external write supersedes whatever the canvas has not committed
        // yet, and this must happen before the validity check below: a document
        // that is only transiently invalid (mid-typing in a split JSON editor)
        // would otherwise leave the debounce armed to overwrite what was typed.
        pending = undefined
        cancelCommit()
        const state = readDocument(text)
        if (state.kind === "invalid") {
          // Not worth interrupting the canvas for — the next keystroke that
          // makes the document parse again will mirror it back.
          return
        }
        const model = state.kind === "empty" ? null : state.model
        post({ type: "externalUpdate", model })
      }),

      // A save must persist what the canvas shows, even mid-debounce.
      vscode.workspace.onWillSaveTextDocument((event) => {
        if (event.document.uri.toString() !== document.uri.toString()) {
          return
        }
        cancelCommit()
        const update = takePending()
        if (!update) {
          return
        }
        committed = update.text
        event.waitUntil(Promise.resolve(update.edits))
      }),

      vscode.workspace.onDidSaveTextDocument(async (saved) => {
        if (saved.uri.toString() !== document.uri.toString()) {
          return
        }
        await this.runAutoExport(document, panel.webview)
      }),

      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("apollon.autoExport")) {
          void post({ type: "config", autoExport: autoExportSetting() })
        }
      }),

      panel.onDidChangeViewState(() => {
        if (panel.active) {
          this.active = { webview: panel.webview, document }
        } else if (this.active?.webview === panel.webview) {
          // Blurred, and nothing else claimed focus first — so the export
          // command's "no diagram is focused" guard tells the truth.
          this.active = undefined
        }
      }),
    ]

    if (panel.active) {
      this.active = { webview: panel.webview, document }
    }

    // Last: loading the document can only start once we are listening, or the
    // webview's `ready` lands before anyone is there to answer it.
    panel.webview.html = renderWebviewHtml(panel.webview, this.extensionUri)

    panel.onDidDispose(() => {
      cancelCommit()
      // A tab can close inside the debounce window with the last canvas edit
      // still only in memory. Write it now, while the document is alive: the
      // edit lands, the document goes dirty, and VS Code's close / hot-exit
      // handles it. Dropping the timer instead loses the edit silently, with no
      // save prompt. A document already gone (closed without saving) can't be
      // written to, and resurrecting it would undo that choice.
      if (pending && !document.isClosed) {
        void commit()
      }
      this.cancelExports(panel.webview)
      if (this.active?.webview === panel.webview) {
        this.active = undefined
      }
      for (const subscription of subscriptions) {
        subscription.dispose()
      }
    })
  }

  private onWebviewMessage(
    message: WebviewMessage,
    document: vscode.TextDocument,
    ctx: {
      post: (message: HostMessage) => Thenable<boolean>
      onModelChanged: (model: UMLModel) => void
    }
  ): void {
    switch (message.type) {
      case "ready": {
        const state = readDocument(document.getText())
        if (state.kind === "invalid") {
          void ctx.post({ type: "invalid", reason: state.reason })
          break
        }
        void ctx.post({
          type: "init",
          model: state.kind === "empty" ? null : state.model,
          autoExport: autoExportSetting(),
        })
        break
      }
      case "create": {
        // Route the scaffold through the normal edit path rather than writing
        // the file: the new diagram lands as a dirty, undoable change, so a
        // mis-click is one Ctrl+Z — or one unsaved close — away from undone.
        if (document.getText().trim() !== "") {
          break
        }
        const model = scaffoldModel(
          message.diagramType,
          diagramTitle(document.uri)
        )
        void ctx.post({
          type: "init",
          model,
          autoExport: autoExportSetting(),
        })
        ctx.onModelChanged(model)
        break
      }
      case "reopenAsText":
        void vscode.commands.executeCommand(
          "vscode.openWith",
          document.uri,
          DEFAULT_EDITOR
        )
        break
      case "configureAutoExport":
        void this.configureAutoExport()
        break
      case "modelChanged":
        ctx.onModelChanged(message.model)
        break
      case "exportResult": {
        this.pendingExports.get(message.requestId)?.settle({
          payload: message.payload,
          format: message.format,
        })
        break
      }
      case "exportFailed":
        this.pendingExports
          .get(message.requestId)
          ?.settle(new Error(message.reason))
        break
    }
  }

  /** Pick where auto-export writes, from the canvas indicator. */
  private async configureAutoExport(): Promise<void> {
    const current = autoExportSetting()
    const choices: (vscode.QuickPickItem & { value: AutoExport })[] = [
      { label: "Off", value: "off", detail: "Never write a sibling image" },
      { label: "SVG", value: "svg", detail: "Write diagram.svg on every save" },
      { label: "PNG", value: "png", detail: "Write diagram.png on every save" },
    ]
    for (const choice of choices) {
      choice.picked = choice.value === current
      choice.description = choice.value === current ? "current" : undefined
    }
    const picked = await vscode.window.showQuickPick(choices, {
      title: "Auto-export on save",
    })
    if (!picked || picked.value === current) {
      return
    }
    // Per-workspace when there is one to write to, so a shared setting does not
    // start writing images into every other project the user opens.
    await vscode.workspace
      .getConfiguration("apollon")
      .update(
        "autoExport",
        picked.value,
        vscode.workspace.workspaceFolders
          ? vscode.ConfigurationTarget.Workspace
          : vscode.ConfigurationTarget.Global
      )
  }

  /** Render the focused diagram and write the sibling image next to its file. */
  public async exportActiveDiagram(format: ExportFormat): Promise<void> {
    if (!this.active) {
      void vscode.window.showErrorMessage("No Apollon diagram is focused.")
      return
    }
    const { webview, document } = this.active
    if (!isOnDisk(document.uri)) {
      void vscode.window.showInformationMessage(
        "Save the diagram to a file before exporting an image."
      )
      return
    }
    await this.writeExport(document.uri, webview, format, { silent: false })
  }

  private async runAutoExport(
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): Promise<void> {
    const format = autoExportSetting()
    if (format === "off") {
      return
    }
    // An untitled or virtual document has no sibling to write next to.
    if (!isOnDisk(document.uri)) {
      return
    }
    await this.writeExport(document.uri, webview, format, { silent: true })
  }

  private async writeExport(
    uri: vscode.Uri,
    webview: vscode.Webview,
    format: ExportFormat,
    options: { silent: boolean }
  ): Promise<void> {
    // Both entry points come through here, so the trust promise the manifest
    // makes — "writing sibling image exports is disabled until you trust the
    // workspace" — is kept on the manual command too, not just auto-export.
    if (!vscode.workspace.isTrusted) {
      if (!options.silent) {
        void vscode.window.showWarningMessage(
          "Trust this workspace to export diagram images."
        )
      }
      return
    }
    const name = `${uri.path
      .split("/")
      .pop()
      ?.replace(/\.apollon$/i, "")}.${format}`
    try {
      const { payload } = await this.requestExport(webview, format)
      const bytes =
        format === "png"
          ? Buffer.from(payload, "base64")
          : Buffer.from(payload, "utf8")
      const target = uri.with({ path: exportTargetPath(uri.path, format) })
      await vscode.workspace.fs.writeFile(target, bytes)
      if (options.silent) {
        vscode.window.setStatusBarMessage(`Apollon: exported ${name}`, 2000)
      } else {
        void vscode.window.showInformationMessage(`Exported ${name}`)
      }
    } catch (error) {
      if (error instanceof ExportCancelled) {
        return
      }
      void vscode.window.showErrorMessage(
        `Apollon could not export ${name}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private requestExport(
    webview: vscode.Webview,
    format: ExportFormat
  ): Promise<{ payload: string; format: ExportFormat }> {
    const requestId = ++this.exportSequence
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingExports.delete(requestId)
        reject(new Error("the editor did not respond"))
      }, 30_000)
      this.pendingExports.set(requestId, {
        webview,
        settle: (result) => {
          clearTimeout(timeout)
          this.pendingExports.delete(requestId)
          if (result instanceof Error) {
            reject(result)
          } else {
            resolve(result)
          }
        },
      })
      void webview.postMessage({
        type: "export",
        format,
        requestId,
      } satisfies HostMessage)
    })
  }

  /** A closed editor will never answer; settle its exports now, not in 30s. */
  private cancelExports(webview: vscode.Webview): void {
    for (const entry of [...this.pendingExports.values()]) {
      if (entry.webview === webview) {
        entry.settle(new ExportCancelled())
      }
    }
  }
}
