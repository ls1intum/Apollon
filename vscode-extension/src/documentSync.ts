import * as vscode from "vscode"
import type { UMLModel } from "@tumaet/apollon"
import {
  applyTextRangeEdits,
  modelEdits,
  readDocument,
  type DocumentState,
} from "./diagramDocument"

/** Coalesce a burst of canvas edits into one document write. */
const COMMIT_DEBOUNCE_MS = 300

/**
 * Two-way sync between a `.apollon` `TextDocument` and the canvas editing it.
 *
 * VS Code owns the document, and with it dirty state, save, hot exit, backup and
 * revert. Nothing here touches the filesystem.
 *
 * The canvas is the model's source of truth while it lives: its edits arrive
 * immediately and are written on a debounce, and a save flushes first, so what
 * lands on disk is always what the canvas shows. The document is mirrored back
 * only when something *else* changed it (git, a split JSON editor, a revert),
 * which is told apart by the text this class last wrote.
 */
export class DocumentSync {
  /** The document text as last written by us — anything else is someone else's. */
  private written: string
  /** The newest model the canvas has produced, not necessarily written yet. */
  private pending?: UMLModel
  private timer?: ReturnType<typeof setTimeout>

  constructor(private readonly document: vscode.TextDocument) {
    this.written = document.getText()
  }

  /** The canvas produced a new model. It reaches the document on a debounce. */
  public onCanvasModel(model: UMLModel): void {
    this.pending = model
    this.cancel()
    this.timer = setTimeout(() => void this.write(), COMMIT_DEBOUNCE_MS)
  }

  /**
   * The document changed. Returns what the canvas should now show, or `null`
   * when the change was our own write and the canvas already agrees.
   *
   * Any external write supersedes what the canvas has not committed yet — even
   * a document that is only transiently invalid, mid-typing in a split JSON
   * editor. Dropping the pending model is therefore unconditional: leaving the
   * debounce armed would overwrite what was typed once it elapsed.
   */
  public onDocumentChanged(): DocumentState | null {
    const text = this.document.getText()
    if (text === this.written) {
      return null
    }
    this.written = text
    this.pending = undefined
    this.cancel()
    return readDocument(text)
  }

  /** The edits a save must carry, so it persists what the canvas shows. */
  public flushForSave(): vscode.TextEdit[] | null {
    this.cancel()
    const update = this.takePending()
    if (!update) {
      return null
    }
    this.written = update.text
    return update.edits
  }

  /**
   * A tab can close inside the debounce window with the last canvas edit still
   * only in memory. Write it now, while the document is alive: the edit lands,
   * the document goes dirty, and VS Code's close / hot-exit handles it. Dropping
   * the timer instead loses the edit silently, with no save prompt.
   *
   * `applyEdit` would happily rewrite a document that is already gone, and
   * resurrecting one closed without saving undoes that choice — so that is the
   * only case skipped.
   */
  public dispose(): void {
    this.cancel()
    if (!this.document.isClosed) {
      void this.write()
    }
  }

  private cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = undefined
  }

  private async write(): Promise<void> {
    this.timer = undefined
    const update = this.takePending()
    if (!update) {
      return
    }
    // Optimistic: `onDidChangeTextDocument` fires while `applyEdit` is still in
    // flight, and recognises our own write by this text. Rolled back if the edit
    // is refused, so `written` never names unwritten text and the canvas edit
    // survives to the next write.
    const previous = this.written
    this.written = update.text
    const edit = new vscode.WorkspaceEdit()
    edit.set(this.document.uri, update.edits)
    if (!(await vscode.workspace.applyEdit(edit))) {
      this.written = previous
      this.pending ??= update.model
    }
  }

  /**
   * The pending model as edits against the document's current text, plus the
   * text they produce — or null when the document already says the same thing.
   * `modify` rewrites the model's range unconditionally rather than diffing, so
   * a no-op has to be recognised from the resulting text, not the edit count.
   */
  private takePending(): {
    edits: vscode.TextEdit[]
    text: string
    model: UMLModel
  } | null {
    if (!this.pending) {
      return null
    }
    const model = this.pending
    const before = this.document.getText()
    const edits = modelEdits(before, model)
    this.pending = undefined
    const text = applyTextRangeEdits(before, edits)
    if (text === before) {
      return null
    }
    return {
      edits: edits.map((edit) =>
        vscode.TextEdit.replace(
          new vscode.Range(
            this.document.positionAt(edit.offset),
            this.document.positionAt(edit.offset + edit.length)
          ),
          edit.content
        )
      ),
      text,
      model,
    }
  }
}
