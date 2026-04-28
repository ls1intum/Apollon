import { DeleteIcon, EditIcon } from "@/components/Icon"
import { ZINDEX } from "@/constants"
import { IPoint } from "@/edges"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { Box } from "@mui/material"
import { useLayoutEffect, useMemo, useState } from "react"

const TOOLBAR_WIDTH = 32
const TOOLBAR_HEIGHT = 56
const TOOLBAR_GAP = 20
const DRAGGER_CLEARANCE = 14

const getDefaultToolbarPosition = (position: IPoint) => ({
  x: position.x + 4,
  y: position.y - 8,
})

const overlapsDragger = (toolbarPosition: IPoint, dragger: IPoint) => {
  return (
    dragger.x >= toolbarPosition.x - DRAGGER_CLEARANCE &&
    dragger.x <= toolbarPosition.x + TOOLBAR_WIDTH + DRAGGER_CLEARANCE &&
    dragger.y >= toolbarPosition.y - DRAGGER_CLEARANCE &&
    dragger.y <= toolbarPosition.y + TOOLBAR_HEIGHT + DRAGGER_CLEARANCE
  )
}

const getToolbarCandidates = (position: IPoint) => [
  {
    x: position.x + TOOLBAR_GAP,
    y: position.y - TOOLBAR_HEIGHT / 2,
  },
  {
    x: position.x - TOOLBAR_WIDTH - TOOLBAR_GAP,
    y: position.y - TOOLBAR_HEIGHT / 2,
  },
  {
    x: position.x - TOOLBAR_WIDTH / 2,
    y: position.y - TOOLBAR_HEIGHT - TOOLBAR_GAP,
  },
  {
    x: position.x - TOOLBAR_WIDTH / 2,
    y: position.y + TOOLBAR_GAP,
  },
  {
    x: position.x + TOOLBAR_GAP,
    y: position.y - TOOLBAR_HEIGHT - TOOLBAR_GAP,
  },
  {
    x: position.x - TOOLBAR_WIDTH - TOOLBAR_GAP,
    y: position.y - TOOLBAR_HEIGHT - TOOLBAR_GAP,
  },
  {
    x: position.x + TOOLBAR_GAP,
    y: position.y + TOOLBAR_GAP,
  },
  {
    x: position.x - TOOLBAR_WIDTH - TOOLBAR_GAP,
    y: position.y + TOOLBAR_GAP,
  },
  getDefaultToolbarPosition(position),
]

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

  const [toolbarPosition, setToolbarPosition] = useState<IPoint>(() =>
    getDefaultToolbarPosition(position)
  )

  useLayoutEffect(() => {
    const defaultPosition = getDefaultToolbarPosition(position)

    if (!showToolbar || !anchorRef.current) {
      setToolbarPosition(defaultPosition)
      return
    }

    const edgeGroup = anchorRef.current.parentElement
    const draggers = Array.from(
      edgeGroup?.querySelectorAll<SVGCircleElement>(".edge-circle") ?? []
    )
      .map((circle) => ({
        x: Number(circle.getAttribute("cx")),
        y: Number(circle.getAttribute("cy")),
      }))
      .filter(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))

    const nextPosition =
      draggers.length === 0
        ? defaultPosition
        : (getToolbarCandidates(position).find((candidate) =>
            draggers.every((dragger) => !overlapsDragger(candidate, dragger))
          ) ?? defaultPosition)

    setToolbarPosition((currentPosition) =>
      currentPosition.x === nextPosition.x &&
      currentPosition.y === nextPosition.y
        ? currentPosition
        : nextPosition
    )
  }, [anchorRef, position.x, position.y, showToolbar, edgeId])

  return (
    <foreignObject
      ref={anchorRef}
      width={TOOLBAR_WIDTH}
      height={TOOLBAR_HEIGHT}
      x={toolbarPosition.x}
      y={toolbarPosition.y}
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
              backgroundColor: "var(--apollon-background, white)",
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
              backgroundColor: "var(--apollon-background, white)",
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
