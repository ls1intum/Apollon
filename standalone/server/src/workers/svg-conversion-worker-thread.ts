// Side-effect import: installs jsdom + the Inter font registration + browser-API
// shims before any code that touches `window`, `document`, or the apollon
// library. Runs in its own worker thread so those globals never leak into the
// main process (the shared, non-isolated server test pool relies on this).
import "./jsdom-shims.js"
import { parentPort } from "node:worker_threads"
import type { UMLModel, SVG } from "@tumaet/apollon"
import { ConversionService } from "../services/conversion-service.js"

type WorkerRequest = { id: number; model: UMLModel }
type WorkerResponse =
  | ({ id: number; ok: true } & SVG)
  | { id: number; ok: false; error: string }

parentPort?.on("message", async (message: WorkerRequest) => {
  let response: WorkerResponse
  try {
    const { svg, clip } = await new ConversionService().convertToSvg(
      message.model
    )
    response = { id: message.id, ok: true, svg, clip }
  } catch (error) {
    response = {
      id: message.id,
      ok: false,
      error:
        error instanceof Error ? error.stack || error.message : String(error),
    }
  }
  parentPort?.postMessage(response)
})
