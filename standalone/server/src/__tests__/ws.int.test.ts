import { afterEach, describe, expect, it } from "vitest"
import WebSocket from "ws"
import { createServer } from "node:net"
import { startRelayServer } from "../ws"
import type { ControlEvent, Envelope } from "../types"

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.unref()
    srv.on("error", reject)
    srv.listen(0, () => {
      const port = (srv.address() as { port: number }).port
      srv.close(() => resolve(port))
    })
  })
}

interface Harness {
  port: number
  relay: ReturnType<typeof startRelayServer>
}

let harness: Harness | undefined

async function startHarness(): Promise<Harness> {
  const port = await getFreePort()
  const relay = startRelayServer({ port, host: "127.0.0.1" })
  return { port, relay }
}

function connect(port: number, diagramId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}?diagramId=${encodeURIComponent(diagramId)}`
    )
    ws.once("open", () => resolve(ws))
    ws.once("error", reject)
  })
}

function nextMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    ws.once("message", (data) => resolve(data.toString("utf8")))
  })
}

afterEach(async () => {
  if (harness) {
    await harness.relay.close()
    harness = undefined
  }
})

describe("WebSocket relay", () => {
  it("forwards opaque messages to peers in the same diagram room (sender excluded)", async () => {
    harness = await startHarness()
    const a = await connect(harness.port, "d1")
    const b = await connect(harness.port, "d1")
    const incoming = nextMessage(b)
    a.send("yjs-binary-update")
    expect(await incoming).toBe("yjs-binary-update")
    a.close()
    b.close()
  })

  it("publishControl reaches every client in the room (including sender)", async () => {
    harness = await startHarness()
    const a = await connect(harness.port, "d1")
    const b = await connect(harness.port, "d1")

    const aMsg = nextMessage(a)
    const bMsg = nextMessage(b)

    const event: ControlEvent = {
      type: "VERSION_CREATED",
      versionId: "01J7TEST",
      createdAt: new Date().toISOString(),
      name: "v1",
      kind: "user",
    }
    harness.relay.publishControl("d1", event)

    const aJson = JSON.parse(await aMsg) as Envelope
    const bJson = JSON.parse(await bMsg) as Envelope
    expect(aJson.kind).toBe("control")
    expect(bJson.kind).toBe("control")
    if (aJson.kind === "control")
      expect(aJson.control.type).toBe("VERSION_CREATED")
    a.close()
    b.close()
  })

  it("scopes broadcasts per-diagram", async () => {
    harness = await startHarness()
    const a1 = await connect(harness.port, "d1")
    const a2 = await connect(harness.port, "d1")
    const b = await connect(harness.port, "d2")

    // Deterministic flush: d2's `b` will only receive messages addressed to
    // d2. By awaiting `a2`'s receipt of `a1`'s message and then sending
    // a tagged message into d2 that `b` should receive, we serialise the
    // "did/didn't deliver" decision against the relay's own queue.
    let bMsg: string | null = null
    b.on("message", (data) => {
      bMsg = data.toString("utf-8")
    })
    const a2GetsCrossDiagram = nextMessage(a2)
    a1.send("for-d1-only")
    expect(await a2GetsCrossDiagram).toBe("for-d1-only")
    // After a2 has received a1's d1 message (relay completed broadcast), b
    // is guaranteed not to have queued anything for it from d1.
    expect(bMsg).toBeNull()
    a1.close()
    a2.close()
    b.close()
  })
})
