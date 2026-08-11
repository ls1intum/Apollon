import { useStore, useStoreApi } from "@xyflow/react"
import { useEffect } from "react"
import { CANVAS } from "@/constants"

/**
 * Connection indicators keep a usable minimum on-screen size when zoomed out and
 * grow with the node when zoomed in:
 *   scale = 1 / min(zoom, 1) — constant on screen for zoom <= 1, natural above.
 */
export const arcScaleForZoom = (zoom: number): number =>
  1 /
  Math.min(
    Math.max(
      Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
      CANVAS.MIN_SCALE_TO_ZOOM_OUT
    ),
    1
  )

/**
 * Publishes `--arc-scale` once for the whole canvas.
 *
 * Every node's wrapper used to read `state.transform[2]` to write this custom
 * property onto each handle's inline style. That subscribes every node to the
 * zoom, so a single wheel gesture re-rendered every node on every frame — the
 * exact pattern React Flow's performance guide warns about, and the reason
 * zooming got heavier the more elements a diagram had.
 *
 * Custom properties inherit, so the value only has to exist on an ancestor. This
 * writes it straight to the DOM from a store subscription instead of rendering:
 * no node re-renders, and no React render at all per frame — just one style
 * property set, and only when the value actually changes.
 */
export const ArcScalePublisher = () => {
  const domNode = useStore((state) => state.domNode)
  const store = useStoreApi()

  useEffect(() => {
    if (!domNode) return

    let published: number | undefined
    const write = (zoom: number) => {
      const scale = arcScaleForZoom(zoom)
      // Zoom changes every frame of a gesture; the scale it maps to does not once
      // zoomed past 1, and the DOM write is skipped whenever it has not moved.
      if (scale === published) return
      published = scale
      domNode.style.setProperty("--arc-scale", String(scale))
    }

    write(store.getState().transform[2])
    return store.subscribe((state) => write(state.transform[2]))
  }, [domNode, store])

  return null
}
