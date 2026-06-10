import type { ApollonEditor } from "@tumaet/apollon/react"

export const PLAYGROUND_COLLABORATION_CHANNEL =
  "apollon-playground-collaboration"

type CollaborationEditor = Pick<
  ApollonEditor,
  "broadcastFullState" | "receiveBroadcastedMessage" | "sendBroadcastMessage"
>

type InitialSyncMessages = {
  document: string
  awareness: string
}

export const connectPlaygroundCollaboration = (
  editor: CollaborationEditor,
  initialSyncMessages: InitialSyncMessages
): (() => void) => {
  if (typeof BroadcastChannel === "undefined") return () => {}

  const channel = new BroadcastChannel(PLAYGROUND_COLLABORATION_CHANNEL)
  const handleMessage = (event: MessageEvent<unknown>) => {
    if (typeof event.data === "string") {
      editor.receiveBroadcastedMessage(event.data)
    }
  }

  channel.addEventListener("message", handleMessage)
  editor.sendBroadcastMessage((message) => channel.postMessage(message))
  channel.postMessage(initialSyncMessages.document)
  channel.postMessage(initialSyncMessages.awareness)
  editor.broadcastFullState()

  return () => {
    channel.removeEventListener("message", handleMessage)
    channel.close()
  }
}
