/**
 * Hono environment for the server. `Variables` are the per-request values our
 * middleware stashes on the context (`c.set` / `c.get`) — the Hono equivalent
 * of the `req.requestId` / `req.isOwner` augmentations the Express build used.
 */
export interface AppEnv {
  Variables: {
    /** Correlation id, set by the requestId middleware; echoed as `x-request-id`. */
    requestId: string
    /** True if the request carries a valid owner cookie for the diagram on this route. */
    isOwner: boolean
  }
}
