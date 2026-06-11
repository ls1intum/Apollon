import { afterEach, describe, expect, it, vi } from "vitest"
import { connectPlaygroundCollaboration } from "./connectPlaygroundCollaboration"

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = []

  readonly postMessage = vi.fn()
  readonly close = vi.fn()
  private messageHandler: ((event: MessageEvent<unknown>) => void) | null = null

  constructor(readonly name: string) {
    MockBroadcastChannel.instances.push(this)
  }

  addEventListener(
    _type: "message",
    handler: (event: MessageEvent<unknown>) => void
  ) {
    this.messageHandler = handler
  }

  removeEventListener(
    _type: "message",
    handler: (event: MessageEvent<unknown>) => void
  ) {
    if (this.messageHandler === handler) this.messageHandler = null
  }

  receive(data: unknown) {
    this.messageHandler?.({ data } as MessageEvent<unknown>)
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  MockBroadcastChannel.instances = []
})

describe("connectPlaygroundCollaboration", () => {
  it("bridges the editor to a browser-local channel and tears it down", () => {
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel)
    let sendMessage: ((message: string) => void) | undefined
    const editor = {
      broadcastFullState: vi.fn(),
      receiveBroadcastedMessage: vi.fn(),
      sendBroadcastMessage: vi.fn((callback: (message: string) => void) => {
        sendMessage = callback
      }),
    }

    const disconnect = connectPlaygroundCollaboration(editor, {
      document: "document-sync",
      awareness: "awareness-sync",
    })
    const channel = MockBroadcastChannel.instances[0]

    // Seeds a joining peer: initial document + awareness, then full state.
    expect(channel.postMessage).toHaveBeenNthCalledWith(1, "document-sync")
    expect(channel.postMessage).toHaveBeenNthCalledWith(2, "awareness-sync")
    expect(editor.broadcastFullState).toHaveBeenCalledOnce()

    // Outbound editor messages go to the channel; inbound channel messages
    // reach the editor.
    sendMessage?.("outbound")
    expect(channel.postMessage).toHaveBeenCalledWith("outbound")
    channel.receive("inbound")
    expect(editor.receiveBroadcastedMessage).toHaveBeenCalledWith("inbound")

    disconnect()
    expect(channel.close).toHaveBeenCalledOnce()
  })
})
