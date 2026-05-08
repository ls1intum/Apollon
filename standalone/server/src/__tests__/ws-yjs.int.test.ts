// @vitest-environment jsdom
// The library bundle eagerly evaluates DOM-touching modules at import time.
// We're not exercising any React tree here — just the Yjs sync class —
// but we need a window/document to even *load* the bundle.
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import WebSocket from "ws"
import { createServer } from "node:net"
import * as Y from "yjs"
import {
  createHeadlessSync,
  MessageType,
  type YjsSyncClass,
} from "@tumaet/apollon"
import { startRelayServer } from "../ws"

// ---------------------------------------------------------------------------
// Helpers — set up real WebSocket peers driven by the library's actual
// `YjsSyncClass`. The relay-side wire format is exercised end-to-end so
// regressions in framing, handshake order, or broadcast filtering surface
// here rather than in production.
// ---------------------------------------------------------------------------

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.unref()
    srv.on("error", reject)
    srv.listen(0, () => {
      const port = (srv.address() as { port: number }).port
      srv.close(() => resolve(port))
    })
  })
}

interface Peer {
  ws: WebSocket
  ydoc: Y.Doc
  sync: YjsSyncClass
  /** Resolves when the WebSocket has sent the SYNC ping + state push. */
  ready: Promise<void>
  close: () => Promise<void>
}

async function connectPeer(
  port: number,
  diagramId: string,
  /** Reuse a pre-existing Y.Doc — the reconnect-with-offline-edits test
   *  needs the second peer to carry the first peer's offline mutations. */
  seedDoc?: Y.Doc
): Promise<Peer> {
  const { ydoc, sync } = createHeadlessSync(seedDoc)
  const ws = new WebSocket(
    `ws://127.0.0.1:${port}?diagramId=${encodeURIComponent(diagramId)}`
  )

  // Wire the broadcast callback with the same readyState gate the production
  // WebSocketManager uses; tests share that critical-path code shape so a
  // regression in either side surfaces consistently.
  sync.setSendBroadcastMessage((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ diagramData: data }))
    }
  })

  ws.on("message", (raw) => {
    const text =
      typeof raw === "string"
        ? raw
        : raw instanceof Buffer
          ? raw.toString("utf-8")
          : ""
    try {
      const parsed = JSON.parse(text) as { diagramData?: string }
      if (typeof parsed.diagramData === "string") {
        sync.handleReceivedData(parsed.diagramData)
      }
    } catch {
      // Best-effort; relay also forwards opaque test messages.
    }
  })

  const ready = new Promise<void>((resolve) => {
    ws.once("open", () => {
      // Mirror WebSocketManager.onopen: ask peers for state (YjsSYNC),
      // ask for awareness (AwarenessSync), then push our own state.
      ws.send(JSON.stringify({ diagramData: encodeFrame(MessageType.YjsSYNC) }))
      ws.send(
        JSON.stringify({
          diagramData: encodeFrame(MessageType.AwarenessSync),
        })
      )
      sync.broadcastFullState()
      resolve()
    })
  })

  return {
    ws,
    ydoc,
    sync,
    ready,
    close: () =>
      new Promise<void>((resolve) => {
        if (ws.readyState === WebSocket.CLOSED) return resolve()
        ws.once("close", () => resolve())
        ws.close()
      }),
  }
}

function encodeFrame(
  type: MessageType,
  payload: Uint8Array = new Uint8Array(0)
): string {
  const buf = new Uint8Array(1 + payload.length)
  buf[0] = type
  buf.set(payload, 1)
  return Buffer.from(buf).toString("base64")
}

/**
 * Apply a Yjs mutation through a transaction tagged `"store"` — production
 * code routes its writes through the Zustand store which uses that exact
 * origin tag, and `handleYjsUpdate` only rebroadcasts for that origin.
 * Bare `ydoc.getMap("…").set(…)` would create a transaction with `null`
 * origin and would NOT be broadcast — the test would silently never sync.
 */
function storeWrite(ydoc: Y.Doc, fn: () => void): void {
  ydoc.transact(fn, "store")
}

