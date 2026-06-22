import { Button, Tooltip } from "@mui/material"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import { useLocation } from "@tanstack/react-router"
import { useVersionStore } from "@/stores/useVersionStore"
import { versioningStrings as t } from "@/components/versioning/strings"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"
import { navbarButtonStyle } from "./styleConstants"

interface Props {
  /**
   * Foreground colour for the icon + label. Omitted on the chrome header (idles
   * muted, washes to `--apollon-chrome-text` on hover via `navbarButtonStyle`);
   * the mobile overflow menu passes `var(--apollon-primary-contrast)` so the
   * label stays legible on the themed dropdown. `NavbarFile`/`NavbarHelp`/
   * `SaveLocalCopyButton` follow the same convention.
   */
  color?: string
  /** Classes for the label span — the header passes `"hidden lg:inline"` to
   * collapse to the icon when space is tight; the mobile menu omits it so the
   * label always shows. */
  labelClassName?: string
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
export const VersionHistoryButton = ({ color, labelClassName }: Props) => {
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
        sx={navbarButtonStyle(color)}
        onClick={() =>
          isOpen ? closeDrawer(diagramId) : openDrawer(diagramId)
        }
        aria-label={t.drawerTitle}
        aria-pressed={isOpen}
        startIcon={<HistoryRoundedIcon fontSize="small" aria-hidden />}
      >
        <span className={labelClassName}>{t.navMenuItem}</span>
      </Button>
    </Tooltip>
  )
}
