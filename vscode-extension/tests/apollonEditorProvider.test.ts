import { beforeEach, describe, expect, it, vi } from "vitest"
import type { UMLModel } from "@tumaet/apollon"
import type { HostMessage, WebviewMessage } from "../src/protocol"
import * as stub from "./vscodeStub"
import { ApollonEditorProvider } from "../src/apollonEditorProvider"

/**
 * The document/canvas lifecycle, driven through the fake `vscode` in
 * `vscodeStub.ts`. These are the paths where a bug loses a user's work, so they
 * assert on the document's resulting text, not on which API was called.
 */

const COMMIT_DEBOUNCE_MS = 300

const model = (title: string): UMLModel =>
  ({
    version: "4.0.0",
    id: "d1",
    title,
    type: "ClassDiagram",
    nodes: [],
    edges: [],
    assessments: {},
  }) as UMLModel

const documentText = (title: string) => JSON.stringify(model(title), null, 2)

interface Harness {
  provider: ApollonEditorProvider
  document: stub.FakeTextDocument
  posted: HostMessage[]
  send: (message: WebviewMessage) => void
  dispose: () => void
  externalWrite: (text: string) => void
  save: () => Promise<void>
}

function mount(initial: string): Harness {
  const uri = stub.Uri.file("/w/orders.apollon")
  const document = new stub.FakeTextDocument(uri, initial)
  stub.openDocuments.set(uri.toString(), document)

  const messages = new stub.Emitter<WebviewMessage>()
  const viewState = new stub.Emitter<void>()
  const disposal = new stub.Emitter<void>()
  const posted: HostMessage[] = []

  const panel = {
    active: true,
    webview: {
      options: {},
      html: "",
      cspSource: "vscode-webview:",
      asWebviewUri: (value: unknown) => value,
      onDidReceiveMessage: messages.event,
      postMessage: (message: HostMessage) => {
        posted.push(message)
        return Promise.resolve(true)
      },
    },
    onDidChangeViewState: viewState.event,
    onDidDispose: disposal.event,
  }

  const provider = new ApollonEditorProvider(
    stub.Uri.file("/ext") as unknown as never
  )
  void provider.resolveCustomTextEditor(
    document as unknown as never,
    panel as unknown as never
  )

  return {
    provider,
    document,
    posted,
    send: (message) => messages.fire(message),
    dispose: () => disposal.fire(),
    externalWrite: (text) => {
      document.applyEdits([
        stub.TextEdit.replace(
          new stub.Range(
            new stub.Position(0, 0),
            new stub.Position(0, document.getText().length)
          ),
          text
        ),
      ])
      stub.onDidChangeTextDocument.fire({ document })
    },
    save: async () => {
      let waited: Promise<unknown> = Promise.resolve()
      stub.onWillSaveTextDocument.fire({
        document,
        waitUntil: (edits) => {
          waited = Promise.resolve(edits).then((applied) =>
            document.applyEdits(applied)
          )
        },
      })
      await waited
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  stub.resetState()
  stub.openDocuments.clear()
})

describe("closing the editor", () => {
  // Closing a tab within the debounce window used to drop the timer and the
  // edit with it: VS Code never saw a dirty document, so there was no save
  // prompt and the change was gone.
  it("writes a canvas edit that the debounce had not committed yet", async () => {
    const editor = mount(documentText("Before"))
    editor.send({ type: "modelChanged", model: model("After") })

    editor.dispose()
    await vi.runAllTimersAsync()

    expect(JSON.parse(editor.document.getText()).title).toBe("After")
  })

  it("leaves a document that was already closed alone", async () => {
    const editor = mount(documentText("Before"))
    editor.send({ type: "modelChanged", model: model("After") })

    editor.document.isClosed = true
    editor.dispose()
    await vi.runAllTimersAsync()

    // Closing without saving is a choice; resurrecting the document undoes it.
    expect(JSON.parse(editor.document.getText()).title).toBe("Before")
  })

  it("writes nothing when the canvas has no uncommitted edit", async () => {
    const editor = mount(documentText("Before"))
    editor.dispose()
    await vi.runAllTimersAsync()

    expect(editor.document.getText()).toBe(documentText("Before"))
  })
})

describe("an external edit", () => {
  // A split JSON editor is invalid between keystrokes. The pending canvas write
  // used to survive that branch and fire 300ms later, overwriting what was typed.
  it("cancels a pending canvas write even while the document is invalid", async () => {
    const editor = mount(documentText("Before"))
    editor.send({ type: "modelChanged", model: model("Canvas") })

    editor.externalWrite('{ "title": "half-typed')
    await vi.advanceTimersByTimeAsync(COMMIT_DEBOUNCE_MS * 2)

    expect(editor.document.getText()).toBe('{ "title": "half-typed')
  })

  it("cancels a pending canvas write and mirrors a valid document back", async () => {
    const editor = mount(documentText("Before"))
    editor.send({ type: "modelChanged", model: model("Canvas") })

    editor.externalWrite(documentText("Typed"))
    await vi.advanceTimersByTimeAsync(COMMIT_DEBOUNCE_MS * 2)

    expect(JSON.parse(editor.document.getText()).title).toBe("Typed")
    const update = editor.posted.find((m) => m.type === "externalUpdate")
    expect(update).toMatchObject({ model: { title: "Typed" } })
  })

  it("does not mirror an invalid document into the canvas", () => {
    const editor = mount(documentText("Before"))
    editor.externalWrite("{ nope")
    expect(editor.posted.some((m) => m.type === "externalUpdate")).toBe(false)
  })
})

describe("an untrusted workspace", () => {
  // The manifest promises image exports are disabled until the workspace is
  // trusted. Only auto-export used to check; the command wrote the file anyway.
  it("refuses a manual export and explains why", async () => {
    stub.state.isTrusted = false
    const editor = mount(documentText("Before"))

    await editor.provider.exportActiveDiagram("svg")

    expect(stub.state.writtenFiles).toEqual([])
    expect(stub.state.warnings.join(" ")).toMatch(/trust/i)
    // It must not even ask the canvas to render.
    expect(editor.posted.some((m) => m.type === "export")).toBe(false)
  })
})

describe("saving", () => {
  it("flushes a pending canvas edit into the save", async () => {
    const editor = mount(documentText("Before"))
    editor.send({ type: "modelChanged", model: model("After") })

    await editor.save()

    expect(JSON.parse(editor.document.getText()).title).toBe("After")
  })
})
