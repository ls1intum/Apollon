import WebSocket, { WebSocketServer } from "ws"
import type { IncomingMessage } from "http"
import { URL } from "url"
import { logger } from "./logger"
import type { ControlEvent, Envelope } from "./types"

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
export function startRelayServer(opts: StartOptions): RelayServer {
  const wss = new WebSocketServer({ port: opts.port, host: opts.host })
  const rooms: Map<string, Set<ExtendedWebSocket>> = new Map()

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

    ws.on("message", (raw: WebSocket.RawData) => {
      const message =
        typeof raw === "string"
          ? raw
          : raw instanceof Buffer
            ? raw.toString("utf-8")
            : ""

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
        if (r.size === 0) rooms.delete(diagramId)
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
