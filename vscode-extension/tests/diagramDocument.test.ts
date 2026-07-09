import { describe, expect, it } from "vitest"
import type { UMLModel } from "@tumaet/apollon"
import {
  applyTextRangeEdits,
  DiagramParseError,
  detectFormatting,
  exportTargetPath,
  modelEdits,
  parseModel,
  readDocument,
  scaffold,
  scaffoldModel,
} from "../src/diagramDocument"

const model = (overrides: Partial<UMLModel> = {}): UMLModel =>
  ({
    version: "4.0.0",
    id: "d1",
    title: "Diagram",
    type: "ClassDiagram",
    nodes: [],
    edges: [],
    assessments: {},
    ...overrides,
  }) as UMLModel

/** What `modelEdits` produces, as the provider applies it. */
const rewrite = (text: string, next: UMLModel): string =>
  applyTextRangeEdits(text, modelEdits(text, next))

describe("parseModel", () => {
  it("reads a bare model document", () => {
    expect(parseModel(JSON.stringify(model())).type).toBe("ClassDiagram")
  })

  it("unwraps a model nested under `model`", () => {
    const wrapped = { id: "x", title: "T", model: model({ type: "BPMN" }) }
    expect(parseModel(JSON.stringify(wrapped)).type).toBe("BPMN")
  })

  it("rejects a document that is not JSON", () => {
    expect(() => parseModel("{ nope")).toThrow(DiagramParseError)
  })

  it("rejects JSON that carries no UML model", () => {
    expect(() => parseModel(`{ "hello": "world" }`)).toThrow(DiagramParseError)
  })
})

describe("readDocument", () => {
  // An empty file is a diagram waiting to be chosen, not a parse failure — the
  // canvas offers a type picker rather than a dead end.
  it("reports an empty document as empty, not invalid", () => {
    expect(readDocument("")).toEqual({ kind: "empty" })
  })

  it("treats a whitespace-only document as empty", () => {
    expect(readDocument("\n  \t\n")).toEqual({ kind: "empty" })
  })

  it("reports a model document", () => {
    expect(readDocument(JSON.stringify(model()))).toMatchObject({
      kind: "model",
    })
  })

  it("reports a non-empty document that is not a diagram as invalid", () => {
    expect(readDocument("{ nope")).toMatchObject({ kind: "invalid" })
    expect(readDocument(`{ "hello": "world" }`)).toMatchObject({
      kind: "invalid",
    })
  })
})

describe("modelEdits", () => {
  it("touches only the model's own range, not the whole document", () => {
    const text = JSON.stringify(
      { id: "x", lastUpdate: "2020-01-01", model: model(), token: "keep-me" },
      null,
      2
    )
    const edits = modelEdits(text, model({ title: "Renamed" }))
    expect(edits).toHaveLength(1)
    const [edit] = edits
    expect(edit.offset).toBeGreaterThan(0)
    expect(edit.offset + edit.length).toBeLessThan(text.length)
    expect(text.slice(0, edit.offset)).toContain("lastUpdate")
  })

  it("spans the whole document when the model IS the document", () => {
    const text = JSON.stringify(model(), null, 2)
    const [edit] = modelEdits(text, model({ title: "Renamed" }))
    expect(edit).toMatchObject({ offset: 0, length: text.length })
  })

  // `modify` rewrites the range unconditionally rather than diffing, so callers
  // must recognise a no-op from the resulting text, not the edit count.
  it("still emits an edit for an unchanged model, but it changes nothing", () => {
    const text = JSON.stringify(model(), null, 2)
    const edits = modelEdits(text, parseModel(text))
    expect(edits.length).toBeGreaterThan(0)
    expect(applyTextRangeEdits(text, edits)).toBe(text)
  })

  it("leaves the wrapper's sibling keys untouched", () => {
    const text = JSON.stringify(
      { id: "x", lastUpdate: "2020-01-01", model: model(), token: "keep-me" },
      null,
      2
    )
    const parsed = JSON.parse(rewrite(text, model({ title: "Renamed" })))
    expect(parsed.lastUpdate).toBe("2020-01-01")
    expect(parsed.token).toBe("keep-me")
    expect(parsed.model.title).toBe("Renamed")
  })

  // `.apollon` is read as JSONC. A hand-annotated file must survive a canvas
  // edit, or a user loses their comments the first time they drag a node.
  it("preserves comments and trailing commas outside the model", () => {
    const text = [
      "{",
      "  // the id is assigned by the server",
      `  "id": "x",`,
      `  "model": ${JSON.stringify(model(), null, 2)},`,
      "}",
    ].join("\n")
    const next = rewrite(text, model({ title: "Renamed" }))
    expect(next).toContain("// the id is assigned by the server")
    expect(next.trimEnd().endsWith(",\n}")).toBe(true)
    expect(parseModel(next).title).toBe("Renamed")
  })

  // `detectFormatting` is only useful if it actually reaches `modify`. These
  // pin the wiring; the unit tests below only pin the detection.
  it("writes back with the document's own indentation", () => {
    const text = JSON.stringify({ model: model() }, null, 4)
    expect(rewrite(text, model({ title: "Renamed" }))).toContain(
      '\n        "title"'
    )
  })

  it("writes back with the document's own line endings", () => {
    const text = JSON.stringify(model(), null, 2).replace(/\n/g, "\r\n")
    const next = rewrite(text, model({ title: "Renamed" }))
    expect(next).toContain("\r\n")
    expect(/(?<!\r)\n/.test(next)).toBe(false)
  })
})

describe("scaffold", () => {
  it("produces a document that parses back to the requested type", () => {
    const parsed = parseModel(scaffold("PetriNet", "My net"))
    expect(parsed.type).toBe("PetriNet")
    expect(parsed.title).toBe("My net")
    expect(parsed.nodes).toEqual([])
  })

  // The empty-file picker posts a scaffolded model straight into the commit
  // path, which writes it into a zero-length document.
  it("writes a scaffolded model into an empty document", () => {
    const built = scaffoldModel("Flowchart", "Flow")
    expect(parseModel(rewrite("", built))).toEqual(built)
  })
})

describe("detectFormatting", () => {
  it("detects tabs", () => {
    expect(detectFormatting('{\n\t"a": 1\n}')).toMatchObject({
      insertSpaces: false,
    })
  })

  it("detects a four-space indent", () => {
    expect(detectFormatting('{\n    "a": 1\n}')).toMatchObject({
      insertSpaces: true,
      tabSize: 4,
    })
  })

  it("detects CRLF line endings", () => {
    expect(detectFormatting('{\r\n  "a": 1\r\n}').eol).toBe("\r\n")
  })
})

describe("exportTargetPath", () => {
  it("swaps the extension", () => {
    expect(exportTargetPath("/w/a.apollon", "svg")).toBe("/w/a.svg")
  })

  it("leaves dots in directory names alone", () => {
    expect(exportTargetPath("/w/v1.2/a.apollon", "png")).toBe("/w/v1.2/a.png")
  })

  it("appends when there is no extension", () => {
    expect(exportTargetPath("/w/diagram", "svg")).toBe("/w/diagram.svg")
  })
})
