import { Router, type Request, type Response } from "express"
import type { UMLModel } from "@tumaet/apollon"
import {
  ConversionResource,
  QueueFullError,
} from "../resources/conversion-resource.js"
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

export function mountConversionRoutes({ getResource }: Deps): Router {
  const router = Router()

  const convert =
    (format: ConversionFormat) => async (req: Request, res: Response) => {
      const model = parseModel(req.body)
      if (!model) {
        res.status(400).json({ error: "Model must be defined!" })
        return
      }

      const scale =
        format === "png"
          ? Number(req.query.scale ?? (req.body as { scale?: number })?.scale)
          : undefined

      try {
        const { mime, data } = await getResource().render(format, model, scale)
        res.type(mime).status(200).send(data)
      } catch (error) {
        if (error instanceof QueueFullError) {
          res.status(503).json({ error: error.message })
          return
        }
        throw error
      }
    }

  router.get("/converter/status", (_req, res) => res.sendStatus(200))
  router.post("/converter/svg", convert("svg"))
  router.post("/converter/png", convert("png"))
  router.post("/converter/pdf", convert("pdf"))

  return router
}
