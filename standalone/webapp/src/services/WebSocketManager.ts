import { ApollonEditor } from "@tumaet/apollon"
import { serverWSSUrl } from "@/constants"
import { type ControlEvent, type Envelope, WebSocketMessage } from "@/types"
import { log } from "@/logger"

interface ReconnectionStep {
  interval: number
  duration: number
}

type ControlListener = (event: ControlEvent) => void

const ENVELOPE_PREFIX = '{"kind":'

export class WebSocketManager {
  private websocket: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private readonly reconnectSteps: ReconnectionStep[] = [
    { interval: 5000, duration: 60000 },
    { interval: 15000, duration: 4 * 60000 },
    { interval: 30000, duration: 5 * 60000 },
  ]
  private reconnectStartTime = 0
  private cleanedUp = false
  private controlListeners = new Set<ControlListener>()
  private previewMode = false

  constructor(
    private diagramId: string,
    private instance: ApollonEditor,
    private onError: (e: Event) => void
  ) {
    this.instance.sendBroadcastMessage((diagramData) => {
      if (this.previewMode) return
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ diagramData }))
      }
    })
  }

  public startConnection() {
    this.createWebSocket()
  }

  public onControl(listener: ControlListener): () => void {
    this.controlListeners.add(listener)
    return () => this.controlListeners.delete(listener)
  }

  public publishControl(event: ControlEvent): void {
    if (this.websocket?.readyState !== WebSocket.OPEN) return
    const envelope: Envelope = { kind: "control", control: event }
    this.websocket.send(JSON.stringify(envelope))
  }

  public setPreviewMode(on: boolean): void {
    this.previewMode = on
  }

  public requestResync(): void {
    if (this.websocket?.readyState !== WebSocket.OPEN) return
    const initialMessage = {
      diagramData: ApollonEditor.generateInitialSyncMessage(),
    }
    this.websocket.send(JSON.stringify(initialMessage))
  }

  private createWebSocket() {
    if (this.cleanedUp) return
    const url = `${serverWSSUrl}?diagramId=${encodeURIComponent(this.diagramId)}`
    this.websocket = new WebSocket(url)

    this.websocket.onopen = () => {
      this.reconnectStartTime = 0
      const initialMessage = {
        diagramData: ApollonEditor.generateInitialSyncMessage(),
      }
      this.websocket?.send(JSON.stringify(initialMessage))

      const awarenessMessage = {
        diagramData: ApollonEditor.generateInitialAwarenessSyncMessage(),
      }
      this.websocket?.send(JSON.stringify(awarenessMessage))
    }

    this.websocket.onmessage = (event) => {
      const raw = String(event.data)
      if (raw.startsWith(ENVELOPE_PREFIX)) {
        try {
          const envelope = JSON.parse(raw) as Envelope
          if (envelope.kind === "control") {
            this.dispatchControl(envelope.control)
            return
          }
        } catch {
          // Fall through to opaque path on parse failure.
        }
      }
      if (this.previewMode) return
      try {
        const msg = JSON.parse(raw) as WebSocketMessage
        if (msg && typeof msg === "object" && "diagramData" in msg) {
          this.instance.receiveBroadcastedMessage(msg.diagramData)
        }
      } catch (err) {
        log.warn("Failed to parse WebSocket message", err)
      }
    }

    this.websocket.onerror = (e) => {
      if (this.cleanedUp) return
      this.onError(e)
      this.scheduleReconnect()
    }

    this.websocket.onclose = () => {
      if (this.cleanedUp) return
      this.scheduleReconnect()
    }
  }

  private dispatchControl(event: ControlEvent) {
    for (const listener of this.controlListeners) {
      try {
        listener(event)
      } catch (err) {
        log.error("Control listener threw", err)
      }
    }
  }

  private scheduleReconnect() {
    if (this.cleanedUp) return
    if (this.reconnectStartTime === 0) {
      this.reconnectStartTime = Date.now()
    }
    const elapsed = Date.now() - this.reconnectStartTime

    let runningTotal = 0
    let currentStep: ReconnectionStep | undefined
    for (const step of this.reconnectSteps) {
      runningTotal += step.duration
      if (elapsed < runningTotal) {
        currentStep = step
        break
      }
    }
    if (!currentStep) {
      log.warn("WebSocket reconnection attempts stopped.")
      return
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    this.reconnectTimeout = setTimeout(() => {
      this.createWebSocket()
    }, currentStep.interval)
  }

  public cleanup() {
    this.cleanedUp = true
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.websocket?.readyState === WebSocket.OPEN) {
      // 1001 "Going Away" — the page is unloading / component unmounting.
      // 1000 "Normal Closure" is reserved for intentional end-of-session
      // closes; navigation/unmount is the "going away" semantic.
      this.websocket.close(1001)
    }
    this.websocket = null
    this.controlListeners.clear()
  }
}
