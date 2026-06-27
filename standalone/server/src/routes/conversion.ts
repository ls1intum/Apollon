import { Hono, type Context } from "hono"
import type { UMLModel } from "@tumaet/apollon"
import type { AppEnv } from "../http/env.js"
import {
  ConversionResource,
  QueueFullError,
} from "../resources/conversion-resource.js"
import { Errors } from "../http/errors.js"
import type { ConversionFormat } from "../workers/conversion-worker-thread.js"

interface Deps {
  /**
   * Lazy provider for the shared `ConversionResource`. Returning the same
   * instance on every call gives the converter + embed routes one worker
   * thread and one render queue; lazy construction keeps suites that never
   * render from spawning the worker.
   */
  getResource: () => ConversionResource
}

function parseModel(body: unknown): UMLModel | undefined {
  const raw =
    body && typeof body === "object" && "model" in body
      ? (body as { model: unknown }).model
      : body
  if (typeof raw === "string") {
    // A stringified model — return undefined (→ 400) on malformed JSON rather
    // than letting the SyntaxError surface as a 500.
    try {
      return JSON.parse(raw) as UMLModel
    } catch {
      return undefined
    }
  }
  if (raw && typeof raw === "object") return raw as UMLModel
  return undefined
}

export function mountConversionRoutes({ getResource }: Deps): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  const convert =
    (format: ConversionFormat) => async (c: Context<AppEnv>) => {
      let body: unknown
      try {
        body = await c.req.json()
      } catch {
        body = undefined
      }
      const model = parseModel(body)
      if (!model) {
        return c.json({ error: "Model must be defined!" }, 400)
      }

      const scale =
        format === "png"
          ? Number(c.req.query("scale") ?? (body as { scale?: number })?.scale)
          : undefined

      try {
        const { mime, data } = await getResource().render(format, model, scale)
        c.header("content-type", mime)
        // The worker hands back a Node `Buffer` (a `Uint8Array`) or a string;
        // both are valid Response bodies at runtime, but Hono's `c.body` Data
        // type wants `Uint8Array<ArrayBuffer>`, so widen the Buffer's nominal
        // buffer type without copying.
        const out =
          typeof data === "string"
            ? data
            : (data as Uint8Array<ArrayBuffer>)
        return c.body(out, 200)
      } catch (error) {
        // Queue saturation is transient — surface it as a typed 503 (with a
        // Retry-After header) through the shared error handler.
        if (error instanceof QueueFullError) throw Errors.rendererBusy()
        throw error
      }
    }

  router.get("/converter/status", (c) => c.text("OK", 200))
  router.post("/converter/svg", convert("svg"))
  router.post("/converter/png", convert("png"))
  router.post("/converter/pdf", convert("pdf"))

  return router
}
