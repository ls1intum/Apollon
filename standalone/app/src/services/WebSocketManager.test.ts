import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ApollonEditor } from "@tumaet/apollon"
import { WebSocketManager } from "./WebSocketManager"

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
  FakeWebSocket.instances = []
  vi.stubGlobal("WebSocket", FakeWebSocket)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("WebSocketManager.cleanup", () => {
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
