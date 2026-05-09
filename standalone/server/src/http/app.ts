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
import {
  createEmbedPreviewService,
  type SvgSource,
  type EmbedPreviewService,
} from "../services/embed-preview"
import { createWorkerSvgSource } from "../services/svg-source"
import { ConversionResource } from "../resources/conversion-resource"
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
  /**
   * Override the SVG renderer. Production omits this and gets a
   * worker-backed source bound to the shared `ConversionResource`.
   * Tests inject `createInProcessSvgSource()` so they don't need the
   * worker thread's compiled `.js` artifact.
   */
  svgSource?: SvgSource
  /**
   * Pre-built preview service. Tests can swap the LRU + coalescing
   * layer (e.g. inject a deferred fake). When absent, one is built
   * from `svgSource`.
   */
  embedPreview?: EmbedPreviewService
  /**
   * Override the conversion resource backing the PDF route. Tests
   * that don't exercise the PDF path can leave this and we'll lazy-
   * construct it on first request the same way the embed worker is
   * lazy-allocated. Production injects ONE shared instance.
   */
  conversionResource?: ConversionResource
}

/**
 * Builds the Express application without calling `listen()`. This is
 * the entry point for both the production server and integration tests
 * (supertest).
 *
 * Resource sharing:
 *   - ONE `ConversionResource` instance is constructed (lazily) per
 *     server process and shared between the PDF and embed surfaces.
 *     Spinning up two independent worker threads with duplicate JSDOM
 *     init was the dual-worker waste the previous design suffered
 *     from.
 *   - ONE `EmbedPreviewService` (LRU + coalescing) is shared between
 *     `mountEmbedApiRoutes` and `mountEmbedRoutes`.
 */
export function buildApp(deps: AppDeps): Express {
  const {
    config,
    redis,
    relay,
    autoLogging = true,
    svgSource,
    embedPreview,
    conversionResource,
  } = deps

  const app = express()
  app.disable("x-powered-by")

  // `req.protocol` and `req.ip` honour `X-Forwarded-*` headers set by
  // an HTTPS-terminating reverse proxy only when `trust proxy` is
  // configured. Without it, the embed page emits an `http://` "Open in
  // Apollon" link from inside an HTTPS-served iframe and browsers
  // block the click as mixed content. The numeric hop count `1`
  // matches the typical "single proxy in front" topology.
  app.set("trust proxy", 1)

  // Express 5 default JSON body limit is 100 KiB; raise to allow
  // snapshot PUTs up to MAX_SNAPSHOT_BYTES. The API does not accept
  // urlencoded bodies, so no urlencoded parser is mounted.
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

  // Lazily allocate the ConversionResource — only routes that touch
  // the renderer (PDF, embed) ever need it. Tests that inject their
  // own `svgSource` / `embedPreview` skip the allocation entirely.
  let resourceSingleton: ConversionResource | undefined = conversionResource
  const getResource = (): ConversionResource => {
    if (!resourceSingleton) resourceSingleton = new ConversionResource()
    return resourceSingleton
  }

  // ONE preview service per process, built lazily on first embed
  // request. Tests that never hit the embed routes (e.g. diagram /
  // version suites) never trigger this — and therefore never spawn
  // the worker thread.
  let previewSingleton: EmbedPreviewService | undefined = embedPreview
  const getPreviewService = (): EmbedPreviewService => {
    if (!previewSingleton) {
      previewSingleton = createEmbedPreviewService({
        svgSource: svgSource ?? createWorkerSvgSource(getResource()),
      })
    }
    return previewSingleton
  }

  app.use("/health", mountHealthRoutes({ redis }))
  app.use(
    "/api",
    mountDiagramRoutes({ config, redis }, relay),
    mountVersionRoutes({ config, redis }, relay),
    mountConversionRoutes({ getResource }),
    mountEmbedApiRoutes({ redis, getPreviewService })
  )
  // /embed/:diagramId — server-rendered HTML page suitable for
  // iframing from third-party hosts (GitLab snippets, Notion,
  // Confluence, …). Mounted at the root, NOT under /api, because the
  // URL is part of the public surface that ends up in
  // `<iframe src=…>` attributes.
  app.use("/embed", mountEmbedRoutes({ redis, getPreviewService }))

  app.use(errorHandler)
  return app
}
