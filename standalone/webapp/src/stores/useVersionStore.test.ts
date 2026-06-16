import { afterEach, describe, expect, it, vi } from "vitest"
import type { ControlEvent, VersionSummary } from "@/types"
import { VersionApiClient } from "@/services/DiagramApiClient"
import type { UMLModel } from "@tumaet/apollon/react"
import {
  useVersionStore,
  selectVersions,
  selectScopedPreview,
} from "./useVersionStore"

const fakeModel: UMLModel = {
  version: "4.0.0",
  id: "d1",
  title: "",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

function summary(
  id: string,
  overrides: Partial<VersionSummary> = {}
): VersionSummary {
  return {
    id,
    diagramId: "d1",
    name: id,
    description: "",
    createdAt: "2026-04-29T12:00:00Z",
    kind: "user",
    librarySchemaVersion: "4.0.0",
    ...overrides,
  }
}

function reset() {
  useVersionStore.setState({
    drawerOpenByDiagram: {},
    versions: {},
    nextCursor: {},
    totals: {},
    preview: null,
    undoRestore: null,
    pendingRestoreFromId: null,
    loading: {},
    error: {},
  })
}

afterEach(() => reset())

describe("useVersionStore.applyControlEvent", () => {
  it("VERSION_DELETED removes the row", () => {
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: [summary("a"), summary("b")] },
    }))
    const event: ControlEvent = { type: "VERSION_DELETED", versionId: "a" }
    useVersionStore.getState().applyControlEvent("d1", event)
    expect(useVersionStore.getState().versions.d1!.map((v) => v.id)).toEqual([
      "b",
    ])
  })

  it("VERSION_RENAMED updates name + description in place", () => {
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: [summary("a", { name: "old" })] },
    }))
    const event: ControlEvent = {
      type: "VERSION_RENAMED",
      versionId: "a",
      name: "renamed",
      description: "with body",
    }
    useVersionStore.getState().applyControlEvent("d1", event)
    const updated = useVersionStore.getState().versions.d1![0]!
    expect(updated.name).toBe("renamed")
    expect(updated.description).toBe("with body")
  })

  it("VERSION_CREATED dedupes when the row already exists (sender's optimistic insert)", () => {
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: [summary("a")] },
    }))
    const event: ControlEvent = {
      type: "VERSION_CREATED",
      versionId: "a",
      createdAt: "2026-04-29T12:00:00Z",
      name: "from-network",
      kind: "user",
    }
    useVersionStore.getState().applyControlEvent("d1", event)
    expect(useVersionStore.getState().versions.d1).toHaveLength(1)
  })

  it("unknown control event types are no-ops (forward-compat)", () => {
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: [summary("a")] },
    }))
    const unknown = {
      type: "VERSION_FROM_THE_FUTURE",
      something: "else",
    } as unknown as ControlEvent
    useVersionStore.getState().applyControlEvent("d1", unknown)
    expect(useVersionStore.getState().versions.d1).toHaveLength(1)
  })
})

describe("useVersionStore.preview", () => {
  it("exitPreview clears state", () => {
    useVersionStore.setState({
      preview: {
        diagramId: "d1",
        versionId: "v1",
        body: { id: "d1" } as never,
      },
    })
    useVersionStore.getState().exitPreview()
    expect(useVersionStore.getState().preview).toBeNull()
  })
})

describe("useVersionStore.drawer", () => {
  it("openDrawer/closeDrawer scope to the diagramId", () => {
    useVersionStore.getState().openDrawer("d1")
    expect(useVersionStore.getState().drawerOpenByDiagram["d1"]).toBe(true)
    expect(useVersionStore.getState().drawerOpenByDiagram["d2"]).toBeUndefined()
    useVersionStore.getState().closeDrawer("d1")
    expect(useVersionStore.getState().drawerOpenByDiagram["d1"]).toBe(false)
  })
})

