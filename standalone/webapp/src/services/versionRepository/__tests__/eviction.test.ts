import { describe, expect, it } from "vitest"
import { planEviction } from "../eviction"
import type { VersionMetaRow } from "../idb"

/**
 * Eviction parity with the drawer's `isNamedVersion` predicate (shared
 * source of truth at `lib/version/predicates.ts`). Drift between eviction
 * and the drawer's autosave-filter would let rows the user sees as named
 * get swept first; this suite pins both behaviours together.
 */

type Row = Pick<VersionMetaRow, "id" | "name" | "description" | "kind">

const named = (id: string, description = "named"): Row => ({
  id,
  name: description,
  description,
  kind: "user",
})

const unnamed = (id: string): Row => ({
  id,
  name: "",
  description: "",
  kind: "auto",
})

const preRestore = (id: string, target = "v1"): Row => ({
  // Pre-restore auto-snapshots carry a system label, so the shared
  // `isNamedVersion` predicate (drawer + eviction) treats them as named —
  // they sit alongside user milestones in the FIFO and are only evicted
  // after every truly-unnamed (kind=auto, empty meta) row is gone.
  id,
  name: `Before restoring ${target}`,
  description: "",
  kind: "auto",
})

describe("planEviction", () => {
  it("returns no eviction when at-or-below cap", () => {
    const rows = [unnamed("a"), named("b")]
    expect(planEviction({ rows, cap: 3 })).toEqual({
      evictedVersionIds: [],
      evictedKinds: [],
    })
    expect(planEviction({ rows, cap: 2 })).toEqual({
      evictedVersionIds: [],
      evictedKinds: [],
    })
  })

  it("evicts oldest unnamed first (mixed list)", () => {
    // ASC by createdAt — index 0 is oldest.
    const rows = [
      unnamed("u1"),
      named("n1"),
      unnamed("u2"),
      named("n2"),
      unnamed("u3"),
    ]
    expect(planEviction({ rows, cap: 4 })).toEqual({
      evictedVersionIds: ["u1"],
      evictedKinds: ["unnamed"],
    })
  })

  it("evicts oldest named only when no unnamed remain", () => {
    const rows = [named("n1"), named("n2"), named("n3")]
    expect(planEviction({ rows, cap: 2 })).toEqual({
      evictedVersionIds: ["n1"],
      evictedKinds: ["named"],
    })
  })

  it("two-pass eviction: drains unnamed before any named", () => {
    const rows = [unnamed("u1"), named("n1"), unnamed("u2"), named("n2")]
    // overflow of 2 → both unnamed go before any named is touched.
    expect(planEviction({ rows, cap: 2 })).toEqual({
      evictedVersionIds: ["u1", "u2"],
      evictedKinds: ["unnamed", "unnamed"],
    })
  })

  it("two-pass eviction: spills over to named after unnamed drained", () => {
    const rows = [unnamed("u1"), named("n1"), named("n2"), named("n3")]
    // overflow of 2 → drop u1 first, then oldest named (n1).
    expect(planEviction({ rows, cap: 2 })).toEqual({
      evictedVersionIds: ["u1", "n1"],
      evictedKinds: ["unnamed", "named"],
    })
  })

  it("treats pre-restore auto-snapshots as named (system label = named)", () => {
    // Pre-restore rows have a system-generated `name`, so the shared
    // `isNamedVersion` predicate counts them as named. Without any
    // truly-unnamed rows present, the oldest by createdAt is evicted —
    // here that's `ps1`.
    const rows = [preRestore("ps1"), named("user-named"), preRestore("ps2")]
    expect(planEviction({ rows, cap: 2 })).toEqual({
      evictedVersionIds: ["ps1"],
      evictedKinds: ["named"],
    })
  })

  it("preserves pre-restore rows when truly-unnamed rows can absorb the overflow", () => {
    const rows = [unnamed("u1"), preRestore("ps1"), named("n1")]
    expect(planEviction({ rows, cap: 2 })).toEqual({
      evictedVersionIds: ["u1"],
      evictedKinds: ["unnamed"],
    })
  })

  it("respects ASC order — oldest unnamed first across non-contiguous gaps", () => {
    const rows = [
      named("n1"),
      unnamed("u1"),
      named("n2"),
      unnamed("u2"),
      named("n3"),
    ]
    expect(planEviction({ rows, cap: 4 })).toEqual({
      evictedVersionIds: ["u1"],
      evictedKinds: ["unnamed"],
    })
  })

  it("worst case: all named, large overflow", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      named(`n${i + 1}`, `named-${i + 1}`)
    )
    expect(planEviction({ rows, cap: 7 })).toEqual({
      evictedVersionIds: ["n1", "n2", "n3"],
      evictedKinds: ["named", "named", "named"],
    })
  })
})
