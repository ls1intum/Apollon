import WebSocket, { WebSocketServer } from "ws"
import type { IncomingMessage } from "http"
import { URL } from "url"
import { logger } from "./logger"
import type { ControlEvent, Envelope } from "./types"
import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness"
import * as Y from "yjs"
import * as decoding from "lib0/decoding"

const AWARENESS_MSG_TYPE = 3

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
}

const ENVELOPE_PREFIX = '{"kind":'

/**
 * Starts the WebSocket relay. The relay forwards opaque payloads (Yjs binary
 * updates over base64) byte-for-byte to peers in the same diagram room, AND
 * accepts typed control envelopes. Control envelopes are validated, scope-
 * checked, and broadcast to all clients in the room INCLUDING the sender —
 * this gives a single convergence path for version events; clients dedupe
 * by versionId.
 */
// Cap on a single WS frame the relay will accept and forward. Yjs updates
// for Apollon-sized diagrams are well under this; the cap exists so a URL
// bearer can't fan-out megabyte-scale payloads to every peer in the room.
const MAX_PAYLOAD_BYTES = 1_048_576 // 1 MiB

export function startRelayServer(opts: StartOptions): RelayServer {
  const wss = new WebSocketServer({
    port: opts.port,
    host: opts.host,
    maxPayload: MAX_PAYLOAD_BYTES,
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

    removeAwarenessStates(
      roomState.awareness,
      removedClientIds,
      disconnectedSocket
    )

    const awarenessUpdate = encodeAwarenessUpdate(
      roomState.awareness,
      removedClientIds
    )
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

  wss.on("connection", (ws: ExtendedWebSocket, request: IncomingMessage) => {
    const url = new URL(request.url ?? "", `http://${request.headers.host}`)
    const diagramId = url.searchParams.get("diagramId")
    if (!diagramId) {
      ws.close(1008, "Missing diagramId")
      return
    }
    let room = rooms.get(diagramId)
    if (!room) {
      room = new Set()
      rooms.set(diagramId, room)
    }
    room.add(ws)
    ws.diagramId = diagramId
    awarenessClientIdsBySocket.set(ws, new Set())
    getOrCreateAwarenessState(diagramId)

    ws.on("message", (raw: WebSocket.RawData) => {
      const message =
        typeof raw === "string"
          ? raw
          : raw instanceof Buffer
            ? raw.toString("utf-8")
            : ""

      // Track awareness updates server-side so we can broadcast removal
      // when a socket disconnects. Awareness messages arrive as
      // { diagramData: "<base64>" } with the first decoded byte == 3.
      try {
        const parsed = JSON.parse(message) as { diagramData?: string }
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
      } catch {
        // Not JSON or not an awareness message — fall through.
      }

      // Drop client-published control envelopes. Only server-side route
      // handlers emit `VERSION_*` / `DIAGRAM_DELETED` via `publishControl`
      // — the relay never forwards a control envelope it received from a
      // client. Without this gate, a URL bearer could forge events that
      // never happened (delete a version client-side, rename it, etc.)
      // and the rest of the room would mutate local state to match.
      // Surface as a warning so an attacker probing the relay shows up
      // in logs.
      if (message.startsWith(ENVELOPE_PREFIX)) {
        try {
          const parsed = JSON.parse(message) as Envelope
          if (parsed && parsed.kind === "control") {
            logger.warn(
              { diagramId, type: parsed.control?.type },
              "ws control envelope from client dropped"
            )
            return
          }
        } catch {
          // Not JSON — fall through to opaque passthrough.
        }
      }

      // Opaque passthrough — preserves Yjs sync semantics. Sender is
      // excluded; peers already saw the sender's local changes.
      broadcast(rooms, diagramId, message, ws)
    })

    ws.on("close", () => {
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
  })

  function publishControl(diagramId: string, control: ControlEvent): void {
    const envelope: Envelope = { kind: "control", control }
    const message = JSON.stringify(envelope)
    broadcast(rooms, diagramId, message, null)
  }

  async function close(): Promise<void> {
    for (const room of rooms.values()) {
      for (const client of room) {
        try {
          client.close()
        } catch {
          // Ignore.
        }
      }
    }
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
