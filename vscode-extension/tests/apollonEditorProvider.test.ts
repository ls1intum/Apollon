import { beforeEach, describe, expect, it, vi } from "vitest"
import type { UMLModel } from "@tumaet/apollon"
import type { HostMessage, WebviewMessage } from "../src/shared/protocol"
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
      stub.onDidSaveTextDocument.fire(document)
    },
  }
}

/** Answer the render request the host is waiting on, as the canvas would. */
async function respondToExport(editor: Harness, payload: string) {
  const request = editor.posted.find((message) => message.type === "export")
  if (!request) {
    throw new Error("the host asked the canvas for no render")
  }
  editor.send({
    type: "exportResult",
    requestId: request.requestId,
    format: request.format,
    payload,
  })
  await vi.runAllTimersAsync()
  return request
}

beforeEach(() => {
  vi.useFakeTimers()
  stub.resetState()
  stub.openDocuments.clear()
})

describe("closing the editor", () => {
  // A tab can close inside the debounce window. The last canvas edit must still
  // be flushed, or it is lost with no dirty state and no save prompt.
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

  // VS Code dirties a document for any applied edit, so an untouched diagram
  // must produce none at all — not merely one that writes identical bytes.
  it("applies no edit when the canvas has no uncommitted change", async () => {
    const editor = mount(documentText("Before"))
    editor.dispose()
    await vi.runAllTimersAsync()

    expect(stub.state.appliedEdits).toBe(0)
    expect(editor.document.getText()).toBe(documentText("Before"))
  })
})

describe("an external edit", () => {
  // A split JSON editor is invalid between keystrokes. A pending canvas write
  // must be cancelled on any external change, or it fires once the debounce
  // elapses and overwrites what was typed.
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

  // Writing the canvas model to the document fires the same change event an
  // external edit does. Mirroring our own write back would loop the canvas.
  it("is not what our own write looks like", async () => {
    const editor = mount(documentText("Before"))
    editor.send({ type: "modelChanged", model: model("After") })
    await vi.runAllTimersAsync()

    expect(JSON.parse(editor.document.getText()).title).toBe("After")
    expect(editor.posted.some((m) => m.type === "externalUpdate")).toBe(false)
  })
})

describe("changing the auto-export setting", () => {
  it("tells the canvas, so its indicator stops lying", () => {
    const editor = mount(documentText("Before"))
    stub.state.config.set("autoExport", "png")
    stub.onDidChangeConfiguration.fire({ affectsConfiguration: () => true })

    expect(editor.posted.at(-1)).toEqual({
      type: "autoExportChanged",
      autoExport: "png",
    })
  })

  it("ignores a change to some other setting", () => {
    const editor = mount(documentText("Before"))
    stub.onDidChangeConfiguration.fire({ affectsConfiguration: () => false })

    expect(editor.posted.some((m) => m.type === "autoExportChanged")).toBe(
      false
    )
  })
})

describe("the export command", () => {
  it("writes the sibling image and says so", async () => {
    const editor = mount(documentText("Before"))

    const exported = editor.provider.exportActiveDiagram("svg")
    await respondToExport(editor, "<svg />")
    await exported

    expect(stub.state.writtenFiles.map((file) => file.path)).toEqual([
      "/w/orders.svg",
    ])
    expect(stub.state.infos.join(" ")).toMatch(/Exported orders\.svg/)
  })

  // The manifest promises image exports are disabled until the workspace is
  // trusted, so the command must refuse too — not only auto-export.
  it("refuses in an untrusted workspace and explains why", async () => {
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

  it("writes no image while auto-export is off", async () => {
    const editor = mount(documentText("Before"))
    await editor.save()

    expect(editor.posted.some((m) => m.type === "export")).toBe(false)
    expect(stub.state.writtenFiles).toEqual([])
  })
})

describe("auto-export on save", () => {
  // Only the canvas can render a diagram, so the image is a round trip. SVG
  // crosses as markup and PNG as base64, since a webview message is JSON.
  it.each([
    ["svg", "<svg />"],
    ["png", "\x89PNG\r\n"],
  ])("writes the sibling %s the canvas renders", async (format, contents) => {
    stub.state.config.set("autoExport", format)
    const editor = mount(documentText("Before"))

    await editor.save()
    await respondToExport(
      editor,
      format === "png" ? Buffer.from(contents).toString("base64") : contents
    )

    expect(stub.state.writtenFiles).toHaveLength(1)
    const written = stub.state.writtenFiles[0]
    expect(written.path).toBe(`/w/orders.${format}`)
    expect(Buffer.from(written.bytes).toString("utf8")).toBe(contents)
  })

  it("reports a render that failed, and writes nothing", async () => {
    stub.state.config.set("autoExport", "svg")
    const editor = mount(documentText("Before"))

    await editor.save()
    const request = editor.posted.find((m) => m.type === "export")
    editor.send({
      type: "exportFailed",
      requestId: request!.requestId,
      reason: "the canvas is on fire",
    })
    await vi.runAllTimersAsync()

    expect(stub.state.writtenFiles).toEqual([])
    expect(stub.state.errors.join(" ")).toMatch(/orders\.svg.*on fire/)
  })
})

describe("an empty document", () => {
  // The picker's choice must land as an undoable edit, not a file write, so a
  // mis-click is one Ctrl+Z away from the empty file the user started with.
  it("commits the picked diagram type as an ordinary edit", async () => {
    const editor = mount("")
    editor.send({ type: "create", diagramType: "ObjectDiagram" })
    await vi.runAllTimersAsync()

    expect(JSON.parse(editor.document.getText())).toMatchObject({
      type: "ObjectDiagram",
      title: "orders",
    })
    expect(stub.state.appliedEdits).toBe(1)
  })

  it("refuses to scaffold over a document that already holds a diagram", async () => {
    const editor = mount(documentText("Before"))
    editor.send({ type: "create", diagramType: "ObjectDiagram" })
    await vi.runAllTimersAsync()

    expect(stub.state.appliedEdits).toBe(0)
    expect(editor.document.getText()).toBe(documentText("Before"))
  })
})