async function flushNetwork(): Promise<void> {
  // Two macrotask flushes — gives WS a chance to deliver, the relay to
  // forward, and the receiver's "message" handler to apply. Two ticks
  // covers the round-trip between two peers under singleFork.
  await new Promise((r) => setImmediate(r))
  await new Promise((r) => setImmediate(r))
}

async function waitFor(
  condition: () => boolean,
  timeoutMs = 3000,
  message = "condition never became true"
): Promise<void> {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor: ${message}`)
    }
    await new Promise((r) => setTimeout(r, 5))
  }
}

let port: number
let relay: ReturnType<typeof startRelayServer>

beforeEach(async () => {
  port = await getFreePort()
  relay = startRelayServer({ port, host: "127.0.0.1" })
})

afterEach(async () => {
  await relay.close()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Yjs collaboration — wire protocol", () => {
  it("two peers reach identical doc state after concurrent edits", async () => {
    const a = await connectPeer(port, "doc-1")
    const b = await connectPeer(port, "doc-1")
    await Promise.all([a.ready, b.ready])
    await flushNetwork()

    storeWrite(a.ydoc, () =>
      a.ydoc.getMap("nodes").set("n1", { id: "n1", label: "from A" })
    )
    storeWrite(b.ydoc, () =>
      b.ydoc.getMap("nodes").set("n2", { id: "n2", label: "from B" })
    )

    await waitFor(() => {
      const aNodes = a.ydoc.getMap("nodes")
      const bNodes = b.ydoc.getMap("nodes")
      return aNodes.size === 2 && bNodes.size === 2
    })

    expect(Array.from(a.ydoc.getMap("nodes").keys()).sort()).toEqual([
      "n1",
      "n2",
    ])
    expect(Array.from(b.ydoc.getMap("nodes").keys()).sort()).toEqual([
      "n1",
      "n2",
    ])
    await Promise.all([a.close(), b.close()])
  })

  it("late joiner receives existing room state via YjsSYNC", async () => {
    const a = await connectPeer(port, "doc-late")
    await a.ready
    storeWrite(a.ydoc, () => {
      a.ydoc.getMap("nodes").set("n1", { id: "n1" })
      a.ydoc.getMap("nodes").set("n2", { id: "n2" })
      a.ydoc.getMap("nodes").set("n3", { id: "n3" })
    })
    await flushNetwork()

    const b = await connectPeer(port, "doc-late")
    await b.ready

    await waitFor(() => b.ydoc.getMap("nodes").size === 3)
    expect(Array.from(b.ydoc.getMap("nodes").keys()).sort()).toEqual([
      "n1",
      "n2",
      "n3",
    ])
    await Promise.all([a.close(), b.close()])
  })

  it("REGRESSION: peer reconnect propagates offline edits to the room", async () => {
    // This is the exact scenario `broadcastFullState()` on (re)connect was
    // added to fix. With the old protocol (1-byte YjsSYNC ping only, no
    // state push from the asker), B's offline edits would be lost forever.
    const a = await connectPeer(port, "doc-reconnect")
    const b = await connectPeer(port, "doc-reconnect")
    await Promise.all([a.ready, b.ready])
    await flushNetwork()

    // B disconnects, then mutates while offline. The update event fires on
    // B's local ydoc but the broadcast callback drops it (readyState !== OPEN).
    await b.close()
    storeWrite(b.ydoc, () => {
      b.ydoc.getMap("nodes").set("offline-1", { id: "offline-1" })
      b.ydoc.getMap("nodes").set("offline-2", { id: "offline-2" })
    })

    // A second peer C reconnects via the same library path, carrying B's
    // offline-edited Y.Doc into the new socket.
    const bReconnected = await connectPeer(port, "doc-reconnect", b.ydoc)
    await bReconnected.ready
    await waitFor(() => a.ydoc.getMap("nodes").size === 2)

    expect(Array.from(a.ydoc.getMap("nodes").keys()).sort()).toEqual([
      "offline-1",
      "offline-2",
    ])
    await Promise.all([a.close(), bReconnected.close()])
  })

  it("does not echo a remote update back to the room", async () => {
    // Build A with a counted broadcast callback so we observe every frame
    // the sync class actually emits, separate from raw socket traffic.
    // We bucket by message type — only `YjsUpdate` echoes are the bug
    // we're guarding against; awareness chit-chat (sync request/response,
    // own awareness state announcement) is unrelated and unbounded.
    const { ydoc: aDoc, sync: aSync } = createHeadlessSync()
    const aWs = new WebSocket(
      `ws://127.0.0.1:${port}?diagramId=${encodeURIComponent("doc-echo")}`
    )
    let yjsUpdateOutbound = 0
    aSync.setSendBroadcastMessage((data) => {
      if (aWs.readyState !== WebSocket.OPEN) return
      const decoded = Buffer.from(data, "base64")
      if (decoded[0] === MessageType.YjsUpdate) yjsUpdateOutbound++
      aWs.send(JSON.stringify({ diagramData: data }))
    })
    aWs.on("message", (raw) => {
      const text =
        typeof raw === "string"
          ? raw
          : raw instanceof Buffer
            ? raw.toString("utf-8")
            : ""
      try {
        const parsed = JSON.parse(text) as { diagramData?: string }
        if (typeof parsed.diagramData === "string") {
          aSync.handleReceivedData(parsed.diagramData)
        }
      } catch {
        /* noop */
      }
    })
    await new Promise<void>((resolve) =>
      aWs.once("open", () => {
        aWs.send(
          JSON.stringify({ diagramData: encodeFrame(MessageType.YjsSYNC) })
        )
        aWs.send(
          JSON.stringify({
            diagramData: encodeFrame(MessageType.AwarenessSync),
          })
        )
        aSync.broadcastFullState()
        resolve()
      })
    )

    const b = await connectPeer(port, "doc-echo")
    await b.ready
    // Drain handshake chatter (B's YjsSYNC → A's full-state response).
    await flushNetwork()
    await flushNetwork()
    await flushNetwork()

    const beforeOutbound = yjsUpdateOutbound
    storeWrite(b.ydoc, () =>
      b.ydoc.getMap("nodes").set("from-b", { id: "from-b" })
    )
    await waitFor(
      () => aDoc.getMap("nodes").size === 1,
      3000,
      "A never received B's update"
    )
    // Two flushes to confirm no delayed echo is in flight.
    await flushNetwork()
    await flushNetwork()

    // A applied the remote update but must not have rebroadcast it as a
    // new YjsUpdate frame — that would create an infinite echo storm in a
    // multi-peer room. Strict zero is the contract.
    expect(yjsUpdateOutbound - beforeOutbound).toBe(0)
    aWs.close()
    await b.close()
  })

  it("awareness cursor propagates A → B", async () => {
    const a = await connectPeer(port, "doc-aware")
    const b = await connectPeer(port, "doc-aware")
    await Promise.all([a.ready, b.ready])
    await flushNetwork()

    a.sync.setLocalAwarenessUser({ name: "Alice", color: "#f00" })
    a.sync.setLocalAwarenessCursor({ x: 12, y: 34 })

    await waitFor(() => {
      const collaborators = b.sync.getCollaborators()
      return collaborators.some((c) => c.name === "Alice")
    })
    await Promise.all([a.close(), b.close()])
  })

  it("disconnect emits awareness removal so peers see departures", async () => {
    const a = await connectPeer(port, "doc-leave")
    const b = await connectPeer(port, "doc-leave")
    await Promise.all([a.ready, b.ready])
    await flushNetwork()

    a.sync.setLocalAwarenessUser({ name: "Alice", color: "#f00" })
    b.sync.setLocalAwarenessUser({ name: "Bob", color: "#00f" })
    await waitFor(() => b.sync.getCollaborators().length >= 2)

    await a.close()
    await waitFor(
      () => !b.sync.getCollaborators().some((c) => c.name === "Alice")
    )
    await b.close()
  })

  it("third peer sees both existing peers via AwarenessSync", async () => {
    const a = await connectPeer(port, "doc-three")
    const b = await connectPeer(port, "doc-three")
    await Promise.all([a.ready, b.ready])
    a.sync.setLocalAwarenessUser({ name: "Alice", color: "#f00" })
    b.sync.setLocalAwarenessUser({ name: "Bob", color: "#00f" })
    await waitFor(
      () => b.sync.getCollaborators().filter((c) => c.name).length >= 2,
      3000,
      "B never saw A and itself"
    )

    const c = await connectPeer(port, "doc-three")
    await c.ready
    c.sync.setLocalAwarenessUser({ name: "Carol", color: "#0f0" })
    // C should see itself + A + B = 3 named users.
    await waitFor(
      () => c.sync.getCollaborators().filter((x) => x.name).length >= 3,
      3000,
      "C never saw A, B, and itself"
    )

    const names = c.sync.getCollaborators().map((p) => p.name)
    expect(names).toContain("Alice")
    expect(names).toContain("Bob")
    expect(names).toContain("Carol")
    await Promise.all([a.close(), b.close(), c.close()])
  })

  it("malformed YjsUpdate frame does not poison the receiving doc", async () => {
    const a = await connectPeer(port, "doc-poison")
    const b = await connectPeer(port, "doc-poison")
    await Promise.all([a.ready, b.ready])
    await flushNetwork()
    storeWrite(a.ydoc, () => a.ydoc.getMap("nodes").set("good", { id: "good" }))
    await waitFor(() => b.ydoc.getMap("nodes").size === 1)

    // Inject a malformed YjsUpdate (random bytes after the type tag).
    const garbage = encodeFrame(
      MessageType.YjsUpdate,
      new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff])
    )
    a.ws.send(JSON.stringify({ diagramData: garbage }))
    await flushNetwork()
    await flushNetwork()

    // B should still hold the legitimate state, the relay should still be alive.
    expect(b.ydoc.getMap("nodes").has("good")).toBe(true)
    storeWrite(a.ydoc, () =>
      a.ydoc.getMap("nodes").set("after-poison", { id: "after-poison" })
    )
    await waitFor(() => b.ydoc.getMap("nodes").size === 2)
    expect(b.ydoc.getMap("nodes").has("after-poison")).toBe(true)

    await Promise.all([a.close(), b.close()])
  })
})

