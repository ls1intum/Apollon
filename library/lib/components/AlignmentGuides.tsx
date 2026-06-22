import { useStore } from "@xyflow/react"
import { useAlignmentGuidesStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { AlignmentGuide } from "@/store/alignmentGuidesStore"
import "@/styles/alignmentGuides.css"

// A reusable pool of guide-line slots. The guide <line>s carry an infinite CSS
// animation (alignmentPulse); guides clear at the end of every drag, so
// rendering `guides` directly would unmount every animated line on each
// drag-stop and rebuild it next gesture — and some browsers (notably Firefox)
// keep detached animated SVG nodes alive via native references, so that churn
// accumulates over a long session. Rendering a fixed set of index-keyed slots
// instead keeps the line nodes permanently mounted: a slot is repositioned in
// place as guides move, and goes inert (no animation, not painted) when unused
// rather than being detached. Simultaneous alignment guides are far fewer than
// this in practice (the dragged node has six edges); a rare overflow just omits
// an extra guide line and never affects snapping.
const GUIDE_LINE_SLOTS = 12

export const AlignmentGuides = () => {
  const { guides } = useAlignmentGuidesStore(
    useShallow((state) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guides: state.guides as any as AlignmentGuide[],
    }))
  )

  // Subscribe to the live viewport (reactive) rather than reading getViewport()
  // imperatively during render — the latter is non-reactive (stale on pan/zoom)
  // and the React Compiler memoizes it, which offset the guides.
  const viewport = useStore(
    useShallow((state) => ({
      x: state.transform[0],
      y: state.transform[1],
      zoom: state.transform[2],
    }))
  )

  const active = guides ?? []

  return (
    <svg
      className="alignment-guides-svg"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      {Array.from({ length: GUIDE_LINE_SLOTS }, (_, index) => {
        const guide = active[index]
        if (!guide) {
          // Inert, reused slot: kept mounted so active lines are never detached
          // on drag-stop, and `display: none` so it neither paints nor animates.
          return <line key={index} style={{ display: "none" }} />
        }
        const vertical = guide.type === "vertical"
        const screen = vertical
          ? guide.position * viewport.zoom + viewport.x
          : guide.position * viewport.zoom + viewport.y
        return (
          <line
            key={index}
            x1={vertical ? screen : "0"}
            y1={vertical ? "0" : screen}
            x2={vertical ? screen : "100%"}
            y2={vertical ? "100%" : screen}
            className={`alignment-guide-line ${
              vertical
                ? "alignment-guide-vertical"
                : "alignment-guide-horizontal"
            }`}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}
