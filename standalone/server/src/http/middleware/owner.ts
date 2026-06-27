import { createMiddleware } from "hono/factory"
import type { Context } from "hono"
// hono/cookie replaces the `cookie` package: getCookie reads a named cookie
// from the request, setCookie appends a Set-Cookie header (multiple calls
// append rather than overwrite). https://hono.dev/docs/helpers/cookie
import { getCookie, setCookie } from "hono/cookie"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import type { AppEnv } from "../env.js"

const COOKIE_PREFIX = "apollon_owner_"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180 // 180 days
const NONCE_BYTES = 16

interface OwnerCookieOptions {
  secret: string
}

function sign(diagramId: string, nonce: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${diagramId}|${nonce}`)
    .digest("hex")
}

function tokenFor(diagramId: string, secret: string): string {
  const nonce = randomBytes(NONCE_BYTES).toString("hex")
  const sig = sign(diagramId, nonce, secret)
  return `${nonce}.${sig}`
}

function verify(
  diagramId: string,
  token: string | undefined,
  secret: string
): boolean {
  if (!token) return false
  const parts = token.split(".")
  if (parts.length !== 2) return false
  const [nonce, sig] = parts
  if (!nonce || !sig) return false
  const expected = sign(diagramId, nonce, secret)
  if (sig.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}

// Mounted as global middleware on the app, so route params are not yet bound.
// Parse from the URL path directly. Matches:
//   /api/diagrams/:diagramId
//   /api/diagrams/:diagramId/versions[/...]
const DIAGRAM_ID_RE = /^\/api\/diagrams\/([A-Za-z0-9_-]+)(?:\/|$)/

function readDiagramIdFromPath(path: string): string | undefined {
  const match = DIAGRAM_ID_RE.exec(path)
  return match ? match[1] : undefined
}

/**
 * Reads the owner cookie for the diagram on this route. Always sets
 * `c.var.isOwner` (true|false) and — when a diagram id is present in the path —
 * the `X-Owner-Match` response header.
 *
 * Never blocks a request — friction, not security.
 */
export function ownerReader({ secret }: OwnerCookieOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const diagramId = readDiagramIdFromPath(c.req.path)
    if (!diagramId) {
      c.set("isOwner", false)
      await next()
      return
    }
    const token = getCookie(c, `${COOKIE_PREFIX}${diagramId}`)
    const ok = verify(diagramId, token, secret)
    c.set("isOwner", ok)
    c.header("x-owner-match", ok ? "true" : "false")
    await next()
  })
}

/**
 * Issues an owner cookie for the given diagramId in the response. Idempotent —
 * a fresh nonce is generated each call. Safe to set on every successful POST.
 *
 * `Secure` is enabled in production so the cookie is never sent over plain
 * HTTP (defence-in-depth alongside SameSite=Lax). Disabled in dev so local
 * `http://localhost` flows work without a TLS proxy.
 */
export function setOwnerCookie(
  c: Context<AppEnv>,
  diagramId: string,
  secret: string
): void {
  const value = tokenFor(diagramId, secret)
  setCookie(c, `${COOKIE_PREFIX}${diagramId}`, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}
