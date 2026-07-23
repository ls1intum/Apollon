import { EdgeToolbar } from "@xyflow/react"
import { Pencil, RotateCcw, Trash2 } from "lucide-react"
import { ZINDEX } from "@/constants"
import { IPoint } from "@/edges"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { useLabels } from "@/i18n/useLabels"
import { IconButton } from "@/components/ui"

interface CustomEdgeToolbarProps {
  edgeId: string
  position: IPoint
  onEditClick: (event: React.MouseEvent<HTMLElement>) => void
  onDeleteClick: (event: React.MouseEvent<HTMLElement>) => void
  onResetRoutingClick?: (event: React.MouseEvent<HTMLElement>) => void
  canResetRouting?: boolean
  anchorRef: React.Ref<HTMLDivElement>
}

export const CustomEdgeToolbar: React.FC<CustomEdgeToolbarProps> = ({
  edgeId,
  position,
  onEditClick,
  onDeleteClick,
  onResetRoutingClick,
  canResetRouting = false,
  anchorRef,
}) => {
  const t = useLabels()
  const isSelected = useIsOnlyThisElementSelected(edgeId)
  const isDiagramModifiable = useDiagramModifiable()
  const isVisible = isSelected && isDiagramModifiable
  const showResetRouting = Boolean(canResetRouting && onResetRoutingClick)

  return (
    <EdgeToolbar
      edgeId={edgeId}
      x={position.x + 20}
      y={position.y + 20}
      isVisible={isVisible}
      style={{
        zIndex: ZINDEX.TOOLTIP,
        pointerEvents: "none",
      }}
    >
      <div
        ref={anchorRef}
        className="apollon-edge-toolbar"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: 8,
          borderRadius: "var(--apollon-radius-lg, 8px)",
          backgroundColor: "var(--apollon-background, white)",
          boxShadow: "0 0 4px var(--apollon-background-variant, #f8f9fa)",
        }}
      >
        <IconButton
          ariaLabel={t.deleteEdge}
          tooltip={t.deleteEdge}
          onClick={(event) => {
            event.stopPropagation()
            onDeleteClick(event)
          }}
        >
          <Trash2 width={16} height={16} aria-hidden="true" />
        </IconButton>
        <IconButton
          ariaLabel={t.editEdge}
          tooltip={t.editEdge}
          onClick={(event) => {
            event.stopPropagation()
            onEditClick(event)
          }}
        >
          <Pencil width={16} height={16} aria-hidden="true" />
        </IconButton>
        {showResetRouting && (
          <IconButton
            ariaLabel={t.resetEdgeRouting}
            tooltip={t.resetEdgeRouting}
            onClick={(event) => {
              event.stopPropagation()
              onResetRoutingClick?.(event)
            }}
          >
            <RotateCcw width={16} height={16} aria-hidden="true" />
          </IconButton>
        )}
      </div>
    </EdgeToolbar>
  )
}
