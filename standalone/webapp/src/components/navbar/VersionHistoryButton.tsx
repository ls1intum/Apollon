import { Button, Tooltip } from "@mui/material"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import { useVersionStore } from "@/stores/useVersionStore"
import { secondary } from "@/constants"
import { versioningStrings as t } from "@/components/versioning/strings"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"

interface Props {
  /**
   * Foreground color for the icon + label. Defaults to `secondary` —
   * the navbar's muted on-dark gray. Mobile passes `"black"` because
   * the button is rendered inside the hamburger Menu's light-bg dropdown
   * (where on-dark gray would be near-invisible). Other navbar children
   * (`NavbarFile`, `NavbarHelp`) follow the same prop convention.
   */
  color?: string
}

/**
 * Discoverable navbar entry point for the version-history sidebar.
 *
 * Renders only when the URL points at a connected diagram. On `/` the
 * sidebar is hidden because there's no diagramId to attach versions to —
 * the user must Share first.
 */
export const VersionHistoryButton = ({ color = secondary }: Props) => {
  const diagramId = useDiagramIdFromPath()
  const openDrawer = useVersionStore((s) => s.openDrawer)
  const closeDrawer = useVersionStore((s) => s.closeDrawer)
  const isOpen = useVersionStore((s) =>
    diagramId ? Boolean(s.drawerOpenByDiagram[diagramId]) : false
  )

  if (!diagramId) return null

  return (
    <Tooltip title={t.fabTooltip}>
      <Button
        sx={{ textTransform: "none", minWidth: 0, gap: 0.5 }}
        onClick={() =>
          isOpen ? closeDrawer(diagramId) : openDrawer(diagramId)
        }
        aria-label={t.drawerTitle}
        aria-pressed={isOpen}
        startIcon={
          <HistoryRoundedIcon fontSize="small" htmlColor={color} aria-hidden />
        }
      >
        <span style={{ color }}>{t.navMenuItem}</span>
      </Button>
    </Tooltip>
  )
}
