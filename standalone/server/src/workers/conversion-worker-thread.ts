/**
 * Worker thread that converts an Apollon UMLModel to PDF or sanitised
 * SVG. The worker is intentionally thin — the render logic lives in
 * `services/conversion-renderer.ts` so it can be unit-tested without
 * spawning a `worker_threads` process.
 *
 * # Modes
 *
 *   - `pdf` → `renderPdf(model)` → `{ ok: true, type: "pdf", bytes }`
 *   - `svg` → `renderSvgSafe(model)` → `{ ok: true, type: "svg",
 *                                         svg, clip }`
 *
 * # Why a worker thread at all?
 *
 *   - JSDOM bootstrap + Apollon-library load hold several hundred MB
 *     of resident memory. Hosting them in a worker lets the resource
 *     layer enforce a strict heap cap and auto-restart on crash
 *     without recycling the whole Express process.
 *   - The HTTP layer can keep accepting requests while a slow render
 *     runs.
 */
import "global-jsdom/register"
import { parentPort } from "node:worker_threads"
import type { UMLModel } from "@tumaet/apollon"
import { renderPdf, renderSvgSafe } from "../services/conversion-renderer"

type WorkerRequest =
  | { id: number; mode: "pdf"; model: UMLModel }
  | { id: number; mode: "svg"; model: UMLModel }

type WorkerResponse =
  | { id: number; ok: true; type: "pdf"; bytes: Uint8Array }
  | {
      id: number
      ok: true
      type: "svg"
      svg: string
      clip: { x: number; y: number; width: number; height: number }
    }
  | { id: number; ok: false; error: string }

parentPort?.on("message", async (message: WorkerRequest) => {
  let response: WorkerResponse
  try {
    if (message.mode === "pdf") {
      const bytes = await renderPdf(message.model)
      response = { id: message.id, ok: true, type: "pdf", bytes }
    } else {
      const { svg, clip } = await renderSvgSafe(message.model)
      response = { id: message.id, ok: true, type: "svg", svg, clip }
    }
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
