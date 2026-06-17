import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { HistoryIcon } from "lucide-react"
import { useLocation } from "react-router"
import { useVersionStore } from "@/stores/useVersionStore"
import { secondary } from "@/constants"
import { versioningStrings as t } from "@/components/versioning/strings"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"
import { navTriggerClass } from "./styles"

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
 * Renders only on a shared/connected diagram route, where the version drawer
 * is actually mounted (ApollonWithConnection). Local diagrams (`/local/:id`)
 * and `/` have no versioning backend or drawer, so the button is hidden —
 * the user must Share first.
 */
export const VersionHistoryButton = ({ color = secondary }: Props) => {
  const diagramId = useDiagramIdFromPath()
  const { pathname } = useLocation()
  // Versioning only exists on the connected /shared/:id route (legacy /:id
  // redirects there). Local-only routes have no drawer to toggle.
  const isSharedRoute =
    pathname.startsWith("/shared/") ||
    (!pathname.startsWith("/local/") && Boolean(diagramId))
  const openDrawer = useVersionStore((s) => s.openDrawer)
  const closeDrawer = useVersionStore((s) => s.closeDrawer)
  const isOpen = useVersionStore((s) =>
    diagramId ? Boolean(s.drawerOpenByDiagram[diagramId]) : false
  )

  if (!diagramId || !isSharedRoute) return null

  return (
    <Tooltip>
      <TooltipTrigger
        className={navTriggerClass}
        style={{ color }}
        aria-label={t.drawerTitle}
        aria-pressed={isOpen}
        onClick={() =>
          isOpen ? closeDrawer(diagramId) : openDrawer(diagramId)
        }
      >
        <HistoryIcon className="size-4" aria-hidden />
        <span>{t.navMenuItem}</span>
      </TooltipTrigger>
      <TooltipContent>{t.fabTooltip}</TooltipContent>
    </Tooltip>
  )
}
