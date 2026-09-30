import type { HostMessage, WebviewMessage } from "./shared/protocol"

declare global {
  interface Window {
    /** Injected by `ApollonFileEditor` via `JBCefJSQuery.inject(...)` once the
     *  page loads — see that class for why this is fire-and-forget. */
    __apollonPostToHost?: (payload: string) => void
    /** Called directly by `ApollonFileEditor.postToWebview` — there is no
     *  `postMessage`/`CustomEvent` indirection to route through. */
    __apollonReceiveFromHost?: (message: HostMessage) => void
  }
}

const listeners = new Set<(message: HostMessage) => void>()

window.__apollonReceiveFromHost = (message) => {
  for (const listener of listeners) {
    listener(message)
  }
}

export function postToHost(message: WebviewMessage): void {
  window.__apollonPostToHost?.(JSON.stringify(message))
}

/** Subscribe to host -> webview messages. Returns the unsubscribe function. */
export function onHostMessage(
  handler: (message: HostMessage) => void
): () => void {
  listeners.add(handler)
  return () => listeners.delete(handler)
}
