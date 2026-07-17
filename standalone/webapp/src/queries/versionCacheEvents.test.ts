import { describe, expect, it, vi } from "vitest"
import type { ControlEvent, VersionSummary } from "@/types"
import { createTestQueryClient } from "@/test/queryTestUtils"
import { versionKeys } from "./keys"
import type { VersionListData } from "./versionQueries"
import { applyControlEventToCache } from "./versionCacheEvents"

const DIAGRAM_ID = "d1"
const LIST_KEY = versionKeys.list("remote", DIAGRAM_ID)

function summary(id: string, overrides: Partial<VersionSummary> = {}) {
  return {
    id,
    diagramId: DIAGRAM_ID,
    name: id,
    description: "",
    createdAt: "2026-04-29T12:00:00Z",
    kind: "user" as const,
    librarySchemaVersion: "4.0.0",
    ...overrides,
  }
}

function seed(versions: VersionSummary[]): VersionListData {
  return {
    pages: [{ versions, nextCursor: undefined, total: versions.length }],
    pageParams: [undefined],
  }
}

function cachedIds(client: ReturnType<typeof createTestQueryClient>) {
  return client
    .getQueryData<VersionListData>(LIST_KEY)!
    .pages.flatMap((p) => p.versions.map((v) => v.id))
}

describe("applyControlEventToCache", () => {
  it("VERSION_DELETED removes the row and drops the cached body", () => {
    const client = createTestQueryClient()
    client.setQueryData(LIST_KEY, seed([summary("a"), summary("b")]))
    client.setQueryData(versionKeys.body("remote", DIAGRAM_ID, "a"), {
      nodes: [],
    })
    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_DELETED",
      versionId: "a",
    })
    expect(cachedIds(client)).toEqual(["b"])
    expect(
      client.getQueryData(versionKeys.body("remote", DIAGRAM_ID, "a"))
    ).toBeUndefined()
  })

  it("VERSION_RENAMED patches name + description in place", () => {
    const client = createTestQueryClient()
    client.setQueryData(LIST_KEY, seed([summary("a", { name: "old" })]))
    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_RENAMED",
      versionId: "a",
      name: "renamed",
      description: "with body",
    })
    const row =
      client.getQueryData<VersionListData>(LIST_KEY)!.pages[0]!.versions[0]!
    expect(row.name).toBe("renamed")
    expect(row.description).toBe("with body")
  })

  it("VERSION_CREATED invalidates the list when the row is unknown", () => {
    const client = createTestQueryClient()
    client.setQueryData(LIST_KEY, seed([summary("existing")]))
    const invalidate = vi.spyOn(client, "invalidateQueries")
    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_CREATED",
      versionId: "brand-new",
      createdAt: "2026-04-30T10:00:00Z",
      name: "remote-save",
      kind: "auto",
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LIST_KEY })
  })

  it("VERSION_CREATED dedupes when the row already exists (sender's own commit)", () => {
    const client = createTestQueryClient()
    client.setQueryData(LIST_KEY, seed([summary("a")]))
    const invalidate = vi.spyOn(client, "invalidateQueries")
    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_CREATED",
      versionId: "a",
      createdAt: "2026-04-29T12:00:00Z",
      name: "a",
      kind: "user",
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("VERSION_RESTORED invalidates the list (new auto-snapshot row)", () => {
    const client = createTestQueryClient()
    const invalidate = vi.spyOn(client, "invalidateQueries")
    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_RESTORED",
      headRev: 5,
      updatedAt: "2026-05-08T12:00:00Z",
      autoSnapshotVersionId: "auto-snap-1",
      restoredFromVersionId: "v3",
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LIST_KEY })
  })

  it("unknown control event types are no-ops (forward-compat)", () => {
    const client = createTestQueryClient()
    client.setQueryData(LIST_KEY, seed([summary("a")]))
    const unknown = {
      type: "VERSION_FROM_THE_FUTURE",
      something: "else",
    } as unknown as ControlEvent
    expect(() =>
      applyControlEventToCache(client, DIAGRAM_ID, unknown)
    ).not.toThrow()
    expect(cachedIds(client)).toEqual(["a"])
  })

  it("events against an empty cache are safe no-ops", () => {
    const client = createTestQueryClient()
    expect(() =>
      applyControlEventToCache(client, DIAGRAM_ID, {
        type: "VERSION_DELETED",
        versionId: "ghost",
      })
    ).not.toThrow()
    expect(client.getQueryData(LIST_KEY)).toBeUndefined()
  })
})
