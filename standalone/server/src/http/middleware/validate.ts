import type { Context, Handler } from "hono"
import type { z, ZodTypeAny } from "zod"
import type { AppEnv } from "../env.js"
import { Errors } from "../errors.js"

export interface Schemas {
  body?: ZodTypeAny
  query?: ZodTypeAny
  params?: ZodTypeAny
}

/**
 * Type-safe shape inferred from a `Schemas` object — each field becomes the
 * `z.infer<>` of its zod schema (or `never` if the schema is absent).
 */
export type Validated<S extends Schemas> = {
  [K in "body" | "query" | "params"]: S[K] extends ZodTypeAny
    ? z.infer<S[K]>
    : never
}

export type TypedHandler<S extends Schemas> = (
  c: Context<AppEnv>,
  valid: Validated<S>
) => Response | Promise<Response>

/**
 * Reads the JSON body for a request that declares a `body` schema. Returns
 * `undefined` for an absent/non-JSON body so zod produces a clean
 * INVALID_PARAMS rather than letting a parse error surface as a 500.
 */
async function readJsonBody(c: Context<AppEnv>): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    return undefined
  }
}

/**
 * Wraps a route handler with zod validation; the handler receives the
 * fully-typed parsed values as a second argument. On any validation failure
 * the handler is never called and a 422 INVALID_PARAMS is returned (via the
 * shared error handler) with a concise issues string.
 *
 * Use:
 *
 *   router.get(
 *     "/things/:thingId",
 *     validate({ params: z.object({ thingId: z.string() }) }, async (c, { params }) => {
 *       // params.thingId is `string`, no cast required.
 *       return c.json({ id: params.thingId })
 *     })
 *   )
 */
export function validate<S extends Schemas>(
  schemas: S,
  handler: TypedHandler<S>
): Handler<AppEnv> {
  return async (c) => {
    const valid: Partial<Record<"body" | "query" | "params", unknown>> = {}
    for (const key of ["body", "query", "params"] as const) {
      const schema = schemas[key]
      if (!schema) continue
      const input =
        key === "body"
          ? await readJsonBody(c)
          : key === "query"
            ? c.req.query()
            : c.req.param()
      const result = schema.safeParse(input)
      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ")
        throw Errors.invalidParams(`${key}: ${issues}`)
      }
      valid[key] = result.data
    }
    return handler(c, valid as Validated<S>)
  }
}
