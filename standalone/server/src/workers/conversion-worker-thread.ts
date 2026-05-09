/**
 * Worker thread that converts an Apollon UMLModel to a PDF. The worker is
 * intentionally thin — the render logic lives in
 * `services/conversion-renderer.ts` so it can be unit-tested without
 * spawning a `worker_threads` process.
 *
 * Why a worker thread at all?
 *  - JSDOM bootstrap + Apollon-library load hold several hundred MB of
 *    resident memory. Hosting them in a worker lets the resource layer
 *    enforce a strict heap cap and auto-restart on crash without recycling
 *    the whole Express process.
 *  - The HTTP layer can keep accepting requests while a slow render runs.
 */
import "global-jsdom/register"
import { parentPort } from "node:worker_threads"
import type { UMLModel } from "@tumaet/apollon"
import { renderPdf } from "../services/conversion-renderer"

type WorkerRequest = {
  id: number
  model: UMLModel
}

type WorkerResponse =
  | { id: number; ok: true; bytes: Uint8Array }
  | { id: number; ok: false; error: string }

parentPort?.on("message", async (message: WorkerRequest) => {
  let response: WorkerResponse
  try {
    const bytes = await renderPdf(message.model)
    response = { id: message.id, ok: true, bytes }
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
