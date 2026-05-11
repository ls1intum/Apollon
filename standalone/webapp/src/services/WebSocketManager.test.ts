/**
 * `cleanup()` must (a) detach handlers, (b) close the socket with
 * 1001, (c) be idempotent, and (d) drop frames captured from before
 * cleanup via the in-handler `cleanedUp` short-circuit.
 */
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
  closed = false
  closeCode: number | undefined

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }
  send() {}
  close(code?: number) {
    this.closed = true
    this.closeCode = code
  }
}

function makeFakeEditor() {
  return {
    receiveBroadcastedMessage: vi.fn(),
    sendBroadcastMessage: vi.fn(),
    broadcastFullState: vi.fn(),
  } as unknown as ApollonEditor & {
    receiveBroadcastedMessage: ReturnType<typeof vi.fn>
  }
}

function startManager() {
  const editor = makeFakeEditor()
  const onError = vi.fn()
  const manager = new WebSocketManager("diag-1", editor, onError)
  manager.startConnection()
  const socket = FakeWebSocket.instances.at(-1)!
  socket.readyState = FakeWebSocket.OPEN
  socket.onopen?.(new Event("open"))
  return { manager, editor, onError, socket }
}

beforeEach(() => {
  FakeWebSocket.instances = []
  vi.stubGlobal("WebSocket", FakeWebSocket)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("WebSocketManager.cleanup", () => {
  it("in-handler guard drops data frames captured before cleanup", () => {
    const { manager, editor, socket } = startManager()
    const captured = socket.onmessage!

    manager.cleanup()
    captured(
      new MessageEvent("message", {
        data: JSON.stringify({ diagramData: "base64-payload" }),
      })
    )

    expect(editor.receiveBroadcastedMessage).not.toHaveBeenCalled()
  })

  it("in-handler guard drops control envelopes captured before cleanup", () => {
    const { manager, socket } = startManager()
    const listener = vi.fn()
    manager.onControl(listener)
    const captured = socket.onmessage!

    manager.cleanup()
    captured(
      new MessageEvent("message", {
        data: JSON.stringify({
          kind: "control",
          control: { type: "VERSION_DELETED", versionId: "v1" },
        }),
      })
    )

    expect(listener).not.toHaveBeenCalled()
  })

  it("detaches handlers and closes with code 1001", () => {
    const { manager, socket } = startManager()
    manager.cleanup()

    expect(socket.onopen).toBeNull()
    expect(socket.onmessage).toBeNull()
    expect(socket.onerror).toBeNull()
    expect(socket.onclose).toBeNull()
    expect(socket.closed).toBe(true)
    expect(socket.closeCode).toBe(1001)
  })

  it("is idempotent", () => {
    const { manager, socket } = startManager()
    manager.cleanup()
    socket.closed = false
    expect(() => manager.cleanup()).not.toThrow()
    expect(socket.closed).toBe(false)
  })

  it("closes a still-connecting socket", () => {
    const manager = new WebSocketManager("diag-1", makeFakeEditor(), vi.fn())
    manager.startConnection()
    const socket = FakeWebSocket.instances.at(-1)!
    expect(socket.readyState).toBe(FakeWebSocket.CONNECTING)

    manager.cleanup()
    expect(socket.closed).toBe(true)
    expect(socket.closeCode).toBe(1001)
  })

  it("a captured onerror does NOT surface onError after cleanup", () => {
    const { manager, onError, socket } = startManager()
    const captured = socket.onerror!

    manager.cleanup()
    captured(new Event("error"))

    expect(onError).not.toHaveBeenCalled()
  })
})
