// Generate the published JSON Schema for the Apollon v4 model wire format.
//
// Source of truth: the `UMLModel` TypeScript type in lib/typings.ts. The schema
// is committed (schema/uml-model-4.schema.json), shipped in the package, and
// drift-checked by tests/unit/modelSchema.test.ts — run this to refresh it.
//
//   pnpm --filter @tumaet/apollon run gen:schema
//
// We use typescript-json-schema (TS type-checker based) rather than
// ts-json-schema-generator because the node/edge type discriminators are
// `keyof typeof <component map>`, and the AST-based generator chokes on the
// React component values in that map while the checker resolves them to a clean
// string union. See docs/library/api/model-contract.md for the versioning policy.

import * as TJS from "typescript-json-schema"
import process from "node:process"
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const LIB = resolve(here, "..")

// A stable, resolvable identifier: unpkg serves the published `./schema` export.
export const SCHEMA_ID =
  "https://unpkg.com/@tumaet/apollon/schema/uml-model-4.schema.json"

/**
 * Build the schema in memory. Exported so the sync test can regenerate and
 * compare without shelling out.
 */
export function buildModelSchema() {
  const program = TJS.programFromConfig(resolve(LIB, "tsconfig.json"))
  const schema = TJS.generateSchema(program, "UMLModel", {
    required: true,
    // Reject unknown top-level / node / edge fields. Element `data` is typed
    // with an index signature, so it stays open (additionalProperties).
    noExtraProps: true,
    ref: true,
    // Inline the top type and use clean named $defs for referenced types only;
    // aliasRef would otherwise emit duplicate "_1" definitions.
    aliasRef: false,
    topRef: false,
    strictNullChecks: true,
  })

  if (!schema) throw new Error("typescript-json-schema returned no schema")

  // typescript-json-schema emits draft-07 (`definitions`, not `$defs`); we keep
  // it deliberately for the widest validator and $ref-tooling compatibility.
  schema.$id = SCHEMA_ID
  schema.title = "Apollon UML model (v4)"
  schema.description =
    "Canonical v4 Apollon diagram model — the output of importDiagram(). " +
    "See https://ls1intum.github.io/Apollon/library/api/model-contract."

  // The TS template-literal type `4.${number}.${number}` becomes a loose
  // `^4\.[0-9]*\.[0-9]*$` (the `*` allows empty segments), so pin the pattern
  // explicitly: any 4.x.y with non-empty numeric segments validates. (Asserted
  // by the schema test.)
  if (!schema.properties?.version) {
    throw new Error(
      "UMLModel.version property missing from generated schema — refusing to " +
        "write a schema that cannot pin the version pattern."
    )
  }
  schema.properties.version = {
    type: "string",
    pattern: "^4\\.\\d+\\.\\d+$",
    description:
      "Wire-format version. Tracks the model MAJOR line (4.x), not the npm " +
      "package version.",
  }

  return schema
}

// Only write when run directly (`node scripts/gen-schema.mjs`), not when the
// sync test imports `buildModelSchema` — importing must not mutate the repo.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const schema = buildModelSchema()
  const out = resolve(LIB, "schema/uml-model-4.schema.json")
  // Raw stringify is the canonical form; library/schema/ is in .prettierignore
  // so this output is never reformatted (and `gen:schema` stays diff-free).
  writeFileSync(out, JSON.stringify(schema, null, 2) + "\n")
  // eslint-disable-next-line no-console
  console.log(`wrote ${out}`)
}
