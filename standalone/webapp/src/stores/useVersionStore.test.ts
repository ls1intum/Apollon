import { afterEach, describe, expect, it } from "vitest"
import type { UMLModel } from "@tumaet/apollon"
import {
  useVersionStore,
  selectScopedPreview,
  UNDO_WINDOW_MS,
} from "./useVersionStore"

const body = { id: "d1", nodes: [], edges: [] } as unknown as UMLModel

function reset() {
  useVersionStore.setState({
    drawerOpenByDiagram: {},
    preview: null,
    undoRestore: null,
    pendingRestoreFromId: null,
  })
}

afterEach(() => reset())

describe("useVersionStore.drawer", () => {
  it("openDrawer/closeDrawer scope to the diagramId", () => {
    useVersionStore.getState().openDrawer("d1")
    expect(useVersionStore.getState().drawerOpenByDiagram["d1"]).toBe(true)
    expect(useVersionStore.getState().drawerOpenByDiagram["d2"]).toBeUndefined()
    useVersionStore.getState().closeDrawer("d1")
    expect(useVersionStore.getState().drawerOpenByDiagram["d1"]).toBe(false)
  })
})

describe("useVersionStore.preview", () => {
  it("enterPreview stores the caller-fetched body; exitPreview clears it", () => {
    useVersionStore.getState().enterPreview("d1", "v1", body)
    expect(useVersionStore.getState().preview).toEqual({
      diagramId: "d1",
      versionId: "v1",
      body,
    })
    useVersionStore.getState().exitPreview()
    expect(useVersionStore.getState().preview).toBeNull()
  })
})

describe("selectScopedPreview", () => {
  it("returns the preview only for its own diagram, else null", () => {
    useVersionStore.getState().enterPreview("a", "v1", body)
    const state = useVersionStore.getState()
    expect(selectScopedPreview(state, "a")).toBe(state.preview)
    expect(selectScopedPreview(state, "b")).toBeNull()
  })
})

describe("restore bookkeeping", () => {
  it("beginRestore raises the pending flag; cancelRestore clears it", () => {
    useVersionStore.getState().beginRestore("v42")
    expect(useVersionStore.getState().pendingRestoreFromId).toBe("v42")
    useVersionStore.getState().cancelRestore()
    expect(useVersionStore.getState().pendingRestoreFromId).toBeNull()
  })

  it("completeRestore clears preview + pending flag and opens the undo window", () => {
    useVersionStore.getState().enterPreview("d1", "v42", body)
    useVersionStore.getState().beginRestore("v42")
    const before = Date.now()
    useVersionStore.getState().completeRestore({
      diagramId: "d1",
      autoSnapshotVersionId: "auto-1",
      restoredFromVersionId: "v42",
      restoredVersionName: "Milestone",
    })
    const state = useVersionStore.getState()
    expect(state.preview).toBeNull()
    expect(state.pendingRestoreFromId).toBeNull()
    expect(state.undoRestore).toMatchObject({
      diagramId: "d1",
      autoSnapshotVersionId: "auto-1",
      restoredFromVersionId: "v42",
      restoredVersionName: "Milestone",
    })
    expect(state.undoRestore!.expiresAt).toBeGreaterThanOrEqual(
      before + UNDO_WINDOW_MS
    )
    useVersionStore.getState().dismissUndoRestore()
    expect(useVersionStore.getState().undoRestore).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Self-notification suppression: the WS VERSION_RESTORED handler classifies an
// event as self-caused when either the in-flight flag (WS beat the HTTP
// response) or the completed undo window references the restored version.
// ---------------------------------------------------------------------------

describe("self-notification suppression via pendingRestoreFromId", () => {
  function isLocalRestore(eventVersionId: string): boolean {
    const state = useVersionStore.getState()
    return (
      state.pendingRestoreFromId === eventVersionId ||
      state.undoRestore?.restoredFromVersionId === eventVersionId
    )
  }

  it("pendingRestoreFromId detects local restore before the HTTP response", () => {
    useVersionStore.getState().beginRestore("v42")
    expect(isLocalRestore("v42")).toBe(true)
  })

  it("undoRestore.restoredFromVersionId detects local restore after the HTTP response", () => {
    useVersionStore.getState().completeRestore({
      diagramId: "d1",
      autoSnapshotVersionId: "auto-snap",
      restoredFromVersionId: "v42",
      restoredVersionName: "test",
    })
    expect(isLocalRestore("v42")).toBe(true)
  })

  it("neither field matches for a collaborator restore", () => {
    expect(isLocalRestore("v99")).toBe(false)
  })

  it("local restore of a different version still detects a collaborator restore", () => {
    useVersionStore.getState().beginRestore("v10")
    useVersionStore.getState().completeRestore({
      diagramId: "d1",
      autoSnapshotVersionId: "auto-snap",
      restoredFromVersionId: "v10",
      restoredVersionName: "my restore",
    })
    expect(isLocalRestore("v20")).toBe(false)
  })
})
