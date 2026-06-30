import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { createAdaptorServer, type ServerType } from "@hono/node-server"
import type { Config } from "../config.js"
import type { Redis } from "../redis.js"
import type { AppEnv } from "./env.js"
import { requestId } from "./middleware/requestId.js"
import { httpLogger } from "./middleware/logger.js"
import { configureCors } from "./middleware/cors.js"
import { ownerReader } from "./middleware/owner.js"
import { errorHandler } from "./middleware/errors.js"
import { Errors } from "./errors.js"
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
  /** When true, the access-log middleware logs every request/response. Default: true. */
  autoLogging?: boolean
  /**
   * Override the conversion resource. Production omits this and the app lazily
   * constructs ONE shared instance on first render request. Tests inject a fake
   * so they don't spawn the worker thread.
   */
  conversionResource?: ConversionResource
}

/**
 * Builds the Hono application and wraps it in a Node `http.Server` (via
 * `@hono/node-server`'s `createAdaptorServer`) WITHOUT calling `listen()`. This
 * is the entry point for both the production server (`server.ts` calls
 * `.listen()`) and the integration tests (supertest accepts the unstarted
 * server and listens on an ephemeral port).
 *
 * The `/api/converter/*` download surface and the embed surfaces
 * (`/api/diagrams/:id/preview.svg`, `/embed/:id`) share ONE
 * `ConversionResource` — one worker thread, one render queue — constructed
 * lazily on first use so suites that never render don't spawn it.
 */
export function buildApp(deps: AppDeps): ServerType {
  const { config, redis, relay, autoLogging = true, conversionResource } = deps

  const app = new Hono<AppEnv>()

  // Replaces Express' body-parser size cap. The previous default JSON limit was
  // raised to MAX_SNAPSHOT_BYTES; over-limit bodies throw a typed 413
  // BODY_TOO_LARGE through the shared error handler (the throw propagates to
  // onError). Runs first so the 413 short-circuits before any per-route work —
  // matching the Express ordering where the body parser ran ahead of everything.
  app.use(
    bodyLimit({
      maxSize: config.MAX_SNAPSHOT_BYTES,
      onError: async (c) => {
        // bodyLimit rejects an over-limit request as soon as it sees the
        // Content-Length, before the client has finished uploading. If we
        // responded immediately the node adapter would tear the socket down
        // mid-upload and the client would see EPIPE/ECONNRESET. Express'
        // body-parser drained the rejected stream (`stream.resume()`) so the
        // client could finish writing first; reproduce that by reading and
        // discarding the remaining body, then surface the typed 413.
        const body = c.req.raw.body
        if (body) {
          const reader = body.getReader()
          try {
            for (;;) {
              const { done } = await reader.read()
              if (done) break
            }
          } catch {
            // Client hung up or stream errored — nothing left to drain.
          }
        }
        throw Errors.bodyTooLarge()
      },
    })
  )

  app.use(requestId())
  app.use(httpLogger({ autoLogging }))
  app.use(configureCors(config))
  app.use(ownerReader({ secret: config.OWNER_SECRET }))

  // Map every uncaught error (thrown ApiError, redis disconnects, anything) to
  // the typed error envelope. Registered as the app-level onError so it covers
  // middleware and handlers alike.
  app.onError(errorHandler)

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

  app.route("/health", mountHealthRoutes({ redis }))
  // Multiple sub-apps mounted at /api accumulate their routes there, the same
  // way Express tried each router in order under one mount path.
  app.route("/api", mountDiagramRoutes({ config, redis }, relay))
  app.route("/api", mountVersionRoutes({ config, redis }, relay))
  app.route("/api", mountConversionRoutes({ getResource }))
  app.route(
    "/api",
    mountEmbedApiRoutes({ redis, config, getResource, previewCache })
  )
  // /embed/:diagramId — server-rendered HTML page suitable for iframing from
  // third-party hosts (GitLab snippets, Notion, Confluence, …). Mounted at the
  // root, not under /api, because the URL is part of the public surface that
  // ends up in `<iframe src=…>` attributes.
  app.route(
    "/embed",
    mountEmbedRoutes({ redis, config, getResource, previewCache })
  )

  // Return a Node http.Server (not listening). `serve()` would create-and-listen
  // in one step; we keep the two apart so supertest can drive the same artifact.
  return createAdaptorServer({ fetch: app.fetch })
}
