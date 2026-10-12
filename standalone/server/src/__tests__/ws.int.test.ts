import { afterEach, describe, expect, it, vi } from "vitest"
import WebSocket from "ws"
import { createServer } from "node:net"
import { startRelayServer } from "../ws.js"
import type { ControlEvent, Envelope } from "../types.js"
import { createWriteToken } from "../http/middleware/access.js"

const secret = "test-secret-test-secret-test-secret"

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

async function startHarness(
  options: {
    maxSocketsPerRoom?: number
    diagramExists?: (id: string) => Promise<boolean>
  } = {}
): Promise<Harness> {
  const port = await getFreePort()
  const relay = startRelayServer({
    port,
    host: "127.0.0.1",
    ownerSecret: secret,
    diagramExists: options.diagramExists ?? (async () => true),
    maxSocketsPerRoom: options.maxSocketsPerRoom,
  })
  return { port, relay }
}

async function connect(
  port: number,
  diagramId: string,
  write = true
): Promise<WebSocket> {
  const token = write ? await createWriteToken(diagramId, secret) : undefined
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}?diagramId=${encodeURIComponent(diagramId)}`
    )
    ws.once("open", () => ws.send(JSON.stringify({ kind: "access", token })))
    ws.once("message", (raw) => {
      expect(JSON.parse(raw.toString())).toEqual({
        kind: "access",
        canWrite: write,
      })
      resolve(ws)
    })
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
  it("keeps a stalled access check retryable", async () => {
    let entered!: () => void
    let release!: () => void
    const checking = new Promise<void>((resolve) => {
      entered = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    harness = await startHarness({
      diagramExists: async () => {
        entered()
        await gate
        return true
      },
    })
    vi.useFakeTimers({ toFake: ["setTimeout"] })
    try {
      const ws = new WebSocket(`ws://127.0.0.1:${harness.port}?diagramId=d1`)
      ws.once("open", () => ws.send(JSON.stringify({ kind: "access" })))
      await checking
      const closed = new Promise<number>((resolve) => ws.once("close", resolve))
      vi.advanceTimersByTime(5000)
      expect(await closed).toBe(1011)
      expect(harness.relay.roomCount()).toBe(0)
    } finally {
      release()
      vi.useRealTimers()
    }
  })

  it("uses a retryable close when storage fails, then accepts a reconnect", async () => {
    let calls = 0
    harness = await startHarness({
      diagramExists: async () => {
        if (calls++ === 0) throw new Error("Redis unavailable")
        return true
      },
    })
    const first = new WebSocket(`ws://127.0.0.1:${harness.port}?diagramId=d1`)
    first.once("open", () => first.send(JSON.stringify({ kind: "access" })))
    const closed = await new Promise<number>((resolve) =>
      first.once("close", resolve)
    )
    expect(closed).toBe(1011)
    const retry = await connect(harness.port, "d1", false)
    expect(retry.readyState).toBe(WebSocket.OPEN)
  })

  it("lets readers request sync without publishing state", async () => {
    harness = await startHarness()
    const writer = await connect(harness.port, "d1")
    const reader = await connect(harness.port, "d1", false)
    for (const diagramData of ["AA==", "Ag=="]) {
      const incoming = nextMessage(writer)
      const message = JSON.stringify({ diagramData })
      reader.send(message)
      expect(await incoming).toBe(message)
    }
  })

  it.each([
    ["document update", JSON.stringify({ diagramData: "AQ==" })],
    ["awareness update", JSON.stringify({ diagramData: "Aw==" })],
    ["sync with payload", JSON.stringify({ diagramData: "AAE=" })],
    ["opaque frame", "untrusted-update"],
    ["control frame", JSON.stringify({ kind: "control", control: {} })],
  ])("rejects reader %s frames before relay", async (_name, frame) => {
    harness = await startHarness()
    const writer = await connect(harness.port, "d1")
    const reader = await connect(harness.port, "d1", false)
    const received = vi.fn()
    writer.on("message", received)
    const closed = new Promise<number>((resolve) =>
      reader.once("close", resolve)
    )
    reader.send(frame)
    expect(await closed).toBe(1008)
    expect(received).not.toHaveBeenCalled()
  })

  it.each(["forged", "wrong diagram"])(
    "rejects %s access without joining a room",
    async (kind) => {
      harness = await startHarness()
      const token =
        kind === "forged" ? "invalid" : await createWriteToken("d2", secret)
      const ws = new WebSocket(`ws://127.0.0.1:${harness.port}?diagramId=d1`)
      ws.once("open", () => ws.send(JSON.stringify({ kind: "access", token })))
      const code = await new Promise<number>((resolve) =>
        ws.once("close", resolve)
      )
      expect(code).toBe(1008)
      expect(harness.relay.roomCount()).toBe(0)
    }
  )

  it("drops application frames queued while access is being verified", async () => {
    let checking = false
    let release!: () => void
    let entered!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const checkingStarted = new Promise<void>((resolve) => {
      entered = resolve
    })
    harness = await startHarness({
      diagramExists: async () => {
        if (checking) {
          entered()
          await gate
        }
        return true
      },
    })
    const writer = await connect(harness.port, "d1")
    const received = vi.fn()
    writer.on("message", received)
    checking = true
    const ws = new WebSocket(`ws://127.0.0.1:${harness.port}?diagramId=d1`)
    ws.once("open", () => ws.send(JSON.stringify({ kind: "access" })))
    await checkingStarted
    ws.send(JSON.stringify({ diagramData: "AQ==" }))
    await new Promise<void>((resolve) => {
      ws.once("pong", () => resolve())
      ws.ping()
    })
    const acknowledged = nextMessage(ws)
    release()
    expect(JSON.parse(await acknowledged)).toEqual({
      kind: "access",
      canWrite: false,
    })
    expect(received).not.toHaveBeenCalled()
  })

  it("rejects foreign browser origins and missing diagrams", async () => {
    harness = await startHarness({ diagramExists: async () => false })
    const foreign = new WebSocket(
      `ws://127.0.0.1:${harness.port}?diagramId=d1`,
      {
        headers: { Origin: "https://attacker.example" },
      }
    )
    expect(
      await new Promise<number>((resolve) => foreign.once("close", resolve))
    ).toBe(1008)
    const missing = new WebSocket(`ws://127.0.0.1:${harness.port}?diagramId=d1`)
    missing.once("open", () => missing.send(JSON.stringify({ kind: "access" })))
    expect(
      await new Promise<number>((resolve) => missing.once("close", resolve))
    ).toBe(1008)
    expect(harness.relay.roomCount()).toBe(0)
  })

  it("rejects connections with invalid diagramId characters", async () => {
    harness = await startHarness()
    const ws = new WebSocket(
      `ws://127.0.0.1:${harness.port}?diagramId=${encodeURIComponent("../etc/passwd")}`
    )
    const code = await new Promise<number>((resolve) => {
      ws.on("close", (c) => resolve(c))
    })
    expect(code).toBe(1008)
  })

  it("rejects connections with overly long diagramId", async () => {
    harness = await startHarness()
    const longId = "a".repeat(65)
    const ws = new WebSocket(
      `ws://127.0.0.1:${harness.port}?diagramId=${longId}`
    )
    const code = await new Promise<number>((resolve) => {
      ws.on("close", (c) => resolve(c))
    })
    expect(code).toBe(1008)
  })

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

  it("rejects the (cap+1)th socket per room with code 1013 (try again later)", async () => {
    const cap = 4
    harness = await startHarness({ maxSocketsPerRoom: cap })
    const accepted: WebSocket[] = []
    try {
      for (let i = 0; i < cap; i++) {
        accepted.push(await connect(harness.port, "cap-room"))
      }
      const overflow = new WebSocket(
        `ws://127.0.0.1:${harness.port}?diagramId=cap-room`
      )
      overflow.once("open", () =>
        overflow.send(JSON.stringify({ kind: "access" }))
      )
      const code = await new Promise<number>((resolve) => {
        overflow.on("close", (c) => resolve(c))
      })
      expect(code).toBe(1013)
    } finally {
      await Promise.all(
        accepted.map(
          (ws) =>
            new Promise<void>((resolve) => {
              if (ws.readyState === WebSocket.CLOSED) return resolve()
              ws.once("close", () => resolve())
              ws.close()
            })
        )
      )
    }
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
