import { Button, Tooltip } from "@mui/material"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import { useParams } from "react-router"
import { useVersionStore } from "@/stores/useVersionStore"
import { secondary } from "@/constants"
import { versioningStrings as t } from "@/components/versioning/strings"

/**
 * Discoverable navbar entry point for the version-history drawer.
 *
 * Only renders when the URL has a `:diagramId` (i.e. we're on a shared /
 * connected diagram). On the local-only `/` route, snapshots aren't
 * applicable (the user must Share first to get a diagramId).
 */
export const VersionHistoryButton = () => {
  const { diagramId } = useParams()
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
