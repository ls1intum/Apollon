import { Router, type Request, type Response } from "express"
import type { UMLModel } from "@tumaet/apollon"
import {
  ConversionResource,
  QueueFullError,
} from "../resources/conversion-resource.js"
import type { ConversionFormat } from "../workers/conversion-worker-thread.js"

function parseModel(body: unknown): UMLModel | undefined {
  const raw =
    body && typeof body === "object" && "model" in body
      ? (body as { model: unknown }).model
      : body
  if (typeof raw === "string") return JSON.parse(raw) as UMLModel
  if (raw && typeof raw === "object") return raw as UMLModel
  return undefined
}

export function mountConversionRoutes(): Router {
  const router = Router()
  // Constructed lazily on first request so dev tooling (tsx watch) doesn't spin
  // up a worker thread for unrelated requests.
  let resource: ConversionResource | null = null

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

      resource ??= new ConversionResource()
      try {
        const { mime, data } = await resource.render(format, model, scale)
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
