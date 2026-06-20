import { Position } from "@xyflow/react"
import { parseAnchor, SIDE_TO_POSITION } from "@/nodes/handles/anchorModel"

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
  const anchor = parseAnchor(handleId)
  if (anchor) return SIDE_TO_POSITION[anchor.side]
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

  const currentTargetPosition = getPositionFromHandleId(targetHandleId ?? null)
  const hasOppositeRequiredEdge = requiredEdgesOnTarget
    .filter((edge) => edge.id !== id)
    .some((edge) => {
      const otherPosition = getPositionFromHandleId(edge.targetHandle ?? null)
      return arePositionsOpposite(currentTargetPosition, otherPosition)
    })

  return hasOppositeRequiredEdge ? defaultType : reducedType
}
