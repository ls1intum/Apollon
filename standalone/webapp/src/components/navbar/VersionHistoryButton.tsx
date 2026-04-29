import { Button, Tooltip } from "@mui/material"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import { useLocation } from "react-router"
import { useVersionStore } from "@/stores/useVersionStore"
import { secondary } from "@/constants"
import { versioningStrings as t } from "@/components/versioning/strings"

/**
 * Reserved top-level paths in App.tsx — anything else is a diagramId.
 * Kept in sync with `<Routes>` manually because the navbar is rendered
 * OUTSIDE the route hierarchy and therefore can't see `useParams`.
 */
const RESERVED_TOP_LEVEL_PATHS = new Set([
  "",
  "playground",
  "imprint",
  "privacy",
  "legal",
  "*",
])

/**
 * Extracts the diagramId from `window.location.pathname` directly. We can't
 * use `useParams` here because the navbar lives above `<Routes>` in App.tsx
 * (so the route match doesn't propagate up). `useLocation` is the
 * router-aware equivalent that works at any depth inside `BrowserRouter`.
 */
function useDiagramIdFromPath(): string | undefined {
  const location = useLocation()
  const segment = location.pathname.split("/").filter(Boolean)[0]
  if (!segment) return undefined
  if (RESERVED_TOP_LEVEL_PATHS.has(segment)) return undefined
  return segment
}

/**
 * Discoverable navbar entry point for the version-history drawer.
 *
 * Only renders when the URL points at a connected diagram (i.e. the first
 * path segment is not a reserved route). On the local-only `/` route,
 * snapshots aren't applicable (the user must Share first to get a
 * diagramId).
 */
export const VersionHistoryButton = () => {
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
          <HistoryRoundedIcon
            fontSize="small"
            htmlColor={secondary}
            aria-hidden
          />
        }
      >
        <span style={{ color: secondary }}>{t.navMenuItem}</span>
      </Button>
    </Tooltip>
  )
}
