import { createMiddleware } from "hono/factory"
import { sign, verify } from "hono/jwt"
import type { Config } from "../../config.js"
import type { AppEnv } from "../env.js"
import { Errors } from "../errors.js"
import { k, type Redis } from "../../redis.js"

const WRITE_AUDIENCE = "apollon-write-v1"
const DIAGRAM_PATH = /^\/api\/diagrams\/([A-Za-z0-9_-]+)(?:\/|$)/

// Grants follow the diagram's sliding lifetime. Rotating OWNER_SECRET
// invalidates all grants; tokens are never part of the persisted model.
export const createWriteToken = (diagramId: string, secret: string) =>
  sign({ aud: WRITE_AUDIENCE, sub: diagramId }, secret, "HS256")

export async function verifyWriteToken(
  token: string,
  diagramId: string,
  secret: string
): Promise<boolean> {
  try {
    const payload = await verify(token, secret, {
      alg: "HS256",
      aud: WRITE_AUDIENCE,
    })
    return payload.sub === diagramId && payload.aud === WRITE_AUDIENCE
  } catch {
    return false
  }
}

export function diagramAccess(config: Config, redis: Redis) {
  const allowedOrigins =
    config.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? []
  return createMiddleware<AppEnv>(async (c, next) => {
    c.set("canWrite", false)
    c.set("writeToken", undefined)
    const diagramId = DIAGRAM_PATH.exec(c.req.path)?.[1]
    if (!diagramId) return next()

    const authorization = c.req.header("authorization")
    const token = authorization?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1]
    if (
      authorization &&
      (!token ||
        !(await verifyWriteToken(token, diagramId, config.OWNER_SECRET)))
    ) {
      throw Errors.forbidden("Invalid write capability")
    }
    const canWrite = c.get("isOwner") || Boolean(token)
    c.set("canWrite", canWrite)
    if (token) c.set("writeToken", token)

    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      if (!canWrite) throw Errors.forbidden()
      if (!token) {
        const origin = c.req.header("origin")
        if (origin && !allowedOrigins.includes(origin)) {
          let sameHost = false
          try {
            const url = new URL(origin)
            sameHost =
              ["http:", "https:"].includes(url.protocol) &&
              url.origin === origin &&
              url.host === new URL(c.req.url).host
          } catch {
            // Opaque or malformed origins are never trusted.
          }
          if (!sameHost) throw Errors.forbidden("Untrusted request origin")
        }
        if (
          ["POST", "PUT", "PATCH"].includes(c.req.method) &&
          c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase() !==
            "application/json"
        ) {
          throw Errors.forbidden("Cookie-authorized writes require JSON")
        }
      }
      if (!(await redis.exists(k.diagram(diagramId)))) {
        throw Errors.notFound("diagram not found")
      }
    }
    await next()
  })
}
