import { DeleteIcon, EditIcon } from "@/components/Icon"
import { ZINDEX } from "@/constants"
import { IPoint } from "@/edges"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { Box } from "@mui/material"
import { useMemo } from "react"

interface CustomEdgeToolbarProps {
  edgeId: string
  position: IPoint
  onEditClick: (event: React.MouseEvent<HTMLElement>) => void
  onDeleteClick: (event: React.MouseEvent<HTMLElement>) => void
  anchorRef: React.RefObject<SVGForeignObjectElement>
}

export const CustomEdgeToolbar: React.FC<CustomEdgeToolbarProps> = ({
  edgeId,
  position,
  onEditClick,
  onDeleteClick,
  anchorRef,
}) => {
  const isDiagramModifiable = useDiagramModifiable()
  const selected = useIsOnlyThisElementSelected(edgeId)

  const showToolbar = useMemo(() => {
    return selected && isDiagramModifiable
  }, [selected, isDiagramModifiable])

  const toolbarPosition = useMemo(() => {
    return {
      x: position.x - 16,
      y: position.y - 28,
    }
  }, [position.x, position.y, edgeId])

  return (
    <foreignObject
      ref={anchorRef}
      width={32}
      height={56}
      x={toolbarPosition.x + 20}
      y={toolbarPosition.y + 20}
    >
      {showToolbar && (
        <Box
          sx={{
            backgroundColor: "var(--apollon2-background)",
            boxShadow: "0 0 4px 0 var(--apollon2-background-variant)",
            borderRadius: "8px",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "pointer",
            gap: "8px",
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            WebkitTransform: "translateZ(0)",
            transform: "translateZ(0)",
            position: "relative",
            zIndex: ZINDEX.TOOLTIP,
          }}
        >
          <Box
            sx={{
              width: "16px",
              height: "16px",
              backgroundColor: "var(--apollon2-background)",
              borderRadius: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            onClick={(e) => {
              e.stopPropagation()
              onDeleteClick(e)
            }}
          >
            <DeleteIcon style={{ width: 16, height: 16 }} />
          </Box>
          <Box
            sx={{
              width: "16px",
              height: "16px",
              backgroundColor: "var(--apollon2-background)",
              borderRadius: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            onClick={(e) => {
              e.stopPropagation()
              onEditClick(e)
            }}
          >
            <EditIcon style={{ width: 16, height: 16 }} />
          </Box>
        </Box>
      )}
    </foreignObject>
  )
}
