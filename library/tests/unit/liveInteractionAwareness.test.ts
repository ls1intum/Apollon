import { describe, it, expect, beforeEach } from "vitest"
import * as Y from "yjs"
import { YjsSync } from "@/sync/yjsSync"
import { createDiagramStore } from "@/store/diagramStore"
import { createMetadataStore } from "@/store/metadataStore"
import { LiveInteraction } from "@/typings"

// `liveInteraction` is a peer-supplied awareness field that drives the live
// ghost overlay's positioning/sizing. These asserts target the trust boundary:
// a well-formed interaction round-trips through `setLocalAwarenessLiveInteraction`
// + `narrowState`, and a malformed one is dropped to `null` so it can never
// reach the overlay (rather than passing through untouched, the old behavior).
const buildSync = () => {
  const ydoc = new Y.Doc()
  const diagramStore = createDiagramStore(ydoc)
  const metadataStore = createMetadataStore(ydoc)
  return new YjsSync(ydoc, diagramStore, metadataStore)
}

describe("setLocalAwarenessLiveInteraction + narrowState", () => {
  let sync: YjsSync

  beforeEach(() => {
    sync = buildSync()
  })

  const localState = () =>
    sync.getAwarenessStates().get(sync.getLocalAwarenessClientId())

  it("never writes the interaction into the persisted Yjs doc", () => {
    // The ghost overlay is ephemeral presence — it must live in awareness only,
    // never in a Y.Map, or it would balloon the persisted doc (the freeze) and
    // leak into peers' saved state. Pin it: the encoded doc is byte-identical
    // before and after publishing an interaction.
    const ydoc = (sync as unknown as { ydoc: Y.Doc }).ydoc
    const before = Y.encodeStateAsUpdate(ydoc)
    sync.setLocalAwarenessLiveInteraction({
      id: "node-1",
      position: { x: 12.5, y: -40 },
      width: 200,
      height: 80,
    })
    const after = Y.encodeStateAsUpdate(ydoc)
    expect(after).toEqual(before)
  })

  it("round-trips a well-formed interaction with width/height", () => {
    const interaction: LiveInteraction = {
      id: "node-1",
      position: { x: 12.5, y: -40 },
      width: 200,
      height: 80,
    }

    sync.setLocalAwarenessLiveInteraction(interaction)

    expect(localState()?.liveInteraction).toEqual(interaction)
  })

  it("clears the field when set to null", () => {
    sync.setLocalAwarenessLiveInteraction({
      id: "node-1",
      position: { x: 1, y: 2 },
    })
    sync.setLocalAwarenessLiveInteraction(null)

    expect(localState()?.liveInteraction).toBeNull()
  })

  it("drops a malformed interaction missing a valid position", () => {
    // Inject raw, unvalidated state the way a malicious/buggy peer would —
    // bypassing the typed setter — and confirm the narrowState chokepoint
    // strips it. Without narrowLiveInteraction this would pass through as-is.
    const awareness = (
      sync as unknown as {
        awareness: { setLocalStateField: (k: string, v: unknown) => void }
      }
    ).awareness
    awareness.setLocalStateField("liveInteraction", {
      id: "node-1",
      position: { x: "nope", y: 2 },
    })

    expect(localState()?.liveInteraction).toBeNull()
  })

  it("drops a malformed interaction with a non-string id", () => {
    const awareness = (
      sync as unknown as {
        awareness: { setLocalStateField: (k: string, v: unknown) => void }
      }
    ).awareness
    awareness.setLocalStateField("liveInteraction", {
      id: 42,
      position: { x: 1, y: 2 },
    })

    expect(localState()?.liveInteraction).toBeNull()
  })

  it("rejects NaN/Infinity coordinates", () => {
    const awareness = (
      sync as unknown as {
        awareness: { setLocalStateField: (k: string, v: unknown) => void }
      }
    ).awareness
    awareness.setLocalStateField("liveInteraction", {
      id: "node-1",
      position: { x: NaN, y: Infinity },
    })

    expect(localState()?.liveInteraction).toBeNull()
  })

  it("strips a non-numeric width/height but keeps a valid position", () => {
    const awareness = (
      sync as unknown as {
        awareness: { setLocalStateField: (k: string, v: unknown) => void }
      }
    ).awareness
    awareness.setLocalStateField("liveInteraction", {
      id: "node-1",
      position: { x: 5, y: 6 },
      width: "wide",
      height: 80,
    })

    expect(localState()?.liveInteraction).toEqual({
      id: "node-1",
      position: { x: 5, y: 6 },
      height: 80,
    })
  })
})
