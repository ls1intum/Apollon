import { Router } from "express"
import { ConversionResource } from "../resources/conversion-resource.js"

export function mountConversionRoutes(): Router {
  const router = Router()
  // Constructed lazily on first request so dev tooling (tsx watch) doesn't
  // spin up a worker thread for unrelated requests.
  let resource: ConversionResource | null = null

  router.get("/converter/status", (_req, res) => {
    res.sendStatus(200)
  })

  router.post("/converter/pdf", async (req, res) => {
    resource ??= new ConversionResource()
    await resource.convert(req, res)
  })

  return router
}
