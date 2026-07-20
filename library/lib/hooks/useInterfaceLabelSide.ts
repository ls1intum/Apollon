import { useInternalNode } from "@xyflow/react"
import { useDiagramStore, useEdgeGeometryStore } from "@/store"
import {
  computeInterfaceLabelSide,
  type InterfaceLabelSide,
} from "@/utils/geometry/interfaceLabelLayout"

/**
 * Where a four-centre interface node's name label sits: on a free side, off any side an
 * edge actually attaches to. The occupied sides are read from the ROUTED geometry (the
 * memoryless router derives attachment sides itself, so the stored handle is often
 * stale), with the stored handle as the pre-route fallback.
 *
 * Returns a primitive, so a component using it re-renders only when the side flips —
 * even though it reacts to every geometry update. Shared by the component and deployment
 * interface nodes so both behave identically.
 */
export function useInterfaceLabelSide(
  id: string,
  opts?: { badgeTopRight?: boolean }
): InterfaceLabelSide {
  const edges = useDiagramStore((state) => state.edges)
  const internal = useInternalNode(id)
  const rect =
    internal && internal.measured.width && internal.measured.height
      ? {
          x: internal.internals.positionAbsolute.x,
          y: internal.internals.positionAbsolute.y,
          width: internal.measured.width,
          height: internal.measured.height,
        }
      : undefined
  return useEdgeGeometryStore((state) =>
    computeInterfaceLabelSide(edges, id, {
      badgeTopRight: opts?.badgeTopRight,
      geometry: rect ? { rect, routeById: state.geometryById } : undefined,
    })
  )
}
