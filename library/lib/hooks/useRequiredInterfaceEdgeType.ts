import { useMemo } from "react"
import { useShallow } from "zustand/shallow"
import { useDiagramStore, useEdgeGeometryStore } from "@/store/context"
import { getEndpointSideFromSegment } from "@/utils/edgeUtils"
import { resolveRequiredInterfaceEdgeType } from "@/utils/requiredInterfaceUtils"

type RequiredInterfaceEdgeTypeOptions = {
  type: string
  id: string
  target: string
  targetHandleId?: string | null
  requiredTypes: readonly string[]
  defaultType: string
  reducedType: string
}

/**
 * Choose a socket span from the actual holistic route sides. Stored handle ids
 * remain the pre-solve fallback, but once auto-layout moves a terminal segment
 * the marker follows the visible geometry. Only routes sharing this interface
 * are selected, so unrelated geometry updates do not re-render the edge.
 */
export function useRequiredInterfaceEdgeType({
  type,
  id,
  target,
  targetHandleId,
  requiredTypes,
  defaultType,
  reducedType,
}: RequiredInterfaceEdgeTypeOptions): string {
  const edges = useDiagramStore(useShallow((state) => state.edges))
  const requiredTargetEdges = useMemo(
    () =>
      edges.filter(
        (edge) =>
          edge.target === target &&
          edge.type !== undefined &&
          requiredTypes.includes(edge.type)
      ),
    [edges, requiredTypes, target]
  )
  const requiredTargetIds = useMemo(
    () => requiredTargetEdges.map((edge) => edge.id),
    [requiredTargetEdges]
  )
  const targetPositions = useEdgeGeometryStore(
    useShallow((state) =>
      requiredTargetIds.map((edgeId) => {
        const route = state.previewById[edgeId] ?? state.geometryById[edgeId]
        return route && route.length >= 2
          ? getEndpointSideFromSegment(
              route[route.length - 1],
              route[route.length - 2]
            )
          : undefined
      })
    )
  )
  const targetPositionByEdgeId = useMemo(
    () =>
      new Map(
        requiredTargetIds.flatMap((edgeId, index) => {
          const position = targetPositions[index]
          return position ? [[edgeId, position] as const] : []
        })
      ),
    [requiredTargetIds, targetPositions]
  )

  return resolveRequiredInterfaceEdgeType({
    type,
    id,
    target,
    targetHandleId,
    edges,
    requiredTypes,
    defaultType,
    reducedType,
    targetPositionByEdgeId,
  })
}
