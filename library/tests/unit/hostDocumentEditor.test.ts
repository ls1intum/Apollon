import { afterEach, describe, expect, it, vi } from "vitest"
import { act } from "react"
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
const documents: Y.Doc[] = []
const createDoc = () => {
  const ydoc = new Y.Doc()
  documents.push(ydoc)
  return ydoc
}
const mount = (options: ConstructorParameters<typeof ApollonEditor>[1]) => {
  const element = document.createElement("div")
  document.body.appendChild(element)
  const editor = new ApollonEditor(element, options)
  editors.push(editor)
  return editor
}

afterEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  await act(async () => {
    for (const editor of editors.splice(0)) editor.destroy()
  })
  for (const ydoc of documents.splice(0)) ydoc.destroy()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ""
})

describe("ApollonEditor on a host-owned document", () => {
  it("shows the diagram already in the document and ignores the model option", () => {
    const ydoc = createDoc()
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

  it("preserves special assessment keys when adopting and replacing a document", () => {
    const ydoc = createDoc()
    const shared = model("Shared", ["a"])
    shared.assessments = JSON.parse(
      '{"__proto__":{"modelElementId":"a","elementType":"class","score":1},"constructor":{"modelElementId":"a","elementType":"class","score":2}}'
    )
    writeModelToYDoc(ydoc, shared)
    const editor = mount({ collaboration: { ydoc } })

    expect(editor.model.assessments).toEqual(shared.assessments)
    expect(Object.keys(editor.model.assessments).sort()).toEqual([
      "__proto__",
      "constructor",
    ])
    shared.assessments["__proto__"].score = 3
    writeModelToYDoc(ydoc, shared)
    expect(editor.model.assessments).toEqual(shared.assessments)
  })

  it("seeds a document that holds no diagram from the model option", () => {
    const ydoc = createDoc()

    mount({ model: model("Seed", ["x"]), collaboration: { ydoc } })

    const seeded = readModelFromYDoc(ydoc)!
    expect(seeded.id).toBe("id-Seed")
    expect(seeded.title).toBe("Seed")
    expect(seeded.nodes.map((node) => node.id)).toEqual(["x"])
  })

  it("renders a diagram the host writes after mounting", () => {
    const ydoc = createDoc()
    writeModelToYDoc(ydoc, model("First", ["a"]))
    const editor = mount({ collaboration: { ydoc } })

    writeModelToYDoc(ydoc, model("Second", ["b", "c"]))

    expect(editor.model.title).toBe("Second")
    expect(editor.model.id).toBe("id-Second")
    expect(editor.model.nodes.map((node) => node.id).sort()).toEqual(["b", "c"])
  })

  it("leaves the host's document and awareness alive on destroy", () => {
    const ydoc = createDoc()
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
  })

  it.each([
    [
      "ClassDiagram",
      "class",
      { name: "Autosized", attributes: [], methods: [] },
    ],
    [
      "CommunicationDiagram",
      "communicationObjectName",
      { name: "Autosized", attributes: [], methods: [] },
    ],
    [
      "ObjectDiagram",
      "objectName",
      { name: "Autosized", attributes: [], methods: [] },
    ],
    [
      "Sfc",
      "sfcActionTable",
      {
        name: "Actions",
        actionRows: [{ id: "row", name: "Action", identifier: "N" }],
      },
    ],
    ["Sfc", "sfcJump", { name: "Target" }],
  ] as const)(
    "preserves readonly geometry and editable autosizing for %s %s",
    async (diagramType, nodeType, data) => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
      vi.stubGlobal(
        "DOMMatrixReadOnly",
        class {
          m22 = 1
        }
      )
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
        function (this: HTMLElement) {
          return Number.parseFloat(this.style.width) || 800
        }
      )
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
        function (this: HTMLElement) {
          return Number.parseFloat(this.style.height) || 600
        }
      )

      for (const readonly of [true, false]) {
        const ydoc = createDoc()
        const shared = model("Shared", ["a"])
        shared.type = diagramType
        shared.nodes[0] = {
          ...shared.nodes[0],
          type: nodeType,
          data,
          width: 20,
          height: 10,
          measured: { width: 20, height: 10 },
        }
        if (nodeType === "class") {
          shared.nodes.push(model("Target", ["b"]).nodes[0])
          shared.edges = [
            {
              id: "edge",
              source: "a",
              target: "b",
              type: "ClassBidirectional",
              sourceHandle: "right",
              targetHandle: "left",
              data: { points: [] },
            },
          ]
        }
        writeModelToYDoc(ydoc, shared)
        const before = Y.encodeStateAsUpdate(ydoc)
        const onUpdate = vi.fn()
        ydoc.on("update", onUpdate)
        let editor!: ApollonEditor

        await act(async () => {
          editor = mount({ readonly, controls: [], collaboration: { ydoc } })
        })
        await act(async () => {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          )
        })

        const svg = document.querySelector('.react-flow__node[data-id="a"] svg')
        expect(svg).not.toBeNull()
        expect(Number(svg!.getAttribute("height"))).toBeGreaterThan(10)
        if (readonly) {
          expect(
            document.querySelector(".apollon-editor--readonly")
          ).not.toBeNull()
          const displayed = editor.model.nodes[0]
          expect(displayed.width > 20 || displayed.height > 10).toBe(true)
          await act(async () => {
            document
              .querySelector(".react-flow__pane")!
              .dispatchEvent(new MouseEvent("click", { bubbles: true }))
            document.querySelector(".react-flow__pane")!.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "a",
                ctrlKey: true,
                bubbles: true,
                cancelable: true,
              })
            )
          })
          expect(onUpdate).not.toHaveBeenCalled()
          expect(Y.encodeStateAsUpdate(ydoc)).toEqual(before)
        } else {
          expect(onUpdate).toHaveBeenCalled()
          const resized = readModelFromYDoc(ydoc)!.nodes[0]
          expect(resized.width > 20 || resized.height > 10).toBe(true)
        }

        await act(async () => editor.destroy())
      }
    }
  )

  it("rejects a second active editor and allows remounting after destroy", () => {
    const ydoc = createDoc()
    writeModelToYDoc(ydoc, model("Shared", ["a"]))
    const editor = mount({ collaboration: { ydoc } })

    expect(() => mount({ collaboration: { ydoc } })).toThrow(
      /already has an active ApollonEditor/
    )
    editor.destroy()
    const remounted = mount({ collaboration: { ydoc } })

    expect(remounted.model.nodes.map((node) => node.id)).toEqual(["a"])
    editor.destroy()
    expect(() => mount({ collaboration: { ydoc } })).toThrow(
      /already has an active ApollonEditor/
    )
  })

  it("keeps a title the host document already carries when it seeds the diagram", () => {
    const ydoc = createDoc()
    ydoc.getMap("diagramMetadata").set("diagramTitle", "From host")

    mount({ model: model("From option", ["x"]), collaboration: { ydoc } })

    expect(readModelFromYDoc(ydoc)!.title).toBe("From host")
  })

  it("keeps the interactive selection of the model it seeds a document with", () => {
    const ydoc = createDoc()
    const interactive = { elements: { x: true }, relationships: {} }

    mount({
      model: { ...model("Seed", ["x"]), interactive },
      collaboration: { ydoc },
    })

    expect(readModelFromYDoc(ydoc)!.interactive).toEqual(interactive)
  })

  it("keeps its own interactive selection when the host writes another one", () => {
    const ydoc = createDoc()
    const mounted = { elements: { a: true }, relationships: {} }
    writeModelToYDoc(ydoc, { ...model("Shared", ["a"]), interactive: mounted })
    const editor = mount({ collaboration: { ydoc } })

    writeModelToYDoc(ydoc, {
      ...model("Shared", ["a"]),
      interactive: { elements: {}, relationships: {} },
    })

    expect(editor.model.interactive).toEqual(mounted)
  })

  it("carries the interactive selection of a shared diagram into the model", () => {
    const ydoc = createDoc()
    const interactive = { elements: { a: true }, relationships: {} }
    writeModelToYDoc(ydoc, { ...model("Shared", ["a"]), interactive })

    const editor = mount({ collaboration: { ydoc } })

    expect(editor.model.interactive).toEqual(interactive)
  })

  it("leaves the user a host awareness carries alone", () => {
    const ydoc = createDoc()
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
    const awareness = new Awareness(createDoc())
    expect(() => mount({ collaboration: { awareness } })).toThrow(
      /requires collaboration\.ydoc/
    )
  })

  it("rejects an awareness bound to another document", () => {
    const awareness = new Awareness(createDoc())
    const ydoc = createDoc()
    expect(() => mount({ collaboration: { ydoc, awareness } })).toThrow(
      /must be bound/
    )
    expect(() => mount({ collaboration: { ydoc } })).not.toThrow()
  })
})
