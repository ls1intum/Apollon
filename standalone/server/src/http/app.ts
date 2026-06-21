import express, { type Express } from "express"
import { pinoHttp } from "pino-http"
import type { Config } from "../config.js"
import type { Redis } from "../redis.js"
import { logger } from "../logger.js"
import { requestId } from "./middleware/requestId.js"
import { configureCors } from "./middleware/cors.js"
import { ownerReader } from "./middleware/owner.js"
import { errorHandler } from "./middleware/errors.js"
import { mountDiagramRoutes } from "../routes/diagrams.js"
import { mountVersionRoutes } from "../routes/versions.js"
import { mountConversionRoutes } from "../routes/conversion.js"
import { mountHealthRoutes } from "../routes/health.js"
import { mountEmbedApiRoutes, mountEmbedRoutes } from "../routes/embed.js"
import { ConversionResource } from "../resources/conversion-resource.js"
import { SvgPreviewCache } from "../services/svg-preview-cache.js"
import type { ControlEvent } from "../types.js"

export interface RelayHook {
  publishControl: (diagramId: string, control: ControlEvent) => void
}

export interface AppDeps {
  config: Config
  redis: Redis
  relay?: RelayHook
  /** When true, pino-http logs every request/response. Default: true. */
  autoLogging?: boolean
  /**
   * Override the conversion resource. Production omits this and the app lazily
   * constructs ONE shared instance on first render request. Tests inject a fake
   * so they don't spawn the worker thread.
   */
  conversionResource?: ConversionResource
}

/**
 * Builds the Express application without calling `listen()`. This is the entry
 * point for both the production server and integration tests (supertest).
 *
 * The `/api/converter/*` download surface and the embed surfaces
 * (`/api/diagrams/:id/preview.svg`, `/embed/:id`) share ONE
 * `ConversionResource` — one worker thread, one render queue — constructed
 * lazily on first use so suites that never render don't spawn it.
 */
export function buildApp(deps: AppDeps): Express {
  const { config, redis, relay, autoLogging = true, conversionResource } = deps

  const app = express()
  app.disable("x-powered-by")

  // `req.protocol` honours `X-Forwarded-Proto` only when `trust proxy` is set.
  // Without it the embed page emits an `http://` "Open in Apollon" link from
  // inside an HTTPS-served iframe and browsers block the click as mixed
  // content. `1` matches the single-reverse-proxy production topology.
  app.set("trust proxy", 1)

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

  // Lazily construct the shared ConversionResource. Only routes that render
  // (converter, embed) ever call this; a test that injects its own resource or
  // never renders skips worker-thread creation entirely.
  let resource: ConversionResource | undefined = conversionResource
  const getResource = (): ConversionResource =>
    (resource ??= new ConversionResource())

  // One render cache + single-flight shared by both embed routes, so a
  // preview.svg hit warms the /embed HTML render for the same revision and
  // vice versa.
  const previewCache = new SvgPreviewCache()

  app.use("/health", mountHealthRoutes({ redis }))
  app.use(
    "/api",
    mountDiagramRoutes({ config, redis }, relay),
    mountVersionRoutes({ config, redis }, relay),
    mountConversionRoutes({ getResource }),
    mountEmbedApiRoutes({ redis, config, getResource, previewCache })
  )
  // /embed/:diagramId — server-rendered HTML page suitable for iframing from
  // third-party hosts (GitLab snippets, Notion, Confluence, …). Mounted at the
  // root, not under /api, because the URL is part of the public surface that
  // ends up in `<iframe src=…>` attributes.
  app.use(
    "/embed",
    mountEmbedRoutes({ redis, config, getResource, previewCache })
  )

  app.use(errorHandler)
  return app
}
