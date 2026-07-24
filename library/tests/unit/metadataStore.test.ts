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
})
