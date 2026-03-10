import { useReactFlow } from "@xyflow/react"
import { useAlignmentGuidesStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { AlignmentGuide } from "@/store/alignmentGuidesStore"
import "@/styles/alignmentGuides.css"

export const AlignmentGuides = () => {
  const { guides } = useAlignmentGuidesStore(
    useShallow((state) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guides: state.guides as any as AlignmentGuide[],
    }))
  )

  const { getViewport } = useReactFlow()
  const viewport = getViewport()

  if (!guides || guides.length === 0) {
    return null
  }

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
      {guides.map((guide: AlignmentGuide) => {
        if (guide.type === "vertical") {
          // Vertical line (for horizontal alignment)
          const screenX = guide.position * viewport.zoom + viewport.x
          return (
            <line
              key={guide.id}
              x1={screenX}
              y1="0"
              x2={screenX}
              y2="100%"
              className="alignment-guide-line alignment-guide-vertical"
              vectorEffect="non-scaling-stroke"
            />
          )
        } else {
          // Horizontal line (for vertical alignment)
          const screenY = guide.position * viewport.zoom + viewport.y
          return (
            <line
              key={guide.id}
              x1="0"
              y1={screenY}
              x2="100%"
              y2={screenY}
              className="alignment-guide-line alignment-guide-horizontal"
              vectorEffect="non-scaling-stroke"
            />
          )
        }
      })}
    </svg>
  )
}
