import { Router } from "express"
import type { ConversionResource } from "../resources/conversion-resource"

interface Deps {
  /**
   * Lazy provider for the `ConversionResource`. Returning the same
   * instance on every call gives the conversion + embed routes a
   * single shared worker pool; lazy construction keeps tests that
   * never hit `/api/converter/pdf` from spawning a worker thread.
   */
  getResource: () => ConversionResource
}

export function mountConversionRoutes({ getResource }: Deps): Router {
  const router = Router()

  router.get("/converter/status", (_req, res) => {
    res.sendStatus(200)
  })

  router.post("/converter/pdf", async (req, res, next) => {
    try {
      await getResource().convert(req, res)
    } catch (err) {
      next(err)
    }
  })

  return router
}
