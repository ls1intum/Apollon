import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import { Worker } from "node:worker_threads"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { buildApp } from "../http/app.js"
import { loadConfig } from "../config.js"
import { getRedis } from "./setup.js"

// Drive the COMPILED worker — the real production artifact. Running it in its
// own thread keeps the jsdom globals it installs out of this shared test
// process (vitest runs with isolate:false), and exercises the path that broke:
// apollon SSR → pdfmake (which renders the SVG via its bundled svg-to-pdfkit).
// Needs a prior server build; CI builds before the test runs.
const workerPath = path.resolve(
  import.meta.dirname,
  "../../dist/src/workers/pdf-conversion-worker-thread.js"
)
// Real class-diagram fixture (v4); rendering it needs the Roboto faces the
// 0.2.x VFS mis-use left unregistered.
const fixturePath = path.resolve(
  import.meta.dirname,
  "../../../webapp/tests/fixtures/class-diagram.json"
)

type WorkerResult =
  | { id: number; ok: true; pdf: Uint8Array }
  | { id: number; ok: false; error: string }

function renderViaWorker(model: unknown): Promise<WorkerResult> {
  const worker = new Worker(workerPath)
  return new Promise<WorkerResult>((resolve, reject) => {
    worker.once("message", resolve)
    worker.once("error", reject)
    worker.postMessage({ id: 1, model })
  }).finally(() => void worker.terminate())
}

function expectPdf(bytes: Uint8Array) {
  expect(bytes.length).toBeGreaterThan(0)
  // %PDF magic bytes prove a real document, not a silent render failure.
  expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-")
}

describe("pdf conversion worker", () => {
  it("renders a UML model to a valid PDF (regression: pdfmake 0.3.x API)", async () => {
    expect(
      existsSync(workerPath),
      `built worker missing at ${workerPath} — run \`pnpm --filter @tumaet/server build\` first`
    ).toBe(true)

    const model = JSON.parse(readFileSync(fixturePath, "utf8"))
    const result = await renderViaWorker(model)

    // The 0.2.x API mis-use posted { ok: false }; surface its stack on failure.
    if (!result.ok) throw new Error(result.error)
    expectPdf(result.pdf)
  })
})

describe("POST /api/converter/pdf", () => {
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

  it("returns a PDF for a valid model", async () => {
    const model = JSON.parse(readFileSync(fixturePath, "utf8"))
    const res = await request(app)
      .post("/api/converter/pdf")
      .send({ model })
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = []
        res.on("data", (c: Buffer) => chunks.push(Buffer.from(c)))
        res.on("end", () => cb(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/application\/pdf/)
    expectPdf(res.body)
  })
})
