import type { NextFunction, Request, RequestHandler, Response } from "express"
import type { z, ZodTypeAny } from "zod"
import { Errors } from "../errors.js"

export interface Schemas {
  body?: ZodTypeAny
  query?: ZodTypeAny
  params?: ZodTypeAny
}

/**
 * Type-safe shape inferred from a `Schemas` object — each field becomes the
 * `z.infer<>` of its zod schema (or `unknown` if the schema is absent).
 */
export type Validated<S extends Schemas> = {
  [K in "body" | "query" | "params"]: S[K] extends ZodTypeAny
    ? z.infer<S[K]>
    : never
}

export type TypedHandler<S extends Schemas> = (
  req: Request,
  res: Response,
  next: NextFunction,
  valid: Validated<S>
) => void | Promise<void>

/**
 * Wraps a route handler with zod validation; the handler receives the
 * fully-typed parsed values as a fourth argument. On any validation failure
 * the handler is never called and a 422 INVALID_PARAMS is returned with a
 * concise issues string.
 *
 * Use:
 *
 *   router.get(
 *     "/things/:thingId",
 *     validate({ params: z.object({ thingId: z.string() }) }, async (req, res, _next, { params }) => {
 *       // params.thingId is `string`, no cast required.
 *     })
 *   )
 */
export function validate<S extends Schemas>(
  schemas: S,
  handler: TypedHandler<S>
): RequestHandler {
  return async (req, res, next) => {
    const valid: Partial<Record<"body" | "query" | "params", unknown>> = {}
    for (const key of ["body", "query", "params"] as const) {
      const schema = schemas[key]
      if (!schema) continue
      const result = schema.safeParse(req[key])
      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ")
        return next(Errors.invalidParams(`${key}: ${issues}`))
      }
      valid[key] = result.data
    }
    await handler(req, res, next, valid as Validated<S>)
  }
}
