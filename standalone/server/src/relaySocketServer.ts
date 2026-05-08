import WebSocket, { WebSocketServer } from "ws"
import { IncomingMessage } from "http"
import { URL } from "url"
import { log } from "./logger"
import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness"
import * as Y from "yjs"
import * as decoding from "lib0/decoding"

enum MessageType {
  AwarenessUpdate = 3,
}

type RoomAwarenessState = {
  doc: Y.Doc
  awareness: Awareness
}

interface ExtendedWebSocket extends WebSocket {
  diagramId?: string
}

export const startSocketServer = (): void => {
  const serverHost = process.env.HOST || "localhost"
  const wsServerPort = Number(process.env.WS_PORT) || 4444

  const wss = new WebSocketServer({
    port: wsServerPort,
    host: serverHost,
  })

  const diagrams: Map<string, Set<ExtendedWebSocket>> = new Map()
  const roomAwarenessStates: Map<string, RoomAwarenessState> = new Map()
  const awarenessClientIdsBySocket: WeakMap<
    ExtendedWebSocket,
    Set<number>
  > = new WeakMap()

  const getOrCreateAwarenessState = (diagramId: string): RoomAwarenessState => {
    const existing = roomAwarenessStates.get(diagramId)
    if (existing) {
      return existing
    }

    const doc = new Y.Doc()
    const awareness = new Awareness(doc)
    const state = { doc, awareness }
    roomAwarenessStates.set(diagramId, state)
    return state
  }

  const decodeAwarenessUpdateClients = (
    update: Uint8Array
  ): { present: number[]; removed: number[] } => {
    const present: number[] = []
    const removed: number[] = []

    try {
      const decoder = decoding.createDecoder(update)
      const len = decoding.readVarUint(decoder)

      for (let i = 0; i < len; i++) {
        const clientId = decoding.readVarUint(decoder)
        decoding.readVarUint(decoder) // clock
        const state = JSON.parse(decoding.readVarString(decoder))

        if (state === null) {
          removed.push(clientId)
        } else {
          present.push(clientId)
        }
      }
    } catch {
      return { present: [], removed: [] }
    }

    return { present, removed }
  }

  const broadcastAwarenessRemoval = (
    diagramId: string,
    disconnectedSocket: ExtendedWebSocket,
    removedClientIds: number[]
  ) => {
    if (removedClientIds.length === 0) {
      return
    }

    const roomAwarenessState = roomAwarenessStates.get(diagramId)
    if (!roomAwarenessState) {
      return
    }

    removeAwarenessStates(
      roomAwarenessState.awareness,
      removedClientIds,
      disconnectedSocket
    )

    const awarenessUpdate = encodeAwarenessUpdate(
      roomAwarenessState.awareness,
      removedClientIds
    )
    const framedUpdate = new Uint8Array(1 + awarenessUpdate.length)
    framedUpdate[0] = MessageType.AwarenessUpdate
    framedUpdate.set(awarenessUpdate, 1)

    const messageString = JSON.stringify({
      diagramData: Buffer.from(framedUpdate).toString("base64"),
    })

    const clients = diagrams.get(diagramId)
    if (!clients) {
      return
    }

    clients.forEach((client) => {
      if (
        client !== disconnectedSocket &&
        client.readyState === WebSocket.OPEN
      ) {
        client.send(messageString)
      }
    })
  }

  wss.on("error", (error: NodeJS.ErrnoException) => {
    log.error("WebSocket server error:", error)
    if (error.code === "EADDRINUSE") {
      log.error(
        `Port ${wsServerPort} is already in use. Please check if another instance is running.`
      )
    }
  })

  wss.on("connection", (ws: ExtendedWebSocket, request: IncomingMessage) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`)
    const diagramId = url.searchParams.get("diagramId")

    if (!diagramId) {
      ws.close(1008, "Missing diagramId")
      return
    }

    // Assign client to room
    if (!diagrams.has(diagramId)) {
      diagrams.set(diagramId, new Set())
    }
    diagrams.get(diagramId)!.add(ws)
    ws.diagramId = diagramId
    awarenessClientIdsBySocket.set(ws, new Set())
    getOrCreateAwarenessState(diagramId)

    ws.on("message", (message: WebSocket.RawData) => {
      const clients = diagrams.get(ws.diagramId!)
      if (!clients) return

      // Convert message to string if it's a Buffer or string
      // This is necessary because WebSocket messages can be sent as Buffer or string
      // and we want to ensure we send a string to all clients
      const messageString =
        typeof message === "string"
          ? message
          : message instanceof Buffer
            ? message.toString("utf-8")
            : ""

      try {
        const parsedMessage = JSON.parse(messageString) as {
          diagramData?: string
        }

        if (typeof parsedMessage.diagramData === "string") {
          const roomAwarenessState = roomAwarenessStates.get(ws.diagramId!)
          if (roomAwarenessState) {
            const decoded = Buffer.from(parsedMessage.diagramData, "base64")
            if (
              decoded.length > 0 &&
              decoded[0] === MessageType.AwarenessUpdate
            ) {
              const awarenessUpdate = new Uint8Array(decoded.subarray(1))
              applyAwarenessUpdate(
                roomAwarenessState.awareness,
                awarenessUpdate,
                ws
              )

              const { present, removed } =
                decodeAwarenessUpdateClients(awarenessUpdate)
              const socketAwarenessIds = awarenessClientIdsBySocket.get(ws)
              if (socketAwarenessIds) {
                for (const id of present) {
                  socketAwarenessIds.add(id)
                }
                for (const id of removed) {
                  socketAwarenessIds.delete(id)
                }
              }
            }
          }
        }
      } catch {
        // Best effort parsing to track awareness IDs; relay still works.
      }

      let count = 0
      clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(messageString)
          count++
        }
      })

      log.debug(`Message sent to ${count} clients in diagram ${ws.diagramId}`)
    })

    ws.on("close", () => {
      const clients = diagrams.get(ws.diagramId!)
      const socketAwarenessIds = awarenessClientIdsBySocket.get(ws)
      if (clients) {
        clients.delete(ws)

        if (socketAwarenessIds && socketAwarenessIds.size > 0) {
          broadcastAwarenessRemoval(
            ws.diagramId!,
            ws,
            Array.from(socketAwarenessIds)
          )
        }

        if (clients.size === 0) {
          diagrams.delete(ws.diagramId!)
          const roomAwarenessState = roomAwarenessStates.get(ws.diagramId!)
          if (roomAwarenessState) {
            roomAwarenessState.awareness.destroy()
            roomAwarenessState.doc.destroy()
            roomAwarenessStates.delete(ws.diagramId!)
          }
        }
      }
    })

    ws.on("error", (error: Error) => {
      log.error("WebSocket error:", error)
    })
  })

  log.debug(
    `Relay websocket server running on ws://${serverHost}:${wsServerPort}`
  )
}
