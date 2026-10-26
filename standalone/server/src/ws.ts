import WebSocket, { WebSocketServer } from "ws"
import type { IncomingMessage } from "http"
import { URL } from "url"
import { logger } from "./logger.js"
import type { ControlEvent, Envelope } from "./types.js"
import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness"
import * as Y from "yjs"
import * as decoding from "lib0/decoding"
import { isTrustedOrigin, verifyWriteToken } from "./http/middleware/access.js"

const AWARENESS_MSG_TYPE = 3
// A reader may only ask peers for presence (a one-byte AwarenessSync request).
// Readers discard document state, so a document sync request would only make
// every writer re-send the full document to the room.
export const READER_FRAME = JSON.stringify({ diagramData: "Ag==" })
const DIAGRAM_ID_RE = /^[A-Za-z0-9_-]{1,64}$/

type RoomAwarenessState = {
  doc: Y.Doc
  awareness: Awareness
}

interface ExtendedWebSocket extends WebSocket {
  diagramId?: string
}

interface RelayServer {
  /** Publish a typed control event to every client in a diagram's room. */
  publishControl: (diagramId: string, control: ControlEvent) => void
  /** Close all underlying sockets and stop the server. */
  close: () => Promise<void>
  /** Number of rooms currently active (test/inspection helper). */
  roomCount: () => number
}

interface StartOptions {
  port: number
  host?: string
  ownerSecret: string
  diagramExists: (diagramId: string) => Promise<boolean>
  allowedOrigins?: string[]
  /** Override the per-room socket cap; integration tests use a smaller value. */
  maxSocketsPerRoom?: number
}

// Cap on a single WS frame the relay will accept and forward. Yjs updates
// for Apollon-sized diagrams are well under this; the cap exists so a URL
// bearer can't fan-out megabyte-scale payloads to every peer in the room.
const MAX_PAYLOAD_BYTES = 1_048_576 // 1 MiB

const HEARTBEAT_INTERVAL_MS = 30_000

// Per-room socket cap to bound URL-bearer abuse — 100 sits well above
// any realistic team size for a single diagram.
const DEFAULT_MAX_SOCKETS_PER_ROOM = 100

interface ExtendedWebSocketWithAlive extends ExtendedWebSocket {
  isAlive?: boolean
}

