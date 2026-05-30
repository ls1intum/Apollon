import { describe, it, expect, beforeEach } from "vitest"
import * as Y from "yjs"
import { createMetadataStore } from "@/store/metadataStore"

describe("metadataStore connection guidance lifecycle", () => {
  let store: ReturnType<typeof createMetadataStore>

  beforeEach(() => {
    store = createMetadataStore(new Y.Doc())
  })

  it("starts inactive with all guidance fields null", () => {
    const state = store.getState()
    expect(state.connectionGuidanceActive).toBe(false)
    expect(state.connectionGuidanceSourceNodeId).toBeNull()
    expect(state.connectionGuidanceSourceHandleId).toBeNull()
    expect(state.connectionGuidanceTargetNodeId).toBeNull()
    expect(state.connectionGuidanceTargetHandleId).toBeNull()
  })

  it("startConnectionGuidance sets source and clears target", () => {
    // Pre-pollute target fields to confirm start clears them.
    store.setState({
      connectionGuidanceTargetNodeId: "stale-node",
      connectionGuidanceTargetHandleId: "stale-handle",
    })

    store.getState().startConnectionGuidance("node-1", "handle-1")

    const state = store.getState()
    expect(state.connectionGuidanceActive).toBe(true)
    expect(state.connectionGuidanceSourceNodeId).toBe("node-1")
    expect(state.connectionGuidanceSourceHandleId).toBe("handle-1")
    expect(state.connectionGuidanceTargetNodeId).toBeNull()
    expect(state.connectionGuidanceTargetHandleId).toBeNull()
  })

  it("setConnectionGuidanceTarget updates only target fields", () => {
    store.getState().startConnectionGuidance("node-1", "handle-1")
    store.getState().setConnectionGuidanceTarget("node-2", "handle-2")

    const state = store.getState()
    expect(state.connectionGuidanceActive).toBe(true)
    expect(state.connectionGuidanceSourceNodeId).toBe("node-1")
    expect(state.connectionGuidanceSourceHandleId).toBe("handle-1")
    expect(state.connectionGuidanceTargetNodeId).toBe("node-2")
    expect(state.connectionGuidanceTargetHandleId).toBe("handle-2")
  })

  it("setConnectionGuidanceTarget(null, null) clears target without ending guidance", () => {
    store.getState().startConnectionGuidance("node-1", "handle-1")
    store.getState().setConnectionGuidanceTarget("node-2", "handle-2")
    store.getState().setConnectionGuidanceTarget(null, null)

    const state = store.getState()
    expect(state.connectionGuidanceActive).toBe(true)
    expect(state.connectionGuidanceTargetNodeId).toBeNull()
    expect(state.connectionGuidanceTargetHandleId).toBeNull()
    // Source survives.
    expect(state.connectionGuidanceSourceNodeId).toBe("node-1")
  })

  it("stopConnectionGuidance clears every guidance field", () => {
    store.getState().startConnectionGuidance("node-1", "handle-1")
    store.getState().setConnectionGuidanceTarget("node-2", "handle-2")
    store.getState().stopConnectionGuidance()

    const state = store.getState()
    expect(state.connectionGuidanceActive).toBe(false)
    expect(state.connectionGuidanceSourceNodeId).toBeNull()
    expect(state.connectionGuidanceSourceHandleId).toBeNull()
    expect(state.connectionGuidanceTargetNodeId).toBeNull()
    expect(state.connectionGuidanceTargetHandleId).toBeNull()
  })

  it("accepts null source identifiers (free-form drag from empty space)", () => {
    store.getState().startConnectionGuidance(null, null)

    const state = store.getState()
    expect(state.connectionGuidanceActive).toBe(true)
    expect(state.connectionGuidanceSourceNodeId).toBeNull()
    expect(state.connectionGuidanceSourceHandleId).toBeNull()
  })
})
