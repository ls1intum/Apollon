import { describe, expect, it } from "vitest"
import type { PendingVersion } from "@/types"
import { structuralFingerprint, isNamedVersion } from "@/lib/version/predicates"
import { groupUnnamedRuns } from "./utils"
import { versioningStrings as t } from "./strings"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pv(
  id: string,
  overrides: Partial<PendingVersion> = {}
): PendingVersion {
  return {
    id,
    diagramId: "d1",
    name: "",
    description: "",
    createdAt: "2026-04-29T12:00:00Z",
    kind: "auto",
    librarySchemaVersion: "4.0.0",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// structuralFingerprint
// ---------------------------------------------------------------------------

describe("structuralFingerprint", () => {
  const baseModel = {
    nodes: [
      {
        id: "n1",
        type: "Class",
        position: { x: 100, y: 200 },
        data: { label: "Foo" },
      },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
    assessments: { score: 42 },
    title: "My Diagram",
    type: "ClassDiagram",
    version: "4.0.0",
  }

  it("volatile UI keys do NOT change the fingerprint", () => {
    const base = structuralFingerprint(baseModel)

    const withVolatile = structuralFingerprint({
      ...baseModel,
      nodes: [
        {
          ...baseModel.nodes[0],
          selected: true,
          dragging: true,
          resizing: { width: 300, height: 200 },
          hidden: true,
          measured: { width: 150, height: 80 },
          selectable: false,
          draggable: false,
          connectable: true,
          deletable: false,
        },
      ],
    })

    expect(withVolatile).toBe(base)
  })

  it("volatile keys are stripped even when deeply nested", () => {
    const withNested = structuralFingerprint({
      ...baseModel,
      nodes: [
        {
          ...baseModel.nodes[0],
          data: {
            label: "Foo",
            someGroup: { selected: true, measured: { w: 10 } },
          },
        },
      ],
    })

    // The nested "selected" and "measured" should be stripped too
    expect(withNested).toBe(
      structuralFingerprint({
        ...baseModel,
        nodes: [
          {
            ...baseModel.nodes[0],
            data: { label: "Foo", someGroup: {} },
          },
        ],
      })
    )
  })

  it("structural changes DO change the fingerprint", () => {
    const base = structuralFingerprint(baseModel)

    // Adding a node
    expect(
      structuralFingerprint({
        ...baseModel,
        nodes: [...baseModel.nodes, { id: "n2", type: "Interface" }],
      })
    ).not.toBe(base)

    // Changing an edge
    expect(
      structuralFingerprint({
        ...baseModel,
        edges: [{ id: "e1", source: "n1", target: "n3" }],
      })
    ).not.toBe(base)

    // Changing the title
    expect(structuralFingerprint({ ...baseModel, title: "Renamed" })).not.toBe(
      base
    )

    // Changing the type
    expect(
      structuralFingerprint({ ...baseModel, type: "SequenceDiagram" })
    ).not.toBe(base)

    // Changing the version
    expect(structuralFingerprint({ ...baseModel, version: "4.1.0" })).not.toBe(
      base
    )
  })

  it("only hashes the six structural fields, ignoring extra top-level keys", () => {
    const base = structuralFingerprint(baseModel)

    const withExtra = structuralFingerprint({
      ...baseModel,
      // These are not in the six-field pick, so they should be ignored
      randomField: "surprise",
      anotherOne: 999,
    } as typeof baseModel & Record<string, unknown>)

    expect(withExtra).toBe(base)
  })

  it("treats missing optional fields consistently", () => {
    const minimal = { nodes: [], edges: [] }
    const withUndefined = {
      nodes: [],
      edges: [],
      assessments: undefined,
      title: undefined,
      type: undefined,
      version: undefined,
    }
    // Both should produce the same fingerprint since JSON.stringify
    // omits undefined values
    expect(structuralFingerprint(minimal)).toBe(
      structuralFingerprint(withUndefined)
    )
  })
})

// ---------------------------------------------------------------------------
// isNamedVersion
// ---------------------------------------------------------------------------

describe("isNamedVersion", () => {
  it("auto-save with no name/description is NOT named", () => {
    expect(isNamedVersion(pv("v1", { kind: "auto" }))).toBe(false)
  })

  it("user save (kind=user) IS always named, even without name/description", () => {
    expect(
      isNamedVersion(pv("v1", { kind: "user", name: "", description: "" }))
    ).toBe(true)
  })

  it("auto-save WITH a non-empty name IS named", () => {
    expect(isNamedVersion(pv("v1", { kind: "auto", name: "milestone" }))).toBe(
      true
    )
  })

  it("auto-save WITH a non-empty description IS named", () => {
    expect(
      isNamedVersion(pv("v1", { kind: "auto", description: "important" }))
    ).toBe(true)
  })

  it("whitespace-only name/description does NOT count as named", () => {
    expect(
      isNamedVersion(
        pv("v1", { kind: "auto", name: "   ", description: "  \t " })
      )
    ).toBe(false)
  })

  it("empty string name with real description IS named", () => {
    expect(
      isNamedVersion(
        pv("v1", { kind: "auto", name: "", description: "real note" })
      )
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// groupUnnamedRuns
// ---------------------------------------------------------------------------

describe("groupUnnamedRuns", () => {
  it("empty input produces empty output", () => {
    expect(groupUnnamedRuns([])).toEqual([])
  })

  it("single unnamed auto-save is a standalone single, not a group", () => {
    const result = groupUnnamedRuns([pv("a")])
    expect(result).toHaveLength(1)
    expect(result[0]!.kind).toBe("single")
  })

  it("single named version is a standalone single", () => {
    const result = groupUnnamedRuns([pv("a", { kind: "user" })])
    expect(result).toHaveLength(1)
    expect(result[0]!.kind).toBe("single")
  })

  it("consecutive unnamed auto-saves collapse into an auto-group", () => {
    const versions = [pv("a"), pv("b"), pv("c")]
    const result = groupUnnamedRuns(versions)

    expect(result).toHaveLength(1)
    expect(result[0]!.kind).toBe("auto-group")
    if (result[0]!.kind === "auto-group") {
      expect(result[0]!.first.id).toBe("a")
      expect(result[0]!.versions).toHaveLength(3)
      expect(result[0]!.versions.map((v) => v.id)).toEqual(["a", "b", "c"])
    }
  })

  it("named versions break auto-save runs into separate groups", () => {
    const versions = [
      pv("a1"),
      pv("a2"),
      pv("named", { kind: "user" }),
      pv("b1"),
      pv("b2"),
      pv("b3"),
    ]
    const result = groupUnnamedRuns(versions)

    expect(result).toHaveLength(3)
    // First group: a1, a2
    expect(result[0]!.kind).toBe("auto-group")
    if (result[0]!.kind === "auto-group") {
      expect(result[0]!.versions.map((v) => v.id)).toEqual(["a1", "a2"])
    }
    // Named single
    expect(result[1]!.kind).toBe("single")
    if (result[1]!.kind === "single") {
      expect(result[1]!.version.id).toBe("named")
    }
    // Second group: b1, b2, b3
    expect(result[2]!.kind).toBe("auto-group")
    if (result[2]!.kind === "auto-group") {
      expect(result[2]!.versions.map((v) => v.id)).toEqual(["b1", "b2", "b3"])
    }
  })

  it("all named versions produce all singles — no grouping", () => {
    const versions = [
      pv("a", { kind: "user" }),
      pv("b", { kind: "user" }),
      pv("c", { kind: "user" }),
    ]
    const result = groupUnnamedRuns(versions)

    expect(result).toHaveLength(3)
    expect(result.every((e) => e.kind === "single")).toBe(true)
  })

  it("auto-save with a description counts as named and breaks the run", () => {
    const versions = [
      pv("a"),
      pv("labelled", { kind: "auto", description: "important checkpoint" }),
      pv("b"),
    ]
    const result = groupUnnamedRuns(versions)

    // a -> single (lone unnamed), labelled -> single (named), b -> single (lone unnamed)
    expect(result).toHaveLength(3)
    expect(result.every((e) => e.kind === "single")).toBe(true)
  })

  it("preserves the order of versions within groups", () => {
    const versions = [pv("z"), pv("y"), pv("x"), pv("w")]
    const result = groupUnnamedRuns(versions)

    expect(result).toHaveLength(1)
    if (result[0]!.kind === "auto-group") {
      expect(result[0]!.versions.map((v) => v.id)).toEqual(["z", "y", "x", "w"])
      expect(result[0]!.first.id).toBe("z")
    }
  })
})

// ---------------------------------------------------------------------------
// Notification string formatting (guards against empty-name regressions)
// ---------------------------------------------------------------------------

describe("notification string formatting", () => {
  describe("restoredSnack", () => {
    it("renders version name in quotes", () => {
      expect(t.restoredSnack("My checkpoint")).toBe(
        "Restored 'My checkpoint'. Your previous canvas was saved."
      )
    })

    it("renders fallback name when no version name", () => {
      expect(t.restoredSnack("the previous version")).toBe(
        "Restored 'the previous version'. Your previous canvas was saved."
      )
    })

    it("renders seq-based fallback", () => {
      expect(t.restoredSnack("#3")).toBe(
        "Restored '#3'. Your previous canvas was saved."
      )
    })

    it("renders empty quotes when passed empty string (the bug we fixed)", () => {
      // This is the broken path that handleRestoreFromPreview used to trigger.
      // Now that call site is removed, but verify the string itself is consistent.
      expect(t.restoredSnack("")).toBe(
        "Restored ''. Your previous canvas was saved."
      )
    })
  })

  describe("collaboratorRestoredTitle", () => {
    it("renders actor name when available", () => {
      expect(t.collaboratorRestoredTitle("Alice")).toBe(
        "Alice restored an earlier version. Your view was updated."
      )
    })

    it("renders fallback when actor is unknown", () => {
      expect(t.collaboratorRestoredTitle("A collaborator")).toBe(
        "A collaborator restored an earlier version. Your view was updated."
      )
    })
  })
})
