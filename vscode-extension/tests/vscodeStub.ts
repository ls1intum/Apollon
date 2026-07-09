/**
 * Just enough of the `vscode` module for the editor provider to run in vitest.
 *
 * The real one only exists inside a VS Code process. Everything here is a
 * faithful stand-in for the small surface `apollonEditorProvider.ts` touches:
 * events fire synchronously, `applyEdit` really rewrites the document's text,
 * and `getText()` reflects it — so a test can assert on what the document ends
 * up holding rather than on which API happened to be called.
 */

type Listener<T> = (event: T) => void

export class Emitter<T> {
  private readonly listeners = new Set<Listener<T>>()

  readonly event = (listener: Listener<T>): Disposable => {
    this.listeners.add(listener)
    return { dispose: () => this.listeners.delete(listener) }
  }

  fire(event: T): void {
    for (const listener of [...this.listeners]) listener(event)
  }
}

export interface Disposable {
  dispose: () => void
}

export class Position {
  constructor(
    readonly line: number,
    readonly character: number
  ) {}
}

export class Range {
  constructor(
    readonly start: Position,
    readonly end: Position
  ) {}
}

export class TextEdit {
  private constructor(
    readonly range: Range,
    readonly newText: string
  ) {}

  static replace(range: Range, newText: string): TextEdit {
    return new TextEdit(range, newText)
  }
}

export class WorkspaceEdit {
  readonly entries = new Map<string, TextEdit[]>()

  set(uri: Uri, edits: TextEdit[]): void {
    this.entries.set(uri.toString(), edits)
  }
}

export class Uri {
  private constructor(
    readonly scheme: string,
    readonly path: string
  ) {}

  static file(path: string): Uri {
    return new Uri("file", path)
  }

  static joinPath(base: Uri, ...segments: string[]): Uri {
    return new Uri(base.scheme, [base.path, ...segments].join("/"))
  }

  with(change: { path: string }): Uri {
    return new Uri(this.scheme, change.path)
  }

  toString(): string {
    return `${this.scheme}://${this.path}`
  }
}

/** A `TextDocument` whose text a `WorkspaceEdit` can actually rewrite. */
export class FakeTextDocument {
  isClosed = false

  constructor(
    readonly uri: Uri,
    private text: string
  ) {}

  getText(): string {
    return this.text
  }

  positionAt(offset: number): Position {
    return new Position(0, offset)
  }

  /** Only the flat offset carried by `positionAt` is meaningful here. */
  applyEdits(edits: TextEdit[]): void {
    for (const edit of [...edits].sort(
      (a, b) => b.range.start.character - a.range.start.character
    )) {
      const from = edit.range.start.character
      const to = edit.range.end.character
      this.text = this.text.slice(0, from) + edit.newText + this.text.slice(to)
    }
  }
}

export const onDidChangeTextDocument = new Emitter<{
  document: FakeTextDocument
}>()
export const onWillSaveTextDocument = new Emitter<{
  document: FakeTextDocument
  waitUntil: (edits: Thenable<TextEdit[]>) => void
}>()
export const onDidSaveTextDocument = new Emitter<FakeTextDocument>()
export const onDidChangeConfiguration = new Emitter<{
  affectsConfiguration: (section: string) => boolean
}>()

export const state = {
  /** Set false to exercise the untrusted-workspace paths. */
  isTrusted: true,
  /** VS Code dirties a document for any applied edit, even a no-op one. */
  appliedEdits: 0,
  config: new Map<string, unknown>(),
  writtenFiles: [] as { path: string; bytes: Uint8Array }[],
  warnings: [] as string[],
  infos: [] as string[],
  errors: [] as string[],
}

export const resetState = (): void => {
  state.isTrusted = true
  state.appliedEdits = 0
  state.config = new Map()
  state.writtenFiles = []
  state.warnings = []
  state.infos = []
  state.errors = []
}

export const workspace = {
  get isTrusted(): boolean {
    return state.isTrusted
  },
  workspaceFolders: undefined as unknown,
  getConfiguration: (_section: string) => ({
    get: <T>(key: string, fallback: T): T =>
      (state.config.get(key) as T) ?? fallback,
    update: (key: string, value: unknown) => {
      state.config.set(key, value)
      return Promise.resolve()
    },
  }),
  // VS Code applies a WorkspaceEdit to files that are NOT open — that is how a
  // cross-file refactor works — so a closed document is edited here too.
  // Refusing it would hide the provider's own `isClosed` guard.
  applyEdit: (edit: WorkspaceEdit): Promise<boolean> => {
    state.appliedEdits += 1
    for (const [uri, edits] of edit.entries) {
      const document = openDocuments.get(uri)
      if (!document) return Promise.resolve(false)
      document.applyEdits(edits)
      onDidChangeTextDocument.fire({ document })
    }
    return Promise.resolve(true)
  },
  fs: {
    writeFile: (uri: Uri, bytes: Uint8Array): Promise<void> => {
      state.writtenFiles.push({ path: uri.path, bytes })
      return Promise.resolve()
    },
  },
  onDidChangeTextDocument: onDidChangeTextDocument.event,
  onWillSaveTextDocument: onWillSaveTextDocument.event,
  onDidSaveTextDocument: onDidSaveTextDocument.event,
  onDidChangeConfiguration: onDidChangeConfiguration.event,
}

/** Documents `applyEdit` is allowed to rewrite, keyed by `uri.toString()`. */
export const openDocuments = new Map<string, FakeTextDocument>()

export const window = {
  showErrorMessage: (message: string) => {
    state.errors.push(message)
    return Promise.resolve(undefined)
  },
  showWarningMessage: (message: string) => {
    state.warnings.push(message)
    return Promise.resolve(undefined)
  },
  showInformationMessage: (message: string) => {
    state.infos.push(message)
    return Promise.resolve(undefined)
  },
  showQuickPick: () => Promise.resolve(undefined),
  setStatusBarMessage: () => ({ dispose: () => {} }),
}

export const commands = {
  executeCommand: () => Promise.resolve(undefined),
}
