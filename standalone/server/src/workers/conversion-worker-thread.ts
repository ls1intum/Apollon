/**
 * Worker thread that dispatches an Apollon UMLModel through the appropriate
 * server-side renderer. The worker is intentionally thin — render logic
 * lives in `services/conversion-renderer.ts` so it can be unit-tested
 * without spawning `worker_threads`.
 *
 * Why a worker thread at all?
 *  - JSDOM bootstrap + Apollon-library load + resvg native binding hold
 *    several hundred MB of resident memory. Hosting them in a worker lets
 *    the resource layer enforce a strict heap cap and auto-restart on
 *    crash without recycling the whole Express process.
 *  - The HTTP layer can keep accepting requests while a slow render runs.
 */
import "global-jsdom/register"
import { parentPort } from "node:worker_threads"
import type { UMLModel } from "@tumaet/apollon"
import { renderPng, renderPdf } from "../services/conversion-renderer"

export type ConversionFormat = "png" | "pdf"

type WorkerRequest = {
  id: number
  format: ConversionFormat
  model: UMLModel
}

type WorkerResponse =
  | { id: number; ok: true; format: ConversionFormat; bytes: Uint8Array }
  | { id: number; ok: false; error: string }

parentPort?.on("message", async (message: WorkerRequest) => {
  let response: WorkerResponse
  try {
    const bytes =
      message.format === "png"
        ? await renderPng(message.model)
        : await renderPdf(message.model)
    response = { id: message.id, ok: true, format: message.format, bytes }
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
