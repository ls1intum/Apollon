import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import { Worker } from "node:worker_threads"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { buildApp } from "../http/app.js"
import { loadConfig } from "../config.js"
import { getRedis } from "./setup.js"
import {
  ConversionResource,
  QueueFullError,
} from "../resources/conversion-resource.js"

// Drive the COMPILED worker — the real production artifact. Running it in its
// own thread keeps the jsdom globals it installs out of this shared test
// process (vitest runs with isolate:false). Needs a prior server build; CI
// builds before the test runs.
const workerPath = path.resolve(
  import.meta.dirname,
  "../../dist/src/workers/conversion-worker-thread.js"
)
const fixturePath = path.resolve(
  import.meta.dirname,
  "../../../webapp/tests/fixtures/class-diagram.json"
)
const loadModel = () => JSON.parse(readFileSync(fixturePath, "utf8"))

type WorkerResult =
  | { id: number; ok: true; mime: string; data: string | Uint8Array }
  | { id: number; ok: false; error: string }

function renderViaWorker(
  model: unknown,
  format: "svg" | "png" | "pdf"
): Promise<WorkerResult> {
  const worker = new Worker(workerPath)
  return new Promise<WorkerResult>((resolve, reject) => {
    worker.once("message", resolve)
    worker.once("error", reject)
    worker.postMessage({ id: 1, model, format })
  }).finally(() => void worker.terminate())
}

const isPdf = (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-"
const isPng = (b: Buffer) =>
  b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

const asBuffer = (res: request.Response) => res.body as Buffer
const collectBinary = (
  res: request.Response,
  cb: (e: null, b: Buffer) => void
) => {
  const chunks: Buffer[] = []
  res.on("data", (c: Buffer) => chunks.push(Buffer.from(c)))
  res.on("end", () => cb(null, Buffer.concat(chunks)))
}

describe("conversion worker", () => {
  it("has a compiled artifact to drive", () => {
    expect(
      existsSync(workerPath),
      `built worker missing at ${workerPath} — run \`pnpm --filter @tumaet/server build\` first`
    ).toBe(true)
  })

  it("renders a model to svg, png and pdf", async () => {
    const model = loadModel()

    const svg = await renderViaWorker(model, "svg")
    if (!svg.ok) throw new Error(svg.error)
    expect(svg.mime).toBe("image/svg+xml")
    expect(String(svg.data)).toContain('xmlns="http://www.w3.org/2000/svg"')

    const png = await renderViaWorker(model, "png")
    if (!png.ok) throw new Error(png.error)
    expect(png.mime).toBe("image/png")
    expect(isPng(Buffer.from(png.data as Uint8Array))).toBe(true)

    const pdf = await renderViaWorker(model, "pdf")
    if (!pdf.ok) throw new Error(pdf.error)
    expect(pdf.mime).toBe("application/pdf")
    expect(isPdf(Buffer.from(pdf.data as Uint8Array))).toBe(true)
  })
})

describe("POST /api/converter", () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    // The resource resolves the worker from its own dir, which under vitest is
    // src/ (no built .js); point it at the dist artifact instead.
    process.env.CONVERTER_WORKER_PATH = workerPath
    const redis = await getRedis()
    app = buildApp({ config: loadConfig(), redis, autoLogging: false })
  })
  afterAll(() => {
    delete process.env.CONVERTER_WORKER_PATH
  })

  it("returns svg for a valid model", async () => {
    const res = await request(app)
      .post("/api/converter/svg")
      .send({ model: loadModel() })
      .buffer(true)
      .parse(collectBinary)
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/image\/svg\+xml/)
    expect(asBuffer(res).toString("utf8")).toContain(
      'xmlns="http://www.w3.org/2000/svg"'
    )
  })

  it("returns png for a valid model", async () => {
    const res = await request(app)
      .post("/api/converter/png")
      .send({ model: loadModel() })
      .buffer(true)
      .parse(collectBinary)
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/image\/png/)
    expect(isPng(asBuffer(res))).toBe(true)
  })

  it("returns pdf for a valid model", async () => {
    const res = await request(app)
      .post("/api/converter/pdf")
      .send({ model: loadModel() })
      .buffer(true)
      .parse(collectBinary)
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/application\/pdf/)
    expect(isPdf(asBuffer(res))).toBe(true)
  })

  it("rejects a request without a model", async () => {
    const res = await request(app)
      .post("/api/converter/svg")
      .send({ model: null })
    expect(res.status).toBe(400)
  })

  it("rejects a malformed stringified model with 400, not 500", async () => {
    const res = await request(app)
      .post("/api/converter/svg")
      .send({ model: "{ not valid json" })
    expect(res.status).toBe(400)
  })

  it("maps a full queue to a typed 503 RENDERER_BUSY with Retry-After", async () => {
    const busy = {
      render: () =>
        Promise.reject(new QueueFullError("Conversion queue is full")),
    } as unknown as ConversionResource
    const redis = await getRedis()
    const busyApp = buildApp({
      config: loadConfig(),
      redis,
      autoLogging: false,
      conversionResource: busy,
    })
    const res = await request(busyApp)
      .post("/api/converter/svg")
      .send({ model: loadModel() })
    expect(res.status).toBe(503)
    expect(res.body.error).toBe("RENDERER_BUSY")
    expect(res.headers["retry-after"]).toBe("2")
    expect(res.headers["cache-control"]).toBe("no-store")
  })
})
