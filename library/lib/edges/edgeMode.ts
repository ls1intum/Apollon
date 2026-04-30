import { IPoint } from "./Connection"

export type EdgeMode = "AUTO" | "MANUAL"

export interface EdgeRoutingData {
  edgeMode?: EdgeMode
  points?: IPoint[]
  [key: string]: unknown
}

export function resolveEdgeMode(data?: EdgeRoutingData | null): EdgeMode {
  if (data?.edgeMode === "AUTO" || data?.edgeMode === "MANUAL") {
    return data.edgeMode
  }

  return Array.isArray(data?.points) && data.points.length > 2
    ? "MANUAL"
    : "AUTO"
}

export function toAutoEdgeData(data?: EdgeRoutingData | null): EdgeRoutingData {
  return {
    ...(data ?? {}),
    edgeMode: "AUTO",
    points: undefined,
  }
}

export function toManualEdgeData(
  points: IPoint[],
  data?: EdgeRoutingData | null
): EdgeRoutingData {
  return {
    ...(data ?? {}),
    edgeMode: "MANUAL",
    points,
  }
}
