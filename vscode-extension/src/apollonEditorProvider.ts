import * as vscode from "vscode"
import { diagramTitle, readDocument, scaffoldModel } from "./diagramDocument"
import { DiagramExporter } from "./diagramExporter"
import { DocumentSync } from "./documentSync"
import type {
  AutoExport,
  ExportFormat,
  HostMessage,
  WebviewMessage,
} from "./shared/protocol"
import { renderWebviewHtml } from "./webviewHtml"

/** VS Code's reserved viewType for "whatever the built-in editor would be". */
const DEFAULT_EDITOR = "default"

const autoExportSetting = (): AutoExport =>
  vscode.workspace
    .getConfiguration("apollon")
    .get<AutoExport>("autoExport", "off")

/** Only a real file has a sibling to export an image next to. */
const isOnDisk = (uri: vscode.Uri): boolean => uri.scheme === "file"

/**
 * A `.apollon` file edited in the Apollon canvas.
 *
 * The provider wires a webview to its document: {@link DocumentSync} keeps the
 * two in step, {@link DiagramExporter} renders sibling images, and what is left
 * here is the editor's own lifecycle and the messages it answers.
 */
export class ApollonEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "apollon.diagramEditor"

  /** The focused diagram, for the export command to drive. A custom editor has
   *  no `TextEditor`, so `window.activeTextEditor` never points at one. */
  private focused?: { webview: vscode.Webview; document: vscode.TextDocument }
  private readonly exporter = new DiagramExporter()

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
    const sync = new DocumentSync(document)
    const isThisDocument = (other: vscode.TextDocument) =>
      other.uri.toString() === document.uri.toString()

    const subscriptions: vscode.Disposable[] = [
      panel.webview.onDidReceiveMessage((message: WebviewMessage) =>
        this.onWebviewMessage(message, document, { post, sync })
      ),

      vscode.workspace.onDidChangeTextDocument((event) => {
        if (!isThisDocument(event.document)) {
          return
        }
        const state = sync.onDocumentChanged()
        if (!state || state.kind === "invalid") {
          // Our own write, or one not worth interrupting the canvas for — the
          // next keystroke that makes the document parse mirrors it back.
          return
        }
        void post({
          type: "externalUpdate",
          model: state.kind === "empty" ? null : state.model,
        })
      }),

      // A save must persist what the canvas shows, even mid-debounce.
      vscode.workspace.onWillSaveTextDocument((event) => {
        if (!isThisDocument(event.document)) {
          return
        }
        const edits = sync.flushForSave()
        if (edits) {
          event.waitUntil(Promise.resolve(edits))
        }
      }),

      vscode.workspace.onDidSaveTextDocument(async (saved) => {
        if (!isThisDocument(saved)) {
          return
        }
        await this.runAutoExport(document, panel.webview)
      }),

      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("apollon.autoExport")) {
          void post({
            type: "autoExportChanged",
            autoExport: autoExportSetting(),
          })
        }
      }),

      panel.onDidChangeViewState(() => {
        if (panel.active) {
          this.focused = { webview: panel.webview, document }
        } else if (this.focused?.webview === panel.webview) {
          // Blurred, and nothing else claimed focus first — so the export
          // command's "no diagram is focused" guard tells the truth.
          this.focused = undefined
        }
      }),
    ]

    if (panel.active) {
      this.focused = { webview: panel.webview, document }
    }

    // Last: loading the document can only start once we are listening, or the
    // webview's `ready` lands before anyone is there to answer it.
    panel.webview.html = renderWebviewHtml(panel.webview, this.extensionUri)

    panel.onDidDispose(() => {
      sync.dispose()
      this.exporter.cancel(panel.webview)
      if (this.focused?.webview === panel.webview) {
        this.focused = undefined
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
      sync: DocumentSync
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
          diagramTitle(document.uri.path)
        )
        void ctx.post({ type: "init", model, autoExport: autoExportSetting() })
        ctx.sync.onCanvasModel(model)
        break
      }
      case "modelChanged":
        ctx.sync.onCanvasModel(message.model)
        break
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
      case "exportResult":
      case "exportFailed":
        this.exporter.settle(message)
        break
      default:
        // Every `WebviewMessage` variant is handled above; adding one without a
        // case here is a compile error rather than a silent no-op.
        message satisfies never
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
    if (!this.focused) {
      void vscode.window.showErrorMessage("No Apollon diagram is focused.")
      return
    }
    const { webview, document } = this.focused
    if (!isOnDisk(document.uri)) {
      void vscode.window.showInformationMessage(
        "Save the diagram to a file before exporting an image."
      )
      return
    }
    await this.exporter.write(document.uri, webview, format, { silent: false })
  }

  private async runAutoExport(
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): Promise<void> {
    const format = autoExportSetting()
    // An untitled or virtual document has no sibling to write next to.
    if (format === "off" || !isOnDisk(document.uri)) {
      return
    }
    await this.exporter.write(document.uri, webview, format, { silent: true })
  }
}
