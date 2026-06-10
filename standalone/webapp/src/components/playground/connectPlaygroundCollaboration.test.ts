import { afterEach, describe, expect, it, vi } from "vitest"
import { connectPlaygroundCollaboration } from "./connectPlaygroundCollaboration"

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = []

  readonly postMessage = vi.fn((data: unknown) => {
    for (const channel of MockBroadcastChannel.instances) {
      if (channel !== this && channel.name === this.name) {
        channel.receive(data)
      }
    }
  })
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
  it("relays editor messages through a browser-local channel", () => {
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

    expect(channel.postMessage).toHaveBeenNthCalledWith(1, "document-sync")
    expect(channel.postMessage).toHaveBeenNthCalledWith(2, "awareness-sync")
    expect(editor.broadcastFullState).toHaveBeenCalledOnce()
    sendMessage?.("outbound")
    expect(channel.postMessage).toHaveBeenCalledWith("outbound")

    channel.receive("inbound")
    expect(editor.receiveBroadcastedMessage).toHaveBeenCalledWith("inbound")

    disconnect()
    expect(channel.close).toHaveBeenCalledOnce()
  })

  it("synchronizes a late peer before relaying edits in both directions", () => {
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel)
    let sendFromA: ((message: string) => void) | undefined
    let sendFromB: ((message: string) => void) | undefined

    const editorA = {
      broadcastFullState: vi.fn(() => sendFromA?.("full-state-a")),
      receiveBroadcastedMessage: vi.fn((message: string) => {
        if (message === "document-sync") sendFromA?.("sync-response-a")
      }),
      sendBroadcastMessage: vi.fn((callback: (message: string) => void) => {
        sendFromA = callback
      }),
    }
    const editorB = {
      broadcastFullState: vi.fn(() => sendFromB?.("full-state-b")),
      receiveBroadcastedMessage: vi.fn(),
      sendBroadcastMessage: vi.fn((callback: (message: string) => void) => {
        sendFromB = callback
      }),
    }
    const initialSyncMessages = {
      document: "document-sync",
      awareness: "awareness-sync",
    }

    const disconnectA = connectPlaygroundCollaboration(
      editorA,
      initialSyncMessages
    )
    const disconnectB = connectPlaygroundCollaboration(
      editorB,
      initialSyncMessages
    )

    expect(editorB.receiveBroadcastedMessage).toHaveBeenCalledWith(
      "sync-response-a"
    )
    expect(editorA.receiveBroadcastedMessage).toHaveBeenCalledWith(
      "full-state-b"
    )

    sendFromA?.("edit-a")
    sendFromB?.("edit-b")

    expect(editorB.receiveBroadcastedMessage).toHaveBeenCalledWith("edit-a")
    expect(editorA.receiveBroadcastedMessage).toHaveBeenCalledWith("edit-b")

    disconnectA()
    disconnectB()
  })
})
