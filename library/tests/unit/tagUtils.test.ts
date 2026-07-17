import { describe, it, expect } from "vitest"
import {
  normalizeTags,
  getElementIdsByTag,
  withTags,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_ELEMENT,
} from "@/utils/tagUtils"
import type { ApollonNode } from "@/typings"

// The helpers only read `id` and `data`, so skip the geometry a full node carries.
const node = (
  id: string,
  data: Record<string, unknown>
): Pick<ApollonNode, "id" | "data"> => ({ id, data })

describe("normalizeTags", () => {
  it("trims and drops blank entries", () => {
    expect(normalizeTags(["  a ", "", "   ", "b"])).toEqual(["a", "b"])
  })

  it("de-duplicates case-sensitively, keeping the first occurrence's order", () => {
    expect(normalizeTags(["b", "a", "b", "A", " a "])).toEqual(["b", "a", "A"])
  })

  it("rejects entries that are not strings", () => {
    expect(normalizeTags(["ok", 1, null, undefined, {}, ["x"]])).toEqual(["ok"])
  })

  it("drops entries containing control characters", () => {
    expect(normalizeTags(["good", "bad\nline", "tab\tbed"])).toEqual(["good"])
  })

  it("keeps the punctuation and unicode that real test names use", () => {
    expect(
      normalizeTags(["testAttributes[Context]", "sort()", "café"])
    ).toEqual(["testAttributes[Context]", "sort()", "café"])
  })

  it("drops over-length tags rather than truncating", () => {
    const exact = "y".repeat(MAX_TAG_LENGTH)
    expect(normalizeTags(["x".repeat(MAX_TAG_LENGTH + 1), exact])).toEqual([
      exact,
    ])
  })

  it("drops tags past the per-element cap", () => {
    const many = Array.from(
      { length: MAX_TAGS_PER_ELEMENT + 10 },
      (_, i) => `t${i}`
    )
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS_PER_ELEMENT)
  })

  it("returns [] for input that is not an array", () => {
    expect(normalizeTags(undefined)).toEqual([])
    expect(normalizeTags("tag")).toEqual([])
    expect(normalizeTags(null)).toEqual([])
  })

  it("is idempotent on input it has already rejected or rewritten", () => {
    const once = normalizeTags(["  a", "a", 7, "c", "bad\nline"])
    expect(once).toEqual(["a", "c"])
    expect(normalizeTags(once)).toEqual(once)
  })
})

describe("withTags", () => {
  it("stores the normalized list without mutating the original", () => {
    const item = { id: "a", name: "x" }
    expect(withTags(item, [" t ", "t"])).toEqual({
      id: "a",
      name: "x",
      tags: ["t"],
    })
    expect(item).toEqual({ id: "a", name: "x" })
  })

  it("omits the key entirely when the list is empty", () => {
    expect(withTags({ id: "a", name: "x", tags: ["t"] }, [])).toEqual({
      id: "a",
      name: "x",
    })
  })
})

describe("getElementIdsByTag", () => {
  const nodes = [
    node("class1", {
      name: "Context",
      tags: ["design"],
      attributes: [
        { id: "attr1", name: "dates", tags: ["testAttributes[Context]"] },
        { id: "attr2", name: "count" },
      ],
      methods: [
        {
          id: "meth1",
          name: "sort()",
          tags: ["testMethods[Context]", "design"],
        },
      ],
    }),
    node("class2", {
      name: "Other",
      attributes: [
        { id: "attr3", name: "x", tags: ["testAttributes[Context]"] },
      ],
      methods: [],
    }),
  ]

  it("finds every attribute sharing one tag across nodes, in document order", () => {
    expect(getElementIdsByTag(nodes, "testAttributes[Context]")).toEqual([
      "attr1",
      "attr3",
    ])
  })

  it("matches nodes, attributes, and methods alike", () => {
    expect(getElementIdsByTag(nodes, "design")).toEqual(["class1", "meth1"])
  })

  it("is case-sensitive", () => {
    expect(getElementIdsByTag(nodes, "Design")).toEqual([])
  })

  it("returns [] for an unknown tag", () => {
    expect(getElementIdsByTag(nodes, "missing")).toEqual([])
  })

  it("matches with the same string the host stored, however padded", () => {
    // Stored tags are trimmed, so the query must be too — otherwise a host that
    // writes "  foo  " can never read it back.
    const padded = [node("c", { name: "C", tags: ["  foo  "] })]
    expect(getElementIdsByTag(padded, "  foo  ")).toEqual(["c"])
    expect(getElementIdsByTag(padded, "foo")).toEqual(["c"])
  })

  it("never mistakes the tags array itself for a member list", () => {
    // Hand-authored JSON could nest an id-bearing object inside `tags`; the walk
    // must not surface it as a phantom element.
    const hostile = [
      node("n1", { name: "N", tags: [{ id: "phantom", tags: ["ghost"] }] }),
    ]
    expect(getElementIdsByTag(hostile, "ghost")).toEqual([])
  })

  it("finds taggable children structurally, not by array name", () => {
    // An SFC action table's `actionRows` — same shape, no special-casing.
    const sfc = [
      node("table", {
        name: "T",
        actionRows: [
          { id: "row1", name: "N", identifier: "a", tags: ["oracle"] },
        ],
      }),
    ]
    expect(getElementIdsByTag(sfc, "oracle")).toEqual(["row1"])
  })
})