describe("useVersionStore.applyControlEvent — VERSION_CREATED insertion path", () => {
  it("triggers fetchVersions when the version is NOT already in the list", () => {
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: [summary("existing")] },
    }))

    // Spy on fetchVersions to verify it's called (the actual fetch would
    // hit the network; we just confirm the code path is entered).
    const fetchSpy = vi.spyOn(useVersionStore.getState(), "fetchVersions")
    fetchSpy.mockResolvedValue(undefined)

    const event: ControlEvent = {
      type: "VERSION_CREATED",
      versionId: "brand-new",
      createdAt: "2026-04-30T10:00:00Z",
      name: "remote-save",
      kind: "auto",
    }
    useVersionStore.getState().applyControlEvent("d1", event)

    expect(fetchSpy).toHaveBeenCalledWith("d1")
    // The existing list is untouched until fetchVersions resolves
    expect(useVersionStore.getState().versions.d1).toHaveLength(1)
    expect(useVersionStore.getState().versions.d1![0]!.id).toBe("existing")

    fetchSpy.mockRestore()
  })

  it("does NOT trigger fetchVersions when the version already exists (dedup)", () => {
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: [summary("a")] },
    }))

    const fetchSpy = vi.spyOn(useVersionStore.getState(), "fetchVersions")
    fetchSpy.mockResolvedValue(undefined)

    const event: ControlEvent = {
      type: "VERSION_CREATED",
      versionId: "a",
      createdAt: "2026-04-29T12:00:00Z",
      name: "a",
      kind: "user",
    }
    useVersionStore.getState().applyControlEvent("d1", event)

    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it("handles VERSION_CREATED when the diagram has no versions yet (empty list)", () => {
    // No versions set for d1 — the `get().versions[diagramId] ?? []` path
    useVersionStore.setState((s) => ({
      versions: { ...s.versions },
    }))

    const fetchSpy = vi.spyOn(useVersionStore.getState(), "fetchVersions")
    fetchSpy.mockResolvedValue(undefined)

    const event: ControlEvent = {
      type: "VERSION_CREATED",
      versionId: "first-ever",
      createdAt: "2026-04-30T10:00:00Z",
      name: "",
      kind: "auto",
    }
    useVersionStore.getState().applyControlEvent("d1", event)

    expect(fetchSpy).toHaveBeenCalledWith("d1")

    fetchSpy.mockRestore()
  })
})

describe("useVersionStore.applyControlEvent — VERSION_DELETED edge cases", () => {
  it("VERSION_DELETED on a non-existent id is a safe no-op", () => {
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: [summary("a"), summary("b")] },
    }))
    const event: ControlEvent = {
      type: "VERSION_DELETED",
      versionId: "does-not-exist",
    }
    useVersionStore.getState().applyControlEvent("d1", event)
    expect(useVersionStore.getState().versions.d1).toHaveLength(2)
  })

  it("VERSION_DELETED on a diagram with no local versions does not crash", () => {
    // d1 has no entry in versions at all
    const event: ControlEvent = {
      type: "VERSION_DELETED",
      versionId: "ghost",
    }
    // Should not throw
    useVersionStore.getState().applyControlEvent("d1", event)
    expect(useVersionStore.getState().versions.d1).toEqual([])
  })
})

describe("useVersionStore.applyControlEvent — VERSION_RENAMED edge cases", () => {
  it("VERSION_RENAMED for a non-existent id leaves the list unchanged", () => {
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: [summary("a", { name: "original" })] },
    }))
    const event: ControlEvent = {
      type: "VERSION_RENAMED",
      versionId: "missing",
      name: "new-name",
      description: "new-desc",
    }
    useVersionStore.getState().applyControlEvent("d1", event)
    const v = useVersionStore.getState().versions.d1![0]!
    expect(v.name).toBe("original")
  })
})

describe("selectVersions", () => {
  it("returns a referentially stable empty array for unknown diagrams", () => {
    const state = useVersionStore.getState()
    const a = selectVersions(state, "nonexistent-1")
    const b = selectVersions(state, "nonexistent-2")
    // Both should be the exact same frozen object reference — this prevents
    // useSyncExternalStore from re-rendering on every selector call.
    expect(a).toBe(b)
    expect(Object.isFrozen(a)).toBe(true)
  })

  it("returns the actual version list for a known diagram", () => {
    const versions = [summary("v1")]
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: versions },
    }))
    const result = selectVersions(useVersionStore.getState(), "d1")
    expect(result).toBe(versions)
  })
})

