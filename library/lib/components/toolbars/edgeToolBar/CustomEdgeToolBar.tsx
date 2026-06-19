import { DeleteIcon, EditIcon } from "@/components/Icon"
import { ZINDEX } from "@/constants"
import { IPoint } from "@/edges"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { Box, IconButton } from "@mui/material"
import { useStore } from "@xyflow/react"
import { useMemo } from "react"

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
        style={{ overflow: "visible" }}
      >
        {showToolbar && (
          <Box
            sx={{
              backgroundColor: "var(--apollon-background, white)",
              boxShadow: "0 0 4px 0 var(--apollon-background-variant, #f8f9fa)",
              borderRadius: "8px",
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
              // The toolbar body is decorative; only its buttons should capture
              // the pointer. Otherwise the box covers nearby bend handles and
              // steals their pointer events (visible handle, not draggable).
              pointerEvents: "none",
              "& > *": { pointerEvents: "auto" },
            }}
          >
            <IconButton
              aria-label="Delete edge"
              sx={{
                width: "16px",
                height: "16px",
                padding: 0,
                backgroundColor: "var(--apollon-background, white)",
                borderRadius: 1,
              }}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteClick(e)
              }}
            >
              <DeleteIcon style={{ width: 16, height: 16 }} />
            </IconButton>
            <IconButton
              aria-label="Edit edge"
              sx={{
                width: "16px",
                height: "16px",
                padding: 0,
                backgroundColor: "var(--apollon-background, white)",
                borderRadius: 1,
              }}
              onClick={(e) => {
                e.stopPropagation()
                onEditClick(e)
              }}
            >
              <EditIcon style={{ width: 16, height: 16 }} />
            </IconButton>
          </Box>
        )}
      </foreignObject>
    </g>
  )
}
