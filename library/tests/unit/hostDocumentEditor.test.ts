import { afterEach, describe, expect, it, vi } from "vitest"
import * as Y from "yjs"
import { Awareness } from "y-protocols/awareness"
import { ApollonEditor } from "@/apollon-editor"
import { readModelFromYDoc, writeModelToYDoc } from "@/model"
import type { UMLModel } from "@/typings"

const model = (title: string, nodeIds: string[]): UMLModel =>
  ({
    version: "4.2.0",
    id: `id-${title}`,
    title,
    type: "ClassDiagram",
    nodes: nodeIds.map((id, index) => ({
      id,
      type: "class",
      width: 160,
      height: 100,
      position: { x: index * 300, y: 0 },
      data: { name: id, methods: [], attributes: [] },
      measured: { width: 160, height: 100 },
    })),
    edges: [],
    assessments: {},
  }) as unknown as UMLModel

const editors: ApollonEditor[] = []
const mount = (options: ConstructorParameters<typeof ApollonEditor>[1]) => {
  const element = document.createElement("div")
  document.body.appendChild(element)
  const editor = new ApollonEditor(element, options)
  editors.push(editor)
  return editor
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy()
  document.body.innerHTML = ""
})

describe("ApollonEditor on a host-owned document", () => {
  it("shows the diagram already in the document and ignores the model option", () => {
    const ydoc = new Y.Doc()
    writeModelToYDoc(ydoc, model("Shared", ["a", "b"]))

    const editor = mount({
      model: model("Local", ["x"]),
      collaboration: { ydoc },
    })

    expect(editor.model.title).toBe("Shared")
    expect(editor.model.id).toBe("id-Shared")
    expect(editor.model.nodes.map((node) => node.id).sort()).toEqual(["a", "b"])
    expect(readModelFromYDoc(ydoc)!.title).toBe("Shared")
  })

  it("seeds a document that holds no diagram from the model option", () => {
    const ydoc = new Y.Doc()

    mount({ model: model("Seed", ["x"]), collaboration: { ydoc } })

    const seeded = readModelFromYDoc(ydoc)!
    expect(seeded.id).toBe("id-Seed")
    expect(seeded.title).toBe("Seed")
    expect(seeded.nodes.map((node) => node.id)).toEqual(["x"])
  })

  it("renders a diagram the host writes after mounting", () => {
    const ydoc = new Y.Doc()
    writeModelToYDoc(ydoc, model("First", ["a"]))
    const editor = mount({ collaboration: { ydoc } })

    writeModelToYDoc(ydoc, model("Second", ["b", "c"]))

    expect(editor.model.title).toBe("Second")
    expect(editor.model.id).toBe("id-Second")
    expect(editor.model.nodes.map((node) => node.id).sort()).toEqual(["b", "c"])
  })

  it("leaves the host's document and awareness alive on destroy", () => {
    const ydoc = new Y.Doc()
    const awareness = new Awareness(ydoc)
    awareness.setLocalStateField("user", { name: "Ada", color: "#ff0000" })
    writeModelToYDoc(ydoc, model("Shared", ["a"]))
    const editor = mount({ collaboration: { ydoc, awareness } })

    const destroyDoc = vi.spyOn(Y.Doc.prototype, "destroy")
    editors.splice(0)
    editor.destroy()

    expect(destroyDoc).not.toHaveBeenCalled()
    destroyDoc.mockRestore()
    expect(ydoc.isDestroyed).toBe(false)
    expect(awareness.getLocalState()).toMatchObject({
      user: { name: "Ada", color: "#ff0000" },
    })
    expect(readModelFromYDoc(ydoc)!.nodes).toHaveLength(1)
    awareness.destroy()
  })

  it("does not change a shared diagram by mounting on it", () => {
    const ydoc = new Y.Doc()
    const shared = { ...model("Shared", ["a"]), id: "" }
    writeModelToYDoc(ydoc, shared)
    const before = Y.encodeStateVector(ydoc)

    mount({ readonly: true, collaboration: { ydoc } })

    expect(Y.encodeStateVector(ydoc)).toEqual(before)
  })

  it("keeps a title the host document already carries when it seeds the diagram", () => {
    const ydoc = new Y.Doc()
    ydoc.getMap("diagramMetadata").set("diagramTitle", "From host")

    mount({ model: model("From option", ["x"]), collaboration: { ydoc } })

    expect(readModelFromYDoc(ydoc)!.title).toBe("From host")
  })

  it("carries the interactive selection of a shared diagram into the model", () => {
    const ydoc = new Y.Doc()
    const interactive = { elements: { a: true }, relationships: {} }
    writeModelToYDoc(ydoc, { ...model("Shared", ["a"]), interactive })

    const editor = mount({ collaboration: { ydoc } })

    expect(editor.model.interactive).toEqual(interactive)
  })

  it("leaves the user a host awareness carries alone", () => {
    const ydoc = new Y.Doc()
    const awareness = new Awareness(ydoc)
    const user = { id: "u1", name: "Ada", color: "#ff0000" }
    awareness.setLocalStateField("user", user)
    writeModelToYDoc(ydoc, model("Shared", ["a"]))

    mount({ collaboration: { ydoc, awareness } })

    expect(awareness.getLocalState()!.user).toEqual(user)
  })

  it("still destroys the document it created itself", () => {
    const destroyDoc = vi.spyOn(Y.Doc.prototype, "destroy")
    const editor = mount({ model: model("Own", ["x"]) })

    editors.splice(0)
    editor.destroy()

    expect(destroyDoc).toHaveBeenCalledTimes(1)
    destroyDoc.mockRestore()
  })

  it("rejects an awareness without a document", () => {
    const awareness = new Awareness(new Y.Doc())
    expect(() => mount({ collaboration: { awareness } })).toThrow(
      /requires collaboration\.ydoc/
    )
    awareness.destroy()
  })

  it("rejects an awareness bound to another document", () => {
    const awareness = new Awareness(new Y.Doc())
    expect(() =>
      mount({ collaboration: { ydoc: new Y.Doc(), awareness } })
    ).toThrow(/must be bound/)
    awareness.destroy()
  })
})
