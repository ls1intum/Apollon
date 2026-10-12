import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ApollonEditor } from "@tumaet/apollon"
import { WebSocketManager } from "./WebSocketManager"
import { addSharedDiagramEntry } from "@/utils/sharedDiagramStorage"

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  readyState = FakeWebSocket.CONNECTING
  onopen: ((e: Event) => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  onclose: ((e: CloseEvent) => void) | null = null

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }
  send() {}
  close(code?: number) {
    // Enforce the platform contract: close() only accepts 1000 or 3000–4999
    // (RFC 6455 §7.4 / MDN WebSocket.close).
    if (code !== undefined && code !== 1000 && (code < 3000 || code > 4999)) {
      throw new DOMException(
        `Failed to execute 'close' on 'WebSocket': The close code must be either 1000, or between 3000 and 4999. ${code} is neither.`,
        "InvalidAccessError"
      )
    }
  }
}

function makeFakeEditor() {
  return {
    receiveBroadcastedMessage: vi.fn(),
    sendBroadcastMessage: vi.fn(),
    broadcastFullState: vi.fn(),
  } as unknown as ApollonEditor
}

function startManager() {
  const manager = new WebSocketManager("diag-1", makeFakeEditor(), vi.fn())
  manager.startConnection()
  const socket = FakeWebSocket.instances.at(-1)!
  socket.readyState = FakeWebSocket.OPEN
  socket.onopen?.(new Event("open"))
  return { manager, socket }
}

beforeEach(() => {
  localStorage.clear()
  FakeWebSocket.instances = []
  vi.stubGlobal("WebSocket", FakeWebSocket)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("WebSocketManager.cleanup", () => {
  it.each([
    [1008, 1],
    [1011, 2],
  ])("reconnects only for a retryable access failure (%s)", (code, count) => {
    vi.useFakeTimers()
    const { manager, socket } = startManager()
    try {
      socket.onclose?.(new CloseEvent("close", { code }))
      vi.advanceTimersByTime(5000)
      expect(FakeWebSocket.instances).toHaveLength(count)
    } finally {
      manager.cleanup()
      vi.useRealTimers()
    }
  })
  it("waits for write authorization before broadcasting offline state", () => {
    addSharedDiagramEntry("diag-1", { writeToken: "writer-token" })
    const editor = makeFakeEditor()
    const manager = new WebSocketManager("diag-1", editor, vi.fn())
    manager.startConnection()
    const socket = FakeWebSocket.instances.at(-1)!
    const send = vi.spyOn(socket, "send")
    socket.readyState = FakeWebSocket.OPEN
    socket.onopen?.(new Event("open"))
    expect(send).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ kind: "access", token: "writer-token" })
    )
    expect(editor.broadcastFullState).not.toHaveBeenCalled()
    socket.onmessage?.(
      new MessageEvent("message", {
        data: JSON.stringify({ kind: "access", canWrite: true }),
      })
    )
    expect(editor.broadcastFullState).toHaveBeenCalledOnce()
    manager.cleanup()
  })

  it("does not send document or awareness updates from a reader", () => {
    const editor = makeFakeEditor()
    const manager = new WebSocketManager("diag-1", editor, vi.fn(), false)
    manager.startConnection()
    const socket = FakeWebSocket.instances.at(-1)!
    socket.readyState = FakeWebSocket.OPEN
    socket.onopen?.(new Event("open"))
    socket.onmessage?.(
      new MessageEvent("message", {
        data: JSON.stringify({ kind: "access", canWrite: false }),
      })
    )
    expect(editor.broadcastFullState).not.toHaveBeenCalled()
    const send = vi.spyOn(socket, "send")
    const broadcast = vi.mocked(editor.sendBroadcastMessage).mock.calls[0]![0]
    broadcast(btoa(String.fromCharCode(1, 42)))
    broadcast(btoa(String.fromCharCode(3, 42)))
    expect(send).not.toHaveBeenCalled()
    broadcast(btoa(String.fromCharCode(0)))
    expect(send).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ diagramData: "AA==" })
    )
    manager.cleanup()
  })
  it("closes the open socket with code 1000", () => {
    const { manager, socket } = startManager()
    const closeSpy = vi.spyOn(socket, "close")
    manager.cleanup()
    expect(closeSpy).toHaveBeenCalledExactlyOnceWith(1000)
  })

  it("closes a still-connecting socket so the handshake doesn't leak", () => {
    const manager = new WebSocketManager("diag-1", makeFakeEditor(), vi.fn())
    manager.startConnection()
    const socket = FakeWebSocket.instances.at(-1)!
    const closeSpy = vi.spyOn(socket, "close")
    manager.cleanup()
    expect(closeSpy).toHaveBeenCalledExactlyOnceWith(1000)
  })

  it("is idempotent: a second cleanup() does not re-close the socket", () => {
    const { manager, socket } = startManager()
    const closeSpy = vi.spyOn(socket, "close")
    manager.cleanup()
    manager.cleanup()
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })

  it("a close event firing after cleanup does not spawn a reconnect", () => {
    vi.useFakeTimers()
    try {
      const { manager, socket } = startManager()
      manager.cleanup()
      // Browser dispatcher reads `onclose` at invoke time; if production left
      // it attached, scheduleReconnect would queue a fresh socket.
      socket.onclose?.(new CloseEvent("close"))
      vi.advanceTimersByTime(60_000)
      expect(FakeWebSocket.instances).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