describe("selectScopedPreview", () => {
  it("returns the preview only for its own diagram, else null", () => {
    useVersionStore.setState({
      preview: { diagramId: "a", versionId: "v1", body: { id: "a" } as never },
    })
    const state = useVersionStore.getState()
    expect(selectScopedPreview(state, "a")).toBe(state.preview)
    expect(selectScopedPreview(state, "b")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Self-notification suppression
// ---------------------------------------------------------------------------

describe("self-notification suppression via pendingRestoreFromId", () => {
  it("pendingRestoreFromId detects local restore before HTTP response", () => {
    useVersionStore.setState({ pendingRestoreFromId: "v42" })
    const state = useVersionStore.getState()
    expect(state.pendingRestoreFromId).toBe("v42")
    // The control event handler checks this to suppress self-notification.
    // Simulate the check:
    const eventVersionId = "v42"
    const isLocal =
      state.pendingRestoreFromId === eventVersionId ||
      state.undoRestore?.restoredFromVersionId === eventVersionId
    expect(isLocal).toBe(true)
  })

  it("undoRestore.restoredFromVersionId detects local restore after HTTP response", () => {
    useVersionStore.setState({
      pendingRestoreFromId: null,
      undoRestore: {
        diagramId: "d1",
        autoSnapshotVersionId: "auto-snap",
        restoredFromVersionId: "v42",
        restoredVersionName: "test",
        expiresAt: Date.now() + 10_000,
      },
    })
    const state = useVersionStore.getState()
    const isLocal =
      state.pendingRestoreFromId === "v42" ||
      state.undoRestore?.restoredFromVersionId === "v42"
    expect(isLocal).toBe(true)
  })

  it("neither field matches for a collaborator restore", () => {
    useVersionStore.setState({
      pendingRestoreFromId: null,
      undoRestore: null,
    })
    const state = useVersionStore.getState()
    const isLocal =
      state.pendingRestoreFromId === "v99" ||
      state.undoRestore?.restoredFromVersionId === "v99"
    expect(isLocal).toBe(false)
  })

  it("local restore with different version still detects collaborator restore", () => {
    // User restored v10 locally, but a collaborator restores v20
    useVersionStore.setState({
      pendingRestoreFromId: "v10",
      undoRestore: {
        diagramId: "d1",
        autoSnapshotVersionId: "auto-snap",
        restoredFromVersionId: "v10",
        restoredVersionName: "my restore",
        expiresAt: Date.now() + 10_000,
      },
    })
    const state = useVersionStore.getState()
    const isLocalForV20 =
      state.pendingRestoreFromId === "v20" ||
      state.undoRestore?.restoredFromVersionId === "v20"
    expect(isLocalForV20).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// restoredVersionName fallback chain
// ---------------------------------------------------------------------------

describe("restoredVersionName derivation", () => {
  function deriveRestoredVersionName(
    version: Partial<VersionSummary> | undefined
  ): string {
    return (
      version?.description?.trim() ||
      version?.name?.trim() ||
      (version?.seq !== undefined ? `#${version.seq}` : "")
    )
  }

  it("prefers description when present", () => {
    expect(
      deriveRestoredVersionName({
        description: "important checkpoint",
        name: "v1",
        seq: 3,
      })
    ).toBe("important checkpoint")
  })

  it("falls back to name when description is empty", () => {
    expect(
      deriveRestoredVersionName({ description: "", name: "milestone", seq: 5 })
    ).toBe("milestone")
  })

  it("falls back to #seq when name and description are empty", () => {
    expect(
      deriveRestoredVersionName({ description: "", name: "", seq: 7 })
    ).toBe("#7")
  })

  it("returns empty string when nothing is available", () => {
    expect(deriveRestoredVersionName({ description: "", name: "" })).toBe("")
  })

  it("returns empty string for undefined version", () => {
    expect(deriveRestoredVersionName(undefined)).toBe("")
  })

  it("trims whitespace-only description", () => {
    expect(
      deriveRestoredVersionName({
        description: "   ",
        name: "",
        seq: 2,
      })
    ).toBe("#2")
  })

  it("trims whitespace-only name", () => {
    expect(
      deriveRestoredVersionName({
        description: "",
        name: "   ",
        seq: 4,
      })
    ).toBe("#4")
  })
})

// ---------------------------------------------------------------------------
// VERSION_RESTORED control event handling
// ---------------------------------------------------------------------------

describe("useVersionStore.applyControlEvent — VERSION_RESTORED", () => {
  it("triggers fetchVersions to pick up auto-snapshot row", () => {
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: [summary("a")] },
    }))
    const fetchSpy = vi.spyOn(useVersionStore.getState(), "fetchVersions")
    fetchSpy.mockResolvedValue(undefined)

    const event: ControlEvent = {
      type: "VERSION_RESTORED",
      headRev: 5,
      updatedAt: "2026-05-08T12:00:00Z",
      autoSnapshotVersionId: "auto-snap-1",
      restoredFromVersionId: "v3",
    }
    useVersionStore.getState().applyControlEvent("d1", event)
    expect(fetchSpy).toHaveBeenCalledWith("d1")
    fetchSpy.mockRestore()
  })

  it("actor field is optional and passed through on VERSION_RESTORED", () => {
    const withActor: ControlEvent = {
      type: "VERSION_RESTORED",
      headRev: 5,
      updatedAt: "2026-05-08T12:00:00Z",
      autoSnapshotVersionId: "auto-snap-1",
      restoredFromVersionId: "v3",
      actor: "Alice",
    }
    expect(withActor.actor).toBe("Alice")

    const withoutActor: ControlEvent = {
      type: "VERSION_RESTORED",
      headRev: 5,
      updatedAt: "2026-05-08T12:00:00Z",
      autoSnapshotVersionId: "auto-snap-1",
      restoredFromVersionId: "v3",
    }
    expect(withoutActor.actor).toBeUndefined()
  })

  it("actor field is optional on VERSION_CREATED", () => {
    const withActor: ControlEvent = {
      type: "VERSION_CREATED",
      versionId: "v1",
      createdAt: "2026-05-08T12:00:00Z",
      name: "test",
      kind: "user",
      actor: "Bob",
    }
    expect(withActor.actor).toBe("Bob")

    const withoutActor: ControlEvent = {
      type: "VERSION_CREATED",
      versionId: "v1",
      createdAt: "2026-05-08T12:00:00Z",
      name: "test",
      kind: "user",
    }
    expect(withoutActor.actor).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Optimistic UI rollback fidelity. Every action that mutates local state
// before the server confirms must restore the prior state on failure —
// otherwise a flaky network leaves the UI in a state that doesn't match
// what the server believes.
// ---------------------------------------------------------------------------

describe("optimistic rollback on action failure", () => {
  it("createVersion: failed POST flips the optimistic row to failed:true (preserves tempId)", async () => {
    const spy = vi
      .spyOn(VersionApiClient, "create")
      .mockRejectedValueOnce(new Error("network"))

    await expect(
      useVersionStore.getState().createVersion("d1", fakeModel, {})
    ).rejects.toThrow(/network/)

    const list = useVersionStore.getState().versions.d1 ?? []
    expect(list).toHaveLength(1)
    const row = list[0]!
    expect(row.failed).toBe(true)
    expect(row.pending).toBeUndefined()
    expect(row.id).toMatch(/^pending-/)
    spy.mockRestore()
  })

  it("editVersionInfo: failed PATCH restores the prior name + description", async () => {
    useVersionStore.setState((s) => ({
      versions: {
        ...s.versions,
        d1: [
          summary("v1", { name: "before", description: "before-desc" }),
          summary("v2"),
        ],
      },
    }))
    const spy = vi
      .spyOn(VersionApiClient, "editInfo")
      .mockRejectedValueOnce(new Error("forbidden"))

    await expect(
      useVersionStore.getState().editVersionInfo("d1", "v1", {
        name: "after",
        description: "after-desc",
      })
    ).rejects.toThrow(/forbidden/)

    const restored = useVersionStore
      .getState()
      .versions.d1!.find((v) => v.id === "v1")!
    expect(restored.name).toBe("before")
    expect(restored.description).toBe("before-desc")
    spy.mockRestore()
  })

  it("deleteVersion: failed DELETE reinserts the row at its original index", async () => {
    const original = [summary("a"), summary("b"), summary("c")]
    useVersionStore.setState((s) => ({
      versions: { ...s.versions, d1: original },
      totals: { ...s.totals, d1: 3 },
    }))
    const spy = vi
      .spyOn(VersionApiClient, "delete")
      .mockRejectedValueOnce(new Error("conflict"))

    await expect(
      useVersionStore.getState().deleteVersion("d1", "b")
    ).rejects.toThrow(/conflict/)

    const ids = useVersionStore.getState().versions.d1!.map((v) => v.id)
    expect(ids).toEqual(["a", "b", "c"])
    spy.mockRestore()
  })
})
