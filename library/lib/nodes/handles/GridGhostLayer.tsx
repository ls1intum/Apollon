import { useConnection, useStore, ViewportPortal } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import {
  anchorPoint,
  effectiveStepPx,
  safeZoom,
  snapToAnchor,
  type Rect,
} from "./anchorModel"
import { getNodeHandleConfig } from "./nodeHandleConfig"

interface TargetNode {
  id: string
  type: string | undefined
  rect: Rect
}

/**
 * Overlay shown during a connection drag: the zoom-aware 5px grid on the
 * hovered node's targeted side plus a ghost dot at the snap point. Holds no
 * snap state — the authoritative snap is recomputed by snapToAnchor in
 * onConnectEnd; mounted once in App inside a ViewportPortal to share the
 * canvas transform.
 */
export function GridGhostLayer() {
  const connection = useConnection()
  const zoom = useStore((s) => s.transform[2])

  const target = useStore(
    useShallow((s): TargetNode | null => {
      if (!connection.inProgress || !connection.to) return null
      const to = connection.to
      const fromId = connection.fromNode?.id
      let found: TargetNode | null = null
      for (const n of s.nodeLookup.values()) {
        if (n.id === fromId) continue
        const x = n.internals.positionAbsolute.x
        const y = n.internals.positionAbsolute.y
        const w = n.measured?.width ?? n.width ?? 0
        const h = n.measured?.height ?? n.height ?? 0
        if (w <= 0 || h <= 0) continue
        if (to.x >= x && to.x <= x + w && to.y >= y && to.y <= y + h) {
          // Keep the last (topmost) containing node.
          found = {
            id: n.id,
            type: n.type,
            rect: { x, y, width: w, height: h },
          }
        }
      }
      return found
    })
  )

  if (!connection.inProgress || !connection.to || !target) return null

  const config = getNodeHandleConfig(target.type)
  if (config.variant === "none") return null

  const z = safeZoom(zoom)
  const snap = snapToAnchor(target.rect, connection.to, z, {
    sides: config.sides,
    variant: config.variant === "center" ? "center" : "key",
    excludeCorners: config.excludeCorners,
  })

  const { rect } = target
  const axis = snap.side === "t" || snap.side === "b" ? rect.width : rect.height

  // Grid ticks along the snapped side (key variant only — NSEW shapes have a
  // single centre target, no grid).
  const ticks: { x: number; y: number }[] = []
  if (config.variant !== "center" && axis > 0) {
    const step = effectiveStepPx(z)
    for (let px = 0; px <= axis + 1e-6; px += step) {
      const p = anchorPoint(rect, snap.side, px / axis)
      ticks.push({ x: p.x - rect.x, y: p.y - rect.y })
    }
  }

  // Keep both marks a constant on-screen size across zoom.
  const tickR = 1.5 / z
  const ghostR = 4 / z

  return (
    <ViewportPortal>
      <svg
        className="apollon-grid-ghost"
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          overflow: "visible",
          pointerEvents: "none",
          zIndex: 9,
        }}
      >
        {ticks.map((t, i) => (
          <circle
            key={i}
            cx={t.x}
            cy={t.y}
            r={tickR}
            className="apollon-grid-ghost__tick"
          />
        ))}
        <circle
          cx={snap.point.x - rect.x}
          cy={snap.point.y - rect.y}
          r={ghostR}
          className="apollon-grid-ghost__dot"
        />
      </svg>
    </ViewportPortal>
  )
}
