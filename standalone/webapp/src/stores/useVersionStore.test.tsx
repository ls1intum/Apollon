import { afterEach, describe, expect, it } from "vitest"
import type { ControlEvent, VersionSummary } from "@/types"
import { useVersionStore } from "./useVersionStore"

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
    preview: null,
    undoRestore: null,
    loading: false,
    error: null,
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
    expect(useVersionStore.getState().isDrawerOpen("d1")).toBe(true)
    expect(useVersionStore.getState().isDrawerOpen("d2")).toBe(false)
    useVersionStore.getState().closeDrawer("d1")
    expect(useVersionStore.getState().isDrawerOpen("d1")).toBe(false)
  })
})
