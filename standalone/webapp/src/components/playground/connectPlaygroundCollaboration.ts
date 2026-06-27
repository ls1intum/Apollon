import type { ApollonEditor } from "@tumaet/apollon"

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
  let active = true
  const handleMessage = (event: MessageEvent<unknown>) => {
    if (typeof event.data === "string") {
      editor.receiveBroadcastedMessage(event.data)
    }
  }

  channel.addEventListener("message", handleMessage)
  // The send sink can't be unset, so gate it on `active`: a late emit after
  // disconnect must not post to a closed channel.
  editor.sendBroadcastMessage((message) => {
    if (active) channel.postMessage(message)
  })
  channel.postMessage(initialSyncMessages.document)
  channel.postMessage(initialSyncMessages.awareness)
  editor.broadcastFullState()

  return () => {
    active = false
    channel.removeEventListener("message", handleMessage)
    channel.close()
  }
}
