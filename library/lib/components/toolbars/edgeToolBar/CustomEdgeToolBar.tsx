import { Pencil, Trash2 } from "lucide-react"
import { ZINDEX } from "@/constants"
import { IPoint } from "@/edges"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { useStore } from "@xyflow/react"
import { useMemo } from "react"
import { useLabels } from "@/i18n/useLabels"

interface CustomEdgeToolbarProps {
  edgeId: string
  position: IPoint
  /** Edge-middle anchor the toolbar counter-scales around (flow coords). */
  scaleAnchor: IPoint
  onEditClick: (event: React.MouseEvent<HTMLElement>) => void
  onDeleteClick: (event: React.MouseEvent<HTMLElement>) => void
  anchorRef: React.Ref<SVGForeignObjectElement>
}

export const CustomEdgeToolbar: React.FC<CustomEdgeToolbarProps> = ({
  edgeId,
  position,
  scaleAnchor,
  onEditClick,
  onDeleteClick,
  anchorRef,
}) => {
  const t = useLabels()
  const isDiagramModifiable = useDiagramModifiable()
  const selected = useIsOnlyThisElementSelected(edgeId)
  // The toolbar lives inside the zoomed SVG viewport, so by default it grows
  // and shrinks with zoom. Counter-scale by 1/zoom around the edge middle so it
  // keeps a constant on-screen size AND a constant on-screen offset from the
  // edge — matching the portal-based node toolbar, and so it never balloons
  // over the bend handles when zoomed in.
  const zoom = useStore((state) => state.transform[2])
  const inverseZoom = zoom > 0 ? 1 / zoom : 1

  const showToolbar = useMemo(() => {
    return selected && isDiagramModifiable
  }, [selected, isDiagramModifiable])

  const toolbarPosition = useMemo(() => {
    return {
      x: position.x - 16,
      y: position.y - 28,
    }
  }, [position.x, position.y, edgeId])

  // A <foreignObject> clips anything outside its box, so a box sized exactly to
  // its content has its drop-shadow sliced off at a hard rectangle. Pad the
  // foreignObject by SHADOW_MARGIN on every side (and offset it back by the same
  // amount) so the shadow renders into transparent margin instead of being cut;
  // the inner wrapper restores the original padding so the toolbar keeps its
  // size and position.
  const SHADOW_MARGIN = 8

  return (
    <g
      transform={`translate(${scaleAnchor.x} ${scaleAnchor.y}) scale(${inverseZoom}) translate(${-scaleAnchor.x} ${-scaleAnchor.y})`}
    >
      <foreignObject
        ref={anchorRef}
        width={32 + SHADOW_MARGIN * 2}
        height={56 + SHADOW_MARGIN * 2}
        x={toolbarPosition.x + 20 - SHADOW_MARGIN}
        y={toolbarPosition.y + 20 - SHADOW_MARGIN}
        overflow="visible"
        // The foreignObject is ALWAYS present (it anchors the popover) and sits
        // offset from the edge line, so if it captured the pointer it would select
        // the edge from an empty region well away from the visible line. Keep the
        // box transparent to the pointer; the toolbar buttons re-enable themselves
        // (`.apollon-edge-toolbar > *`). Anchoring is geometric, so it's unaffected.
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        {showToolbar && (
          // `.apollon-edge-toolbar` makes only the buttons (not the box body)
          // capture the pointer, so it can't steal events from bend handles.
          <div
            className="apollon-edge-toolbar"
            style={{
              backgroundColor: "var(--apollon-background, white)",
              boxShadow: "0 0 4px 0 var(--apollon-background-variant, #f8f9fa)",
              borderRadius: "var(--apollon-radius-lg, 8px)",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              gap: "8px",
              // Inset by SHADOW_MARGIN inside the padded foreignObject so the box
              // keeps its size/position while the drop-shadow renders into the
              // transparent margin instead of being clipped at the foreignObject.
              width: `calc(100% - ${SHADOW_MARGIN * 2}px)`,
              height: `calc(100% - ${SHADOW_MARGIN * 2}px)`,
              margin: `${SHADOW_MARGIN}px`,
              boxSizing: "border-box",
              WebkitTransform: "translateZ(0)",
              transform: "translateZ(0)",
              position: "relative",
              zIndex: ZINDEX.TOOLTIP,
            }}
          >
            <button
              type="button"
              aria-label={t.deleteEdge}
              style={{
                width: "16px",
                height: "16px",
                padding: 0,
                border: "none",
                backgroundColor: "var(--apollon-background, white)",
                color: "var(--apollon-foreground, #000000)",
                borderRadius: "var(--apollon-radius-sm, 4px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteClick(e)
              }}
            >
              <Trash2 style={{ width: 16, height: 16 }} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t.editEdge}
              style={{
                width: "16px",
                height: "16px",
                padding: 0,
                border: "none",
                backgroundColor: "var(--apollon-background, white)",
                color: "var(--apollon-foreground, #000000)",
                borderRadius: "var(--apollon-radius-sm, 4px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation()
                onEditClick(e)
              }}
            >
              <Pencil style={{ width: 16, height: 16 }} aria-hidden="true" />
            </button>
          </div>
        )}
      </foreignObject>
    </g>
  )
}
