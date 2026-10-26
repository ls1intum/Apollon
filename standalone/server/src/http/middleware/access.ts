import { createMiddleware } from "hono/factory"
import { sign, verify } from "hono/jwt"
import type { Config } from "../../config.js"
import type { AppEnv } from "../env.js"
import { Errors } from "../errors.js"
import { k, type Redis } from "../../redis.js"
import { parseAllowedOrigins } from "./cors.js"
import { readDiagramIdFromPath } from "./owner.js"

const WRITE_AUDIENCE = "apollon-write-v1"

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
    return payload.sub === diagramId
  } catch {
    return false
  }
}

// Browsers always send Origin on cross-origin writes and WebSocket upgrades.
// A missing Origin comes from a non-browser client, which cannot ride on a
// victim's cookies.
export function isTrustedOrigin(
  origin: string | undefined,
  host: string | undefined,
  allowedOrigins: readonly string[]
): boolean {
  if (!origin || allowedOrigins.includes(origin)) return true
  try {
    const url = new URL(origin)
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.origin === origin &&
      url.host === host
    )
  } catch {
    // Opaque or malformed origins are never trusted.
    return false
  }
}

export function diagramAccess(config: Config, redis: Redis) {
  const allowedOrigins = parseAllowedOrigins(config)
  return createMiddleware<AppEnv>(async (c, next) => {
    c.set("canWrite", false)
    const diagramId = readDiagramIdFromPath(c.req.path)
    if (!diagramId) return next()

    const authorization = c.req.header("authorization")
    const token = authorization?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1]
    if (
      authorization &&
      (!token ||
        !(await verifyWriteToken(token, diagramId, config.OWNER_SECRET)))
    ) {
      // RFC 6750 §3.1: a rejected bearer token is a 401, so clients can tell
      // a revoked capability apart from a missing permission (403).
      c.header("www-authenticate", 'Bearer error="invalid_token"')
      throw Errors.invalidCapability()
    }
    const canWrite = c.get("isOwner") || Boolean(token)
    c.set("canWrite", canWrite)

    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      if (!canWrite) throw Errors.forbidden()
      if (!token) {
        if (
          !isTrustedOrigin(
            c.req.header("origin"),
            new URL(c.req.url).host,
            allowedOrigins
          )
        ) {
          throw Errors.forbidden("Untrusted request origin")
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