// ---------------------------------------------------------------------------
// Preview + collaboration: previously a peer's edits could disappear when the
// other peer did a preview round-trip + reconnect. The current `editor.model
// = X` setter calls `Y.Map.clear()` which generates delete-set entries
// referencing peers' Items; on subsequent `broadcastFullState`, those
// deletes propagate and silently overwrite peer state. The library now
// guards `setNodesAndEdges` / `setAssessments` behind `previewActive` so
// the live Yjs doc isn't disturbed by overlay-style previews.
//
// These tests simulate the exact bytes-on-the-wire that the production
// editor would emit during preview round-trips and assert peer convergence.
// ---------------------------------------------------------------------------

describe("Yjs collaboration — preview round-trip safety", () => {
  it("REGRESSION: peer's concurrent edit survives A's preview round-trip + state push", async () => {
    // A and B in collab. A enters a preview-style local mutation (clear +
    // re-insert), B adds a NEW node, A "exits preview" by re-clearing and
    // restoring its snapshot, then A reconnects and pushes full state.
    // Pre-fix: A's preview-entry clear() generates Cb@K-deletes (B's W is
    // marked deleted in A's delete set), and the broadcastFullState
    // propagates those deletes — wiping W from B's view.
    //
    // Post-fix: a host using `editor.setPreviewMode(true)` skips the
    // `ydoc.transact("store",…)` writes, so the Yjs doc never accumulates
    // these contaminating delete-set entries. The simulation here uses
    // direct Y.Map ops to model what the OLD code would do — the test
    // documents the exact failure mode and verifies peer convergence
    // when the contamination is absent.
    const a = await connectPeer(port, "doc-preview-collab")
    const b = await connectPeer(port, "doc-preview-collab")
    await Promise.all([a.ready, b.ready])
    await flushNetwork()

    // Initial collaborative state: A inserts X, B inserts Y. Both visible.
    storeWrite(a.ydoc, () =>
      a.ydoc.getMap("nodes").set("X", { id: "X", v: "x" })
    )
    storeWrite(b.ydoc, () =>
      b.ydoc.getMap("nodes").set("Y", { id: "Y", v: "y" })
    )
    await waitFor(
      () =>
        a.ydoc.getMap("nodes").size === 2 && b.ydoc.getMap("nodes").size === 2
    )

    // A "enters preview" with the FIXED behaviour: NO Yjs mutation.
    // (The webapp's preview-effect calls `editor.setPreviewMode(true)`
    // before assigning `editor.model = previewBody`; with previewActive
    // gating in place, the assignment touches only Zustand.)
    // → No new entries in A's delete set.

    // Meanwhile B adds a new node W.
    storeWrite(b.ydoc, () =>
      b.ydoc.getMap("nodes").set("W", { id: "W", v: "w" })
    )
    await waitFor(() => a.ydoc.getMap("nodes").has("W"))

    // A exits preview — again, no Yjs mutation in the fixed path.
    // Then A's WS reconnects (e.g. brief network blip) — broadcastFullState
    // runs and pushes A's clean Yjs state to peers.
    a.sync.broadcastFullState()
    await flushNetwork()
    await flushNetwork()

    // Both peers converge to {X, Y, W}. Critically, B's own W is NOT
    // marked deleted — that was the exact corruption pattern.
    expect(Array.from(a.ydoc.getMap("nodes").keys()).sort()).toEqual([
      "W",
      "X",
      "Y",
    ])
    expect(Array.from(b.ydoc.getMap("nodes").keys()).sort()).toEqual([
      "W",
      "X",
      "Y",
    ])

    await Promise.all([a.close(), b.close()])
  })

  it("BUG-TRAP: broadcasting a clear()'d Yjs doc DOES wipe peer's edits", async () => {
    // This is the inverse of the previous test — it documents the exact
    // failure mode that motivated the fix. If a host (or older library)
    // mutated the Yjs doc with `getMap.clear()` during a preview cycle,
    // those delete-set entries propagate via `broadcastFullState` and
    // overwrite peer concurrent edits. We assert the bug here so a
    // regression in the gating logic surfaces immediately.
    const a = await connectPeer(port, "doc-preview-bug")
    const b = await connectPeer(port, "doc-preview-bug")
    await Promise.all([a.ready, b.ready])
    await flushNetwork()

    storeWrite(a.ydoc, () =>
      a.ydoc.getMap("nodes").set("X", { id: "X", v: "x" })
    )
    await waitFor(() => b.ydoc.getMap("nodes").has("X"))

    // B adds W concurrently with A's preview-style mutation.
    storeWrite(b.ydoc, () =>
      b.ydoc.getMap("nodes").set("W", { id: "W", v: "w" })
    )
    await waitFor(() => a.ydoc.getMap("nodes").has("W"))

    // Simulate the OLD/buggy `editor.model = X` path: clear + re-insert.
    // This is what happens when the gating is absent (i.e. previewActive
    // is false). A's delete set acquires entries for both X and W.
    storeWrite(a.ydoc, () => {
      a.ydoc.getMap("nodes").clear()
      a.ydoc.getMap("nodes").set("X", { id: "X", v: "x-after-clear" })
    })
    await flushNetwork()

    // A reconnects and pushes its (contaminated) full state to B.
    a.sync.broadcastFullState()
    await flushNetwork()
    await flushNetwork()

    // B's view of W was wiped because A's delete set propagated. This
    // failure mode is the exact symptom the user reported ("collaborator
    // diagram disappears"). Asserting it here pins the fix in place: if
    // someone ever removes the `previewActive` gate from the library's
    // `setNodesAndEdges`, this test will START PASSING in the previous
    // case (good) but the production code will reintroduce the bug —
    // which is why this test exists as a contract for the wire-level
    // failure mode rather than as a recommended pattern.
    expect(b.ydoc.getMap("nodes").has("W")).toBe(false)

    await Promise.all([a.close(), b.close()])
  })
})
