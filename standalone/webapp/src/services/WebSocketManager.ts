import { ApollonEditor } from "@tumaet/apollon"
import { serverWSSUrl } from "@/constants"
import { WebSocketMessage } from "@/types"
import { log } from "@/logger"

type ReconnectionStep = {
  interval: number
  duration: number
}

export class WebSocketManager {
  private websocket: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private readonly reconnectSteps: ReconnectionStep[] = [
    { interval: 5000, duration: 60000 },
    { interval: 15000, duration: 4 * 60000 },
    { interval: 30000, duration: 5 * 60000 },
  ]
  private reconnectStartTime = 0
  private isTryingToReconnect = false

  constructor(
    private diagramId: string,
    private instance: ApollonEditor,
    private onError: (e: Event) => void
  ) {}

  public startConnection() {
    this.createWebSocket()
  }

  private createWebSocket() {
    const url = `${serverWSSUrl}?diagramId=${this.diagramId}`
    this.websocket = new WebSocket(url)

    this.websocket.onopen = () => {
      this.reconnectStartTime = 0
      this.isTryingToReconnect = false

      const initialMessage = {
        diagramData: ApollonEditor.generateInitialSyncMessage(),
      }
      this.websocket?.send(JSON.stringify(initialMessage))

      this.instance.sendBroadcastMessage((diagramData) => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({ diagramData }))
        }
      })
    }

    this.websocket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WebSocketMessage
      this.instance.receiveBroadcastedMessage(msg.diagramData)
    }

    this.websocket.onerror = (e) => {
      this.onError(e)
      this.startReconnectionStrategy()
    }

    this.websocket.onclose = () => {
      this.startReconnectionStrategy()
    }
  }

  private startReconnectionStrategy() {
    if (this.isTryingToReconnect) return

    this.isTryingToReconnect = true
    this.reconnectStartTime = Date.now()
    this.tryReconnect()
  }

  private tryReconnect() {
    const now = Date.now()
    const elapsed = now - this.reconnectStartTime

    let currentStep: ReconnectionStep | undefined
    let totalTime = 0
    for (const step of this.reconnectSteps) {
      totalTime += step.duration
      if (elapsed < totalTime) {
        currentStep = step
        break
      }
    }

    if (!currentStep) {
      log.warn("WebSocket reconnection attempts stopped.")
      return
    }

    this.reconnectTimeout = setTimeout(() => {
      this.createWebSocket()
    }, currentStep.interval)
  }

  public cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.close()
    }
  }
}
