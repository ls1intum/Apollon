import * as vscode from "vscode"
import { diagramTitle, exportTargetPath } from "./diagramDocument"
import type {
  ExportFormat,
  HostMessage,
  WebviewMessage,
} from "./shared/protocol"

/** A canvas that never answers should not hold a write open forever. */
const RENDER_TIMEOUT_MS = 30_000

/** The editor closed before it could render. Not a failure worth reporting. */
class ExportCancelled extends Error {}

type ExportOutcome = Extract<
  WebviewMessage,
  { type: "exportResult" } | { type: "exportFailed" }
>

/**
 * Renders diagrams to sibling image files.
 *
 * Only the canvas can render a diagram, so every export is a round trip: the
 * host asks a webview, the webview answers, and the reply is matched back to its
 * request by id. One exporter serves every open editor, since a request outlives
 * neither more nor less than the webview it was sent to.
 */
export class DiagramExporter {
  private sequence = 0
  private readonly inFlight = new Map<
    number,
    { webview: vscode.Webview; settle: (result: string | Error) => void }
  >()

  /** Render the diagram in `webview` and write the image next to `uri`. */
  public async write(
    uri: vscode.Uri,
    webview: vscode.Webview,
    format: ExportFormat,
    options: { silent: boolean }
  ): Promise<void> {
    // Both the command and auto-export come through here, so the trust promise
    // the manifest makes — "writing sibling image exports is disabled until you
    // trust the workspace" — is kept on each.
    if (!vscode.workspace.isTrusted) {
      if (!options.silent) {
        void vscode.window.showWarningMessage(
          "Trust this workspace to export diagram images."
        )
      }
      return
    }
    const name = `${diagramTitle(uri.path)}.${format}`
    try {
      const payload = await this.render(webview, format)
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

  /** Hand a webview's answer back to the request that is waiting for it. */
  public settle(message: ExportOutcome): void {
    const entry = this.inFlight.get(message.requestId)
    entry?.settle(
      message.type === "exportFailed"
        ? new Error(message.reason)
        : message.payload
    )
  }

  /** A closed editor will never answer; settle its exports now, not in 30s. */
  public cancel(webview: vscode.Webview): void {
    for (const entry of [...this.inFlight.values()]) {
      if (entry.webview === webview) {
        entry.settle(new ExportCancelled())
      }
    }
  }

  private render(
    webview: vscode.Webview,
    format: ExportFormat
  ): Promise<string> {
    const requestId = ++this.sequence
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.inFlight.delete(requestId)
        reject(new Error("the editor did not respond"))
      }, RENDER_TIMEOUT_MS)
      this.inFlight.set(requestId, {
        webview,
        settle: (result) => {
          clearTimeout(timeout)
          this.inFlight.delete(requestId)
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
}
