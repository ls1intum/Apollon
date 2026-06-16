import { describe, it, expect } from "vitest"
import Ajv from "ajv"
import { readFileSync } from "node:fs"
import { join } from "node:path"
// @ts-expect-error — plain .mjs build script, no type declarations.
import { buildModelSchema } from "../../scripts/gen-schema.mjs"
import { importDiagram } from "@/utils/versionConverter"
import { UMLDiagramType } from "@/types/DiagramType"

const schemaPath = join(
  import.meta.dirname,
  "../../schema/uml-model-4.schema.json"
)
const committed = JSON.parse(readFileSync(schemaPath, "utf8"))

// A v3-shaped class diagram (wrapped envelope) to prove importDiagram's output
// — the thing the contract actually describes — validates.
const v3ClassDiagram = {
  version: "3.0.0",
  type: "ClassDiagram",
  size: { width: 320, height: 120 },
  elements: {
    c1: {
      id: "c1",
      name: "Person",
      type: "Class",
      owner: null,
      bounds: { x: 0, y: 0, width: 160, height: 60 },
      attributes: [],
      methods: [],
    },
  },
  relationships: {},
  assessments: {},
}

describe("published model JSON schema", () => {
  const ajv = new Ajv({ allowUnionTypes: true, strict: false })

  it("is itself a valid JSON Schema (ajv compiles it)", () => {
    expect(() => ajv.compile(committed)).not.toThrow()
  })

  it("pins an explicit, strict version pattern (not the generator's loose one)", () => {
    expect(committed.properties.version.pattern).toBe("^4\\.\\d+\\.\\d+$")
    const re = new RegExp(committed.properties.version.pattern)
    expect(re.test("4.6.0")).toBe(true)
    expect(re.test("4.0.0")).toBe(true)
    expect(re.test("4..")).toBe(false) // the generator's [0-9]* would allow this
    expect(re.test("3.0.0")).toBe(false)
  })

  it("describes the diagram type as the full UMLDiagramType enum", () => {
    const typeEnum: string[] = committed.definitions.UMLDiagramType.enum
    expect([...typeEnum].sort()).toEqual(Object.values(UMLDiagramType).sort())
  })

  it("keeps element `data` an open envelope (per the documented contract)", () => {
    const nodeData = committed.properties.nodes.items.properties.data
    // Open: additionalProperties is a schema ({}), not `false`.
    expect(nodeData.additionalProperties).not.toBe(false)
  })

  it("validates the canonical output of importDiagram()", () => {
    const validate = ajv.compile(committed)
    const model = importDiagram(structuredClone(v3ClassDiagram))
    const ok = validate(model)
    if (!ok) {
      throw new Error(
        `importDiagram output failed schema validation: ${JSON.stringify(
          validate.errors,
          null,
          2
        )}`
      )
    }
    expect(ok).toBe(true)
  })

  it("rejects an obviously malformed model (wrong version, missing nodes)", () => {
    const validate = ajv.compile(committed)
    expect(validate({ version: "3.0.0", id: "x", title: "t" })).toBe(false)
  })

  it("matches the committed file — run `pnpm gen:schema` if this fails", () => {
    const regenerated = buildModelSchema()
    expect(regenerated).toEqual(committed)
  })
})
