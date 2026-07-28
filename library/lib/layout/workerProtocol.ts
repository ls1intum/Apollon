import type { DiagramLayoutPositions } from "./types"
import type { DiagramLayoutSnapshot } from "./model"

export const DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION = 1 as const

export type DiagramLayoutWorkerRequest = Readonly<{
  protocol: typeof DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION
  requestId: number
  kind: "layout"
  input: DiagramLayoutSnapshot
}>

export type DiagramLayoutWorkerResult = Readonly<{
  protocol: typeof DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION
  requestId: number
  kind: "result"
  positions: DiagramLayoutPositions
}>

export type DiagramLayoutWorkerError = Readonly<{
  protocol: typeof DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION
  requestId: number
  kind: "error"
  message: string
}>

export type DiagramLayoutWorkerResponse =
  | DiagramLayoutWorkerResult
  | DiagramLayoutWorkerError
