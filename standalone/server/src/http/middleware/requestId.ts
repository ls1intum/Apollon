import type { NextFunction, Request, Response } from "express"
import { randomUUID } from "node:crypto"

declare module "express-serve-static-core" {
  interface Request {
    requestId: string
  }
}

const HEADER = "x-request-id"

export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header(HEADER)
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID()
    req.requestId = id
    res.setHeader(HEADER, id)
    next()
  }
}
