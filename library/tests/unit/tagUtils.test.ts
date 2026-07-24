import { describe, it, expect } from "vitest"
import {
  normalizeTags,
  getElementIdsByTag,
  withTags,
  resolveTagConfig,
  applyElementTags,
  DISABLED_TAG_CONFIG,
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

describe("resolveTagConfig", () => {
  it("is disabled when the option is absent or falsy", () => {
    expect(resolveTagConfig(undefined)).toBe(DISABLED_TAG_CONFIG)
    expect(resolveTagConfig(false)).toBe(DISABLED_TAG_CONFIG)
  })

  it("enables free-form tagging for `true`", () => {
    expect(resolveTagConfig(true)).toEqual({
      enabled: true,
      available: [],
      allowCreate: true,
    })
  })

  it("normalizes the vocabulary and disallows creation by default", () => {
    expect(resolveTagConfig({ available: ["  a ", "a", "b"] })).toEqual({
      enabled: true,
      available: ["a", "b"],
      allowCreate: false,
    })
  })

  it("does not cap the vocabulary at the per-element tag limit", () => {
    // The 50-tag cap bounds one element's tags, not the offered vocabulary — a
    // host may expose one tag per test case, well past 50.
    const many = Array.from(
      { length: MAX_TAGS_PER_ELEMENT + 25 },
      (_, i) => `test${i}`
    )
    expect(resolveTagConfig({ available: many }).available).toHaveLength(
      MAX_TAGS_PER_ELEMENT + 25
    )
  })

  it("respects an explicit allowCreate over the default", () => {
    expect(resolveTagConfig({ available: ["a"], allowCreate: true })).toEqual({
      enabled: true,
      available: ["a"],
      allowCreate: true,
    })
    // No vocabulary but creation off: a manage-existing-only mode.
    expect(resolveTagConfig({ allowCreate: false })).toEqual({
      enabled: true,
      available: [],
      allowCreate: false,
    })
  })
})

describe("applyElementTags", () => {
  const nodes = [
    node("class1", {
      name: "C",
      tags: ["old"],
      attributes: [{ id: "a1", name: "x" }],
      methods: [{ id: "m1", name: "y()", tags: ["stale"] }],
    }),
  ] as ApollonNode[]

  it("sets tags on a node by id", () => {
    const next = applyElementTags(nodes, "class1", ["fresh"])
    expect((next[0].data as { tags?: string[] }).tags).toEqual(["fresh"])
  })

  it("sets tags on a nested member by id", () => {
    const next = applyElementTags(nodes, "a1", ["  T  ", "T"])
    const attr = (next[0].data as { attributes: { tags?: string[] }[] })
      .attributes[0]
    expect(attr.tags).toEqual(["T"])
  })

  it("clears a member's tags with an empty list (omitting the key)", () => {
    const next = applyElementTags(nodes, "m1", [])
    const method = (next[0].data as { methods: Record<string, unknown>[] })
      .methods[0]
    expect("tags" in method).toBe(false)
  })

  it("returns the same array reference when nothing matched", () => {
    expect(applyElementTags(nodes, "missing", ["x"])).toBe(nodes)
  })
})