export function startRelayServer(opts: StartOptions): RelayServer {
  const maxSocketsPerRoom =
    opts.maxSocketsPerRoom ?? DEFAULT_MAX_SOCKETS_PER_ROOM
  const wss = new WebSocketServer({
    port: opts.port,
    host: opts.host,
    maxPayload: MAX_PAYLOAD_BYTES,
    // Disabled per OWASP WebSocket guidance (CRIME-style compression
    // side-channels); Yjs binary payloads compress poorly anyway.
    perMessageDeflate: false,
  })
  const rooms: Map<string, Set<ExtendedWebSocket>> = new Map()
  const roomAwarenessStates: Map<string, RoomAwarenessState> = new Map()
  const awarenessClientIdsBySocket = new WeakMap<
    ExtendedWebSocket,
    Set<number>
  >()

  function getOrCreateAwarenessState(diagramId: string): RoomAwarenessState {
    const existing = roomAwarenessStates.get(diagramId)
    if (existing) return existing
    const doc = new Y.Doc()
    const awareness = new Awareness(doc)
    const state: RoomAwarenessState = { doc, awareness }
    roomAwarenessStates.set(diagramId, state)
    return state
  }

  /**
   * Decode an awareness update payload to extract the client IDs that
   * are present (non-null state) or removed (null state).
   */
  function decodeAwarenessUpdateClients(update: Uint8Array): {
    present: number[]
    removed: number[]
  } {
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
      // Best-effort; if decoding fails we still relay the message.
    }
    return { present, removed }
  }

  /**
   * When a socket disconnects, remove its tracked awareness client IDs
   * from the room awareness state and broadcast the removal to peers.
   */
  function broadcastAwarenessRemoval(
    diagramId: string,
    disconnectedSocket: ExtendedWebSocket,
    removedClientIds: number[]
  ): void {
    if (removedClientIds.length === 0) return
    const roomState = roomAwarenessStates.get(diagramId)
    if (!roomState) return

    // Filter to only IDs the awareness layer actually knows about. A client
    // can be tracked-per-socket without ever appearing in the room
    // awareness (e.g. it sent only an empty AwarenessSync response, or its
    // entry was already cleared by a prior removal). Passing unknown IDs
    // to `encodeAwarenessUpdate` crashes on `meta.get(id).clock`.
    const known = removedClientIds.filter((id) =>
      roomState.awareness.meta.has(id)
    )
    if (known.length === 0) return

    removeAwarenessStates(roomState.awareness, known, disconnectedSocket)

    const awarenessUpdate = encodeAwarenessUpdate(roomState.awareness, known)
    // Frame the update: prepend the awareness message type byte, then
    // wrap in the same { diagramData: base64 } JSON envelope the client
    // expects.
    const framedUpdate = new Uint8Array(1 + awarenessUpdate.length)
    framedUpdate[0] = AWARENESS_MSG_TYPE
    framedUpdate.set(awarenessUpdate, 1)

    const payload = JSON.stringify({
      diagramData: Buffer.from(framedUpdate).toString("base64"),
    })

    const room = rooms.get(diagramId)
    if (!room) return
    for (const client of room) {
      if (client === disconnectedSocket) continue
      if (client.readyState !== WebSocket.OPEN) continue
      try {
        client.send(payload)
      } catch (err) {
        logger.error({ err, diagramId }, "ws awareness removal send failed")
      }
    }
  }

  wss.on("error", (err: NodeJS.ErrnoException) => {
    logger.error({ err, code: err.code }, "ws server error")
  })

  wss.on(
    "connection",
    (ws: ExtendedWebSocketWithAlive, request: IncomingMessage) => {
      const url = new URL(request.url ?? "", `http://${request.headers.host}`)
      const diagramId = url.searchParams.get("diagramId")
      if (!diagramId || !DIAGRAM_ID_RE.test(diagramId)) {
        ws.close(1008, "Invalid diagramId")
        return
      }
      if (
        !isTrustedOrigin(
          request.headers.origin,
          request.headers.host,
          opts.allowedOrigins ?? []
        )
      ) {
        ws.close(1008, "Untrusted origin")
        return
      }
      ws.isAlive = true
      ws.on("pong", () => {
        ws.isAlive = true
      })
      let access: "pending" | "checking" | "read" | "write" = "pending"
      const accessTimeout = setTimeout(() => {
        ws.close(
          access === "checking" ? 1011 : 1008,
          access === "checking"
            ? "Access verification unavailable"
            : "Access handshake required"
        )
      }, 5000)
      accessTimeout.unref()

      ws.on("message", (raw: WebSocket.RawData) => {
        const message =
          typeof raw === "string"
            ? raw
            : raw instanceof Buffer
              ? raw.toString("utf-8")
              : ""

        // Verification is asynchronous. No queued application frame may
        // reach a room until access is established and acknowledged.
        if (access === "checking") return
        if (access === "pending") {
          let token: string | undefined
          try {
            const parsed = JSON.parse(message) as Record<string, unknown>
            if (
              parsed.kind !== "access" ||
              (parsed.token !== undefined && typeof parsed.token !== "string")
            ) {
              ws.close(1008, "Access handshake required")
              return
            }
            token = parsed.token as string | undefined
          } catch {
            ws.close(1008, "Invalid access handshake")
            return
          }
          access = "checking"
          void (async () => {
            const canWrite =
              token !== undefined &&
              (await verifyWriteToken(token, diagramId, opts.ownerSecret))
            if (
              (token !== undefined && !canWrite) ||
              !(await opts.diagramExists(diagramId))
            ) {
              ws.close(1008, "Invalid write capability or diagram")
              return
            }
            if (ws.readyState !== WebSocket.OPEN) return
            let room = rooms.get(diagramId)
            if (!room) {
              room = new Set()
              rooms.set(diagramId, room)
            }
            if (room.size >= maxSocketsPerRoom) {
              logger.warn(
                { diagramId, size: room.size },
                "ws room over capacity, rejecting connection"
              )
              ws.close(1013, "Try again later")
              return
            }
            room.add(ws)
            ws.diagramId = diagramId
            awarenessClientIdsBySocket.set(ws, new Set())
            getOrCreateAwarenessState(diagramId)
            access = canWrite ? "write" : "read"
            clearTimeout(accessTimeout)
            ws.send(JSON.stringify({ kind: "access", canWrite }))
          })().catch(() => ws.close(1011, "Access verification unavailable"))
          return
        }

        if (access === "read" && message !== READER_FRAME) {
          ws.close(1008, "Reader cannot publish updates")
          return
        }

        try {
          const parsed = JSON.parse(message) as Record<string, unknown>
          if (parsed.kind === "access") {
            ws.close(1008, "Access is already established")
            return
          }

          if (typeof parsed.diagramData === "string") {
            const roomState = roomAwarenessStates.get(diagramId)
            if (roomState) {
              const decoded = Buffer.from(parsed.diagramData, "base64")
              if (decoded.length > 0 && decoded[0] === AWARENESS_MSG_TYPE) {
                const awarenessUpdate = new Uint8Array(decoded.subarray(1))
                applyAwarenessUpdate(roomState.awareness, awarenessUpdate, ws)

                const { present, removed } =
                  decodeAwarenessUpdateClients(awarenessUpdate)
                const socketIds = awarenessClientIdsBySocket.get(ws)
                if (socketIds) {
                  for (const id of present) socketIds.add(id)
                  for (const id of removed) socketIds.delete(id)
                }
              }
            }
          }

          if (parsed.kind === "control") {
            logger.warn(
              {
                diagramId,
                type: (parsed as { control?: { type?: string } }).control?.type,
              },
              "ws control envelope from client dropped"
            )
            return
          }
        } catch {
          // Not JSON — fall through to opaque passthrough.
        }

        broadcast(rooms, diagramId, message, ws)
      })

      ws.on("close", () => {
        clearTimeout(accessTimeout)
        const r = rooms.get(diagramId)
        if (r) {
          r.delete(ws)

          // Broadcast awareness removal for this socket's tracked clients
          const socketIds = awarenessClientIdsBySocket.get(ws)
          if (socketIds && socketIds.size > 0) {
            broadcastAwarenessRemoval(diagramId, ws, Array.from(socketIds))
          }

          if (r.size === 0) {
            rooms.delete(diagramId)
            // Clean up room awareness state when the last socket leaves
            const roomState = roomAwarenessStates.get(diagramId)
            if (roomState) {
              roomState.awareness.destroy()
              roomState.doc.destroy()
              roomAwarenessStates.delete(diagramId)
            }
          }
        }
      })

      ws.on("error", (err: Error) => {
        logger.error({ err, diagramId }, "ws client error")
      })
    }
  )

  const heartbeatInterval = setInterval(() => {
    for (const room of rooms.values()) {
      for (const client of room) {
        const alive = client as ExtendedWebSocketWithAlive
        if (alive.isAlive === false) {
          alive.terminate()
          continue
        }
        alive.isAlive = false
        try {
          alive.ping()
        } catch {
          alive.terminate()
        }
      }
    }
  }, HEARTBEAT_INTERVAL_MS)

  function publishControl(diagramId: string, control: ControlEvent): void {
    const envelope: Envelope = { kind: "control", control }
    const message = JSON.stringify(envelope)
    broadcast(rooms, diagramId, message, null)
    if (control.type === "DIAGRAM_DELETED") {
      for (const client of rooms.get(diagramId) ?? []) client.close(1008)
    }
  }

  async function close(): Promise<void> {
    clearInterval(heartbeatInterval)
    for (const client of wss.clients) {
      try {
        client.close()
      } catch {
        // Ignore.
      }
    }
    for (const state of roomAwarenessStates.values()) {
      state.awareness.destroy()
      state.doc.destroy()
    }
    roomAwarenessStates.clear()
    rooms.clear()
    await new Promise<void>((resolve) => wss.close(() => resolve()))
  }

  logger.info(
    { event: "ws.start", host: opts.host ?? "0.0.0.0", port: opts.port },
    "ws relay started"
  )

  return {
    publishControl,
    close,
    roomCount: () => rooms.size,
  }
}

function broadcast(
  rooms: Map<string, Set<ExtendedWebSocket>>,
  diagramId: string,
  message: string,
  exclude: ExtendedWebSocket | null
): void {
  const room = rooms.get(diagramId)
  if (!room) return
  for (const client of room) {
    if (client === exclude) continue
    if (client.readyState !== WebSocket.OPEN) continue
    try {
      client.send(message)
    } catch (err) {
      logger.error({ err, diagramId }, "ws send failed")
    }
  }
}
