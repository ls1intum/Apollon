import type { NextFunction, Request, Response } from "express"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
// cookie@2 renamed its exports: `parse` -> `parseCookie`,
// `serialize` -> `stringifySetCookie` (which now takes a single object).
// https://github.com/jshttp/cookie/releases (v2.0.0)
import { parseCookie, stringifySetCookie } from "cookie"

const COOKIE_PREFIX = "apollon_owner_"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180 // 180 days
const NONCE_BYTES = 16

declare module "express-serve-static-core" {
  interface Request {
    /** True if the request carries a valid owner cookie for the diagram on this route. */
    isOwner: boolean
  }
}

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

// Mounted as global middleware on the Express app, so route params are not
// yet bound. Parse from the URL path directly. Matches:
//   /api/diagrams/:diagramId
//   /api/diagrams/:diagramId/versions[/...]
const DIAGRAM_ID_RE = /^\/api\/diagrams\/([A-Za-z0-9_-]+)(?:\/|$)/

function readDiagramIdFromRequest(req: Request): string | undefined {
  const match = DIAGRAM_ID_RE.exec(req.path)
  return match ? match[1] : undefined
}

/**
 * Reads the owner cookie for the diagram on this route. Always sets
 * `req.isOwner` (true|false) and `X-Owner-Match` response header.
 *
 * Never blocks a request — friction, not security.
 */
export function ownerReader({ secret }: OwnerCookieOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const diagramId = readDiagramIdFromRequest(req)
    if (!diagramId) {
      req.isOwner = false
      next()
      return
    }
    const cookies = parseCookie(req.header("cookie") ?? "")
    const token = cookies[`${COOKIE_PREFIX}${diagramId}`]
    const ok = verify(diagramId, token, secret)
    req.isOwner = ok
    res.setHeader("x-owner-match", ok ? "true" : "false")
    next()
  }
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
  res: Response,
  diagramId: string,
  secret: string
): void {
  const value = tokenFor(diagramId, secret)
  const serialized = stringifySetCookie({
    name: `${COOKIE_PREFIX}${diagramId}`,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
  // Append (don't replace) so callers can set multiple cookies.
  const existing = res.getHeader("set-cookie")
  if (Array.isArray(existing)) {
    res.setHeader("set-cookie", [...existing, serialized])
  } else if (typeof existing === "string") {
    res.setHeader("set-cookie", [existing, serialized])
  } else {
    res.setHeader("set-cookie", serialized)
  }
}
