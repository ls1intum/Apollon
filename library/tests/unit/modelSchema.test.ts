import { describe, it, expect } from "vitest"
import Ajv from "ajv"
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { join } from "node:path"
// @ts-expect-error — plain .mjs build script, no type declarations.
import { buildModelSchema } from "../../scripts/gen-schema.mjs"
import { importDiagram } from "@/utils/versionConverter"

const committed = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "../../schema/uml-model-4.schema.json"),
    "utf8"
  )
)

const ajv = new Ajv({ allowUnionTypes: true, strict: false })
const validate = ajv.compile(committed)

// A minimal v3 class diagram, to prove importDiagram's canonical v4 output —
// what the contract actually describes — validates.
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

const v4Model = {
  version: "4.0.0",
  id: "d1",
  title: "t",
  type: "ClassDiagram",
  nodes: [
    {
      id: "n1",
      type: "class",
      position: { x: 0, y: 0 },
      width: 160,
      height: 60,
      measured: { width: 160, height: 60 },
      // per-type fields live in an open `data` envelope
      data: { name: "Person", attributes: [], methods: [] },
    },
  ],
  edges: [],
  assessments: {
    n1: { modelElementId: "n1", elementType: "Class", score: 1 },
  },
  // dynamic element-id → boolean maps
  interactive: { elements: { n1: true }, relationships: {} },
}

// `ajv.compile(committed)` above throws at import if the schema is invalid, so
// schema validity is covered without a dedicated (unfalsifiable) test.
describe("published model JSON schema", () => {
  it("pins a version pattern that rejects empty segments", () => {
    const re = new RegExp(committed.properties.version.pattern)
    expect(re.test("4.6.0")).toBe(true)
    expect(re.test("4..")).toBe(false) // `\d+` rejects empty segments; a regression to `\d*` would let this through
    expect(re.test("3.0.0")).toBe(false)
  })

  it("validates the canonical output of importDiagram()", () => {
    const model = importDiagram(structuredClone(v3ClassDiagram))
    expect(validate(model)).toBe(true)
  })

  it("accepts dynamic-key maps and open per-type element data", () => {
    // Regression guard: a `Record<string, boolean>` was emitted closed and
    // rejected every populated `interactive` map.
    expect(validate(v4Model)).toBe(true)
  })

  it("rejects malformed models", () => {
    expect(validate({ version: "3.0.0", id: "x", title: "t" })).toBe(false)
    expect(
      validate({
        ...v4Model,
        interactive: { elements: { n1: "yes" }, relationships: {} },
      })
    ).toBe(false)
  })

  it("matches the committed file — run `pnpm gen:schema` if this fails", () => {
    // buildModelSchema() compiles the whole TS program, so allow well beyond
    // the 5 s default on cold CI runners.
    expect(buildModelSchema()).toEqual(committed)
  }, 60_000)
})

// Contract lock: every real diagram model the app round-trips, including the
// bundled starter templates, must validate after importDiagram. This proves the
// open `data` envelope is correct, guarantees templates work through both the
// preset and direct-file import paths, and guards against future schema drift.
describe("schema accepts every real diagram model (fixtures)", () => {
  const dirs = [
    join(import.meta.dirname, "../../../standalone/webapp/tests/fixtures"),
    join(
      import.meta.dirname,
      "../../../standalone/webapp/assets/diagramTemplates"
    ),
  ]
  const models = dirs.flatMap((dir) =>
    existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(".json"))
          .map((f) => [f, join(dir, f)] as const)
      : []
  )

  it("found fixtures to validate", () => {
    expect(models.length).toBeGreaterThan(10)
  })

  it.each(models)("validates importDiagram(%s)", (_name, path) => {
    const model = importDiagram(JSON.parse(readFileSync(path, "utf8")))
    // Fail with the ajv errors inline — far more useful than a bare `false`.
    expect(validate(model) || JSON.stringify(validate.errors, null, 2)).toBe(
      true
    )
  })
})
