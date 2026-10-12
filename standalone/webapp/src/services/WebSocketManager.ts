import { ApollonEditor } from "@tumaet/apollon"
import { serverWSSUrl } from "@/constants"
import { type ControlEvent, type Envelope, WebSocketMessage } from "@/types"
import { log } from "@/logger"
import { getSharedDiagramWriteToken } from "@/utils/sharedDiagramStorage"

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
  private controlListeners = new Set<ControlListener>()
  private accessReady = false
  private canWrite = false

  constructor(
    private diagramId: string,
    private instance: ApollonEditor,
    private onError: (e: Event) => void,
    private requestWrite = true
  ) {
    this.instance.sendBroadcastMessage((diagramData) => {
      if (this.websocket?.readyState === WebSocket.OPEN && this.accessReady) {
        if (!this.canWrite) {
          const frame = atob(diagramData)
          if (
            frame.length !== 1 ||
            (frame.charCodeAt(0) !== 0 && frame.charCodeAt(0) !== 2)
          )
            return
        }
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
    if (
      this.websocket?.readyState !== WebSocket.OPEN ||
      !this.accessReady ||
      !this.canWrite
    )
      return
    const envelope: Envelope = { kind: "control", control: event }
    this.websocket.send(JSON.stringify(envelope))
  }

  private createWebSocket() {
    const url = `${serverWSSUrl}?diagramId=${encodeURIComponent(this.diagramId)}`
    this.websocket = new WebSocket(url)
    this.accessReady = false
    this.canWrite = false

    this.websocket.onopen = () => {
      this.websocket?.send(
        JSON.stringify({
          kind: "access",
          token: this.requestWrite
            ? getSharedDiagramWriteToken(this.diagramId)
            : undefined,
        })
      )
    }

    this.websocket.onmessage = (event) => {
      const raw = String(event.data)
      if (raw.startsWith(ENVELOPE_PREFIX)) {
        try {
          const envelope = JSON.parse(raw) as
            | Envelope
            | { kind: "access"; canWrite: boolean }
          if (envelope.kind === "access") {
            if (this.accessReady) return
            this.accessReady = true
            this.reconnectStartTime = 0
            this.canWrite = this.requestWrite && envelope.canWrite === true
            if (this.canWrite) {
              this.websocket?.send(
                JSON.stringify({
                  diagramData: ApollonEditor.generateInitialSyncMessage(),
                })
              )
            }
            this.websocket?.send(
              JSON.stringify({
                diagramData:
                  ApollonEditor.generateInitialAwarenessSyncMessage(),
              })
            )
            // Push offline edits only after the relay confirms write access.
            if (this.canWrite) this.instance.broadcastFullState()
            else this.dispatchControl({ type: "DIAGRAM_UPDATED" })
            return
          }
          if (envelope.kind === "control") {
            this.dispatchControl(envelope.control)
            return
          }
        } catch {
          // Fall through to opaque path on parse failure.
        }
      }
      try {
        const msg = JSON.parse(raw) as WebSocketMessage
        if (msg && typeof msg === "object" && "diagramData" in msg) {
          if (!this.canWrite && atob(msg.diagramData).charCodeAt(0) === 1)
            return
          this.instance.receiveBroadcastedMessage(msg.diagramData)
        }
      } catch (err) {
        log.warn("Failed to parse WebSocket message", err)
      }
    }

    this.websocket.onerror = (e) => {
      this.onError(e)
      this.scheduleReconnect()
    }

    this.websocket.onclose = (event) => {
      this.accessReady = false
      if (event.code === 1008) {
        this.onError(event)
        return
      }
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
    this.accessReady = false
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.websocket) {
      this.websocket.onopen = null
      this.websocket.onmessage = null
      this.websocket.onerror = null
      this.websocket.onclose = null
      // 1001 ("Going Away") is UA-reserved; 1000 is the only JS-legal
      // generic close code (RFC 6455 §7.4 / MDN WebSocket.close).
      this.websocket.close(1000)
    }
    this.websocket = null
  }
}
