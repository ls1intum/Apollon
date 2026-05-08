import { afterEach, describe, expect, it, vi } from "vitest"
import type { ControlEvent, VersionSummary } from "@/types"
import { useVersionStore, selectVersions } from "./useVersionStore"

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
