import { afterEach, describe, expect, it } from "vitest"
import type { UMLModel } from "@tumaet/apollon"
import {
  useVersionStore,
  selectScopedPreview,
  UNDO_WINDOW_MS,
} from "./useVersionStore"

const body = { id: "d1", nodes: [], edges: [] } as unknown as UMLModel

afterEach(() =>
  useVersionStore.setState({
    drawerOpenByDiagram: {},
    saveRequestByDiagram: {},
    preview: null,
    undoRestore: null,
    pendingRestoreFromId: null,
  })
)

describe("useVersionStore.drawer", () => {
  it("openDrawer/closeDrawer scope to the diagramId", () => {
    useVersionStore.getState().openDrawer("d1")
    expect(useVersionStore.getState().drawerOpenByDiagram["d1"]).toBe(true)
    expect(useVersionStore.getState().drawerOpenByDiagram["d2"]).toBeUndefined()
    useVersionStore.getState().closeDrawer("d1")
    expect(useVersionStore.getState().drawerOpenByDiagram["d1"]).toBe(false)
  })

  it("requestSave opens the drawer and bumps the per-diagram nonce", () => {
    // The nonce must advance on each press so the mounted panel can tell one
    // save request from the next; clearSaveRequest consumes it.
    const { requestSave, clearSaveRequest } = useVersionStore.getState()

    requestSave("d1")
    expect(useVersionStore.getState().drawerOpenByDiagram["d1"]).toBe(true)
    expect(useVersionStore.getState().saveRequestByDiagram["d1"]).toBe(1)

    requestSave("d1")
    expect(useVersionStore.getState().saveRequestByDiagram["d1"]).toBe(2)
    expect(
      useVersionStore.getState().saveRequestByDiagram["d2"]
    ).toBeUndefined()

    clearSaveRequest("d1")
    expect(useVersionStore.getState().saveRequestByDiagram["d1"]).toBe(0)
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

describe("completeRestore", () => {
  it("clears the preview and the in-flight flag, and opens the undo window", () => {
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
    expect(state.undoRestore?.expiresAt).toBeGreaterThanOrEqual(
      before + UNDO_WINDOW_MS
    )
  })
})
