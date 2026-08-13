import { useStore } from "@xyflow/react"
import { useLayoutEffect } from "react"
import { getHandleScreenScale } from "@/utils/geometry/scalar"

/**
 * Publishes `--arc-scale` once for the whole canvas.
 *
 * Custom properties inherit, so the value only has to exist on an ancestor.
 * Publishing it here rather than from each node's style keeps zoom out of every
 * node's subscription list, and reducing to the scale inside the selector means a
 * re-render only when the scale itself changes, not on every frame of a zoom.
 */
export const ArcScalePublisher = () => {
  const domNode = useStore((state) => state.domNode)
  const scale = useStore((state) => getHandleScreenScale(state.transform[2]))

  useLayoutEffect(() => {
    domNode?.style.setProperty("--arc-scale", String(scale))
  }, [domNode, scale])

  return null
}
