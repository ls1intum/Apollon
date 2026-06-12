import { Button, Tooltip } from "@mui/material"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import { useLocation } from "react-router"
import { useVersionStore } from "@/stores/useVersionStore"
import { secondary } from "@/constants"
import { versioningStrings as t } from "@/components/versioning/strings"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"

interface Props {
  /**
   * Foreground color for the icon + label. Defaults to `secondary` —
   * the navbar's muted on-dark gray, for the always-dark desktop bar. The
   * mobile hamburger passes `var(--apollon-primary-contrast)` so the label
   * stays legible on the themed dropdown in both light and dark mode. Other
   * navbar children (`NavbarFile`, `NavbarHelp`) follow the same convention.
   */
  color?: string
}

/**
 * Discoverable navbar entry point for the version-history sidebar.
 *
 * Renders on any route with an active diagram that has a version backend:
 * `/shared/:id` (collab, RemoteVersionRepository) and `/local/:id`
 * (standalone, LocalVersionRepository). Legacy `/:id` redirects to
 * `/shared/:id`, so it is also covered. The gallery (`/`) and the
 * playground have no active diagram, so the button is hidden.
 */
export const VersionHistoryButton = ({ color = secondary }: Props) => {
  const diagramId = useDiagramIdFromPath()
  const { pathname } = useLocation()
  // Both shared (Remote) and local (Local) repositories back a drawer.
  // Boolean(diagramId) additionally catches legacy /:id, which redirects
  // to /shared. The gallery "/" and playground have no diagram id.
  const hasVersioning =
    pathname.startsWith("/shared/") ||
    pathname.startsWith("/local/") ||
    Boolean(diagramId)
  const openDrawer = useVersionStore((s) => s.openDrawer)
  const closeDrawer = useVersionStore((s) => s.closeDrawer)
  const isOpen = useVersionStore((s) =>
    diagramId ? Boolean(s.drawerOpenByDiagram[diagramId]) : false
  )

  if (!diagramId || !hasVersioning) return null

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
