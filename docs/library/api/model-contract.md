---
id: model-contract
title: Model JSON contract
description: The versioned, documented JSON Schema for the Apollon diagram model — the stable wire format for storing and exchanging diagrams.
---

# Model JSON contract

`editor.model` (and the value you persist, send to a server, or hand to another
tool) is a plain JSON object. This page documents that wire format as a
**stable, versioned contract** so integrators — Artemis, BESSER, grading
scripts — can store and validate diagrams with confidence.

## The schema

Apollon publishes a JSON Schema generated from the source `UMLModel` type and
shipped in the package:

```ts
import schema from "@tumaet/apollon/schema" with { type: "json" }
```

It is also resolvable by URL for use with `$ref`, editor tooling, or CI
validators:

```
https://unpkg.com/@tumaet/apollon/schema/uml-model-4.schema.json
```

Validate a model with any JSON Schema validator, e.g. [ajv](https://ajv.js.org):

```ts no-check
import Ajv from "ajv"
import schema from "@tumaet/apollon/schema" with { type: "json" }

const validate = new Ajv({ strict: false }).compile(schema)
if (!validate(model)) console.error(validate.errors)
```

## Shape

A v4 model is:

```ts no-check
type UMLModel = {
  version: `4.${number}.${number}` // wire-format version, e.g. "4.0.0"
  id: string
  title: string
  type: UMLDiagramType // "ClassDiagram" | "BPMN" | … (13 values)
  nodes: ApollonNode[] // diagram elements
  edges: ApollonEdge[] // relationships
  assessments: { [elementId: string]: Assessment }
  interactive?: {
    elements: { [id: string]: boolean }
    relationships: { [id: string]: boolean }
  }
}
```

The schema is **strict about the envelope** — unknown top-level, node, or edge
fields are rejected, as are a missing `version`, an unknown diagram `type`, or a
malformed `nodes`/`edges` array.

### Element `data` is an open envelope

Each node and edge carries a `data` object whose shape depends on its `type`
(a class node's `name` / `attributes` / `methods`, a BPMN task's `taskType`, an
edge's multiplicities, colors, …). The schema intentionally leaves `data` open
(`additionalProperties`) rather than under-describing it; a full discriminated
union of all ~50 node types is planned follow-up work. For the concrete per-type
fields today, read `lib/types/nodes/NodeProps.ts` and `lib/edges/EdgeProps.ts`
in the source.

One cross-cutting `data` field worth knowing: every node — and every class
attribute/method — may carry an optional `tags: string[]` of host-defined
grouping labels. See [Element tags & group coloring](./element-tags) for their
normalization rules and the addressing API.

## Versioning policy

`version` tracks the **wire-format major line (4.x)** — _not_ the npm package
version. `importDiagram` stamps `4.0.0` when it _converts_ a v2 / v3 payload;
an already-v4 model passes through with its existing version string untouched.

| Change                | Bump  | What you do                                       |
| --------------------- | ----- | ------------------------------------------------- |
| Breaking shape change | MAJOR | new top-level version + `importDiagram` converter |
| New optional field    | MINOR | nothing — additive                                |
| No shape change       | PATCH | nothing                                           |

The schema describes **canonical v4 — the output of `importDiagram()`**. Older
v2 / v3 payloads are _not_ covered: normalise them first.

```ts no-check
import { importDiagram } from "@tumaet/apollon"

editor.model = importDiagram(maybeV2OrV3Json) // → guaranteed v4
```

Server code that only needs to normalize model JSON can use the DOM-free entry:

```ts
import { importDiagram } from "@tumaet/apollon/model"

export const normalizeDiagram = (data: unknown) => importDiagram(data)
```

The v2 / v3 detectors and converters live behind `@tumaet/apollon/internals`
and are **not** part of the stability guarantee — only `importDiagram` is.

> This is the diagram **data** contract. It is unrelated to the standalone
> webapp's diagram **version history** feature, which is about storing snapshots
> over time.

See also: **[Export](./export)** and **[Headless rendering](./headless-rendering)**.
