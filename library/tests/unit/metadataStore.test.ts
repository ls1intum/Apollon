import { describe, it, expect, beforeEach } from "vitest"
import * as Y from "yjs"
import { createMetadataStore } from "@/store/metadataStore"

describe("metadataStore connection guidance lifecycle", () => {
  let store: ReturnType<typeof createMetadataStore>

  beforeEach(() => {
    store = createMetadataStore(new Y.Doc())
  })

  it("startConnectionGuidance activates and records the source handle", () => {
    store.getState().startConnectionGuidance("node-1", "handle-1")

    const state = store.getState()
    expect(state.connectionGuidanceActive).toBe(true)
    expect(state.connectionGuidanceSourceNodeId).toBe("node-1")
    expect(state.connectionGuidanceSourceHandleId).toBe("handle-1")
  })

  it("accepts a null source (free-form drag from empty space)", () => {
    store.getState().startConnectionGuidance(null, null)

    const state = store.getState()
    expect(state.connectionGuidanceActive).toBe(true)
    expect(state.connectionGuidanceSourceNodeId).toBeNull()
  })

  it("stopConnectionGuidance clears the guidance state", () => {
    store.getState().startConnectionGuidance("node-1", "handle-1")
    store.getState().stopConnectionGuidance()

    const state = store.getState()
    expect(state.connectionGuidanceActive).toBe(false)
    expect(state.connectionGuidanceSourceNodeId).toBeNull()
    expect(state.connectionGuidanceSourceHandleId).toBeNull()
  })

  it("reconnect preview records the edge/handle and a defensive copy of the base points", () => {
    const basePoints = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]
    store.getState().startReconnectPreview("edge-1", "target", basePoints)

    const started = store.getState()
    expect(started.reconnectPreviewEdgeId).toBe("edge-1")
    expect(started.reconnectPreviewHandleType).toBe("target")
    expect(started.reconnectPreviewBasePoints).toEqual(basePoints)
    // Stored points must not alias the caller's array.
    expect(started.reconnectPreviewBasePoints).not.toBe(basePoints)

    store.getState().stopReconnectPreview()
    const stopped = store.getState()
    expect(stopped.reconnectPreviewEdgeId).toBeNull()
    expect(stopped.reconnectPreviewBasePoints).toEqual([])
  })
})
