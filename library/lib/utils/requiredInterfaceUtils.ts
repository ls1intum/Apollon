import { Position } from "@xyflow/react"

type RequiredInterfaceLikeEdge = {
  id: string
  target: string
  type?: string | null
  targetHandle?: string | null
}

type ResolveRequiredInterfaceEdgeTypeParams = {
  type: string
  id: string
  target: string
  targetHandleId?: string | null
  edges: RequiredInterfaceLikeEdge[]
  requiredTypes: readonly string[]
  defaultType: string
  reducedType: string
  /** Settled/preview route sides, when available. Auto-layout may move an edge
   * away from its stored RF handle, and the socket must describe what is
   * actually drawn rather than that stale suggestion. */
  targetPositionByEdgeId?: ReadonlyMap<string, Position>
}

const arePositionsOpposite = (pos1: Position, pos2: Position): boolean => {
  return (
    (pos1 === Position.Left && pos2 === Position.Right) ||
    (pos1 === Position.Right && pos2 === Position.Left) ||
    (pos1 === Position.Top && pos2 === Position.Bottom) ||
    (pos1 === Position.Bottom && pos2 === Position.Top)
  )
}

const getPositionFromHandleId = (handleId: string | null): Position => {
  if (!handleId) return Position.Right

  if (handleId.includes("left")) return Position.Left
  if (handleId.includes("right")) return Position.Right
  if (handleId.includes("top")) return Position.Top
  if (handleId.includes("bottom")) return Position.Bottom

  return Position.Right
}

export function resolveRequiredInterfaceEdgeType({
  type,
  id,
  target,
  targetHandleId,
  edges,
  requiredTypes,
  defaultType,
  reducedType,
  targetPositionByEdgeId,
}: ResolveRequiredInterfaceEdgeTypeParams): string {
  if (!requiredTypes.includes(type)) {
    return type
  }

  const requiredEdgesOnTarget = edges.filter(
    (edge) =>
      edge.target === target && edge.type && requiredTypes.includes(edge.type)
  )

  if (requiredEdgesOnTarget.length <= 1) {
    return defaultType
  }

  if (requiredEdgesOnTarget.length > 2) {
    return reducedType
  }

  const currentTargetPosition =
    targetPositionByEdgeId?.get(id) ??
    getPositionFromHandleId(targetHandleId ?? null)
  const hasOppositeRequiredEdge = requiredEdgesOnTarget
    .filter((edge) => edge.id !== id)
    .some((edge) => {
      const otherPosition =
        targetPositionByEdgeId?.get(edge.id) ??
        getPositionFromHandleId(edge.targetHandle ?? null)
      return arePositionsOpposite(currentTargetPosition, otherPosition)
    })

  return hasOppositeRequiredEdge ? defaultType : reducedType
}
