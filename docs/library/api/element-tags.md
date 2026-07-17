---
id: element-tags
title: Element tags & group coloring
description: Give elements host-defined tags, address many elements at once by tag, and color a whole group by a computed status such as a build result.
---

# Element tags & group coloring

A **tag** is an opaque, host-defined label on an element — like a
[draw.io tag](https://www.drawio.com/doc/faq/shape-metadata) or a Kubernetes
label. Apollon never interprets one. Many elements may share a tag, so a host can
address a whole group at once: every attribute and method a programming-test case
covers, then color that group by the test's result.

Unlike an element's `id`, a tag is authored, many-to-many, and survives
copy/paste.

Tags live on a node's `data` and on each class **attribute** and **method** — any
element data with a `tags?: string[]` field. They are trimmed and de-duplicated;
a tag longer than 200 characters, containing control characters, or past the 50th
on one element is **dropped silently** — keep them short and printable. An empty
list is omitted from the saved model. Edges do not carry tags.

## Enabling tag authoring

Tag authoring is **off by default** — turn it on with the `tags` option. `true`
allows free-form tagging; an object restricts it:

```ts no-check
// Free-form: the user types any tag.
new ApollonEditor(container, { tags: true })

// Fixed vocabulary, pick-only (a user can only choose from `available`).
new ApollonEditor(container, { tags: { available: ["testName", "testType"] } })

// Vocabulary plus the freedom to create new tags.
new ApollonEditor(container, {
  tags: { available: ["testName"], allowCreate: true },
})
```

`allowCreate` defaults to `false` when you pass a vocabulary and `true` otherwise.
The option is reactive (`<Apollon tags={…}>` / `editor.setTags(…)`). When enabled,
each taggable row shows its tags as removable chips followed by a tag button that
opens a combobox to search the vocabulary, toggle a tag, or create one.

Tags a host puts on the model always load and stay queryable **regardless of this
option** — it gates only the authoring UI.

## Setting tags programmatically

A host can assign tags without the UI. For one element, use `setElementTags`
(replaces its tag list; `[]` clears it):

```ts no-check
editor.setElementTags("attribute-id", ["testAttributes[Context]"])
```

Or set them in bulk through the model like any other field:

```ts no-check
const model = editor.model
const context = model.nodes.find((n) => n.data.name === "Context")
context.data.attributes[0].tags = ["testAttributes[Context]"]
editor.model = model
```

## Addressing by tag

`getElementIdsByTag` returns the ids of every element carrying a tag — a node,
or one of its members (class attribute, method, SFC action row). Matching is exact and case-sensitive, apart from
surrounding whitespace, which is trimmed from both the query and stored tags. An
unknown or blank tag returns `[]`.

```ts no-check
const ids = editor.getElementIdsByTag("testAttributes[Context]")
```

## Coloring a group by a build result

Pair the query with [`setElementHighlights`](./assessment#highlight-elements),
whose overlay is ephemeral — the lifetime build feedback needs, since a result
belongs to one submission and must not enter the saved, shared model.

```ts
import { ApollonEditor } from "@tumaet/apollon"

const STATUS_COLOR = {
  pass: "rgba(34, 197, 94, 0.35)",
  fail: "rgba(239, 68, 68, 0.35)",
  untested: "rgba(148, 163, 184, 0.35)",
}

function applyBuildResults(
  editor: ApollonEditor,
  results: Record<string, keyof typeof STATUS_COLOR>
) {
  const highlights: Record<string, string> = {}
  for (const [tag, status] of Object.entries(results)) {
    for (const id of editor.getElementIdsByTag(tag)) {
      highlights[id] = STATUS_COLOR[status]
    }
  }
  editor.setElementHighlights(highlights)
}
```

Ids are a snapshot, so re-query after a model change (see
`subscribeToModelChange`). Unknown ids in the highlight map are ignored, so a
stale id from a just-deleted attribute is harmless.

See also: **[Assessment & read-only](./assessment)** for the highlight overlay and
scoring, and **[Model JSON contract](./model-contract)** for where `tags` sits on
the wire.
