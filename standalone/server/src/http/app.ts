import express, { type Express } from "express"
import pinoHttp from "pino-http"
import type { Config } from "../config"
import type { Redis } from "../redis"
import { logger } from "../logger"
import { requestId } from "./middleware/requestId"
import { configureCors } from "./middleware/cors"
import { ownerReader } from "./middleware/owner"
import { errorHandler } from "./middleware/errors"
import { mountDiagramRoutes } from "../routes/diagrams"
import { mountVersionRoutes } from "../routes/versions"
import { mountConversionRoutes } from "../routes/conversion"
import { mountHealthRoutes } from "../routes/health"
import { mountEmbedRoutes, mountEmbedApiRoutes } from "../routes/embed"
import type { ControlEvent } from "../types"

export interface RelayHook {
  publishControl: (diagramId: string, control: ControlEvent) => void
}

export interface AppDeps {
  config: Config
  redis: Redis
  relay?: RelayHook
  /** When true, pino-http logs every request/response. Default: true. */
  autoLogging?: boolean
}

/**
 * Builds the Express application without calling `listen()`. This is the entry
 * point for both the production server and integration tests (supertest).
 */
export function buildApp(deps: AppDeps): Express {
  const { config, redis, relay, autoLogging = true } = deps

  const app = express()
  app.disable("x-powered-by")

  // Express 5 default JSON body limit is 100 KiB; raise to allow snapshot
  // PUTs up to MAX_SNAPSHOT_BYTES. The API does not accept urlencoded
  // bodies, so no urlencoded parser is mounted.
  app.use(express.json({ limit: config.MAX_SNAPSHOT_BYTES }))

  app.use(requestId())
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({
        requestId: (req as { requestId?: string }).requestId,
      }),
      autoLogging,
    })
  )
  app.use(configureCors(config))
  app.use(ownerReader({ secret: config.OWNER_SECRET }))

  app.use("/health", mountHealthRoutes({ redis }))
  app.use(
    "/api",
    mountDiagramRoutes({ config, redis }, relay),
    mountVersionRoutes({ config, redis }, relay),
    mountConversionRoutes(),
    mountEmbedApiRoutes({ config, redis })
  )
  // /embed/:diagramId — server-rendered HTML page suitable for iframing
  // from third-party hosts (GitLab snippets, Notion, Confluence, …).
  // Mounted at the root, NOT under /api, because the URL is part of the
  // public surface that ends up in `<iframe src=>` attributes.
  app.use("/embed", mountEmbedRoutes({ config, redis }))

  app.use(errorHandler)
  return app
}
