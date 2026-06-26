import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { HistoryIcon } from "lucide-react"
import { useLocation } from "@tanstack/react-router"
import { useVersionStore } from "@/stores/useVersionStore"
import { versioningStrings as t } from "@/components/versioning/strings"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"
import { useMediaQuery } from "@/hooks"
import { navbarButtonStyle } from "./styleConstants"

/** Props for the pure {@link VersionHistoryButtonView}. */
interface VersionHistoryButtonViewProps {
  /** Whether the version-history drawer is currently open (drives `aria-pressed`). */
  isOpen: boolean
  /** Fired when the user clicks the button to toggle the drawer. */
  onToggle: () => void
  /**
   * Foreground colour for the icon + label. Omitted on the chrome header (idles
   * muted, washes to `--apollon-chrome-text` on hover via `navbarButtonStyle`);
   * the mobile overflow menu passes `var(--apollon-primary-contrast)` so the
   * label stays legible on the themed dropdown. `FileMenu`/`HelpMenu`/
   * `SaveLocalCopyButton` follow the same convention.
   */
  color?: string
  /**
   * Icon-only presentation: the mobile pill passes `true` so the label is always
   * hidden and the tooltip always names it. The header leaves it `false`, so the
   * label collapses to the icon below `lg` and the tooltip shows only while
   * collapsed — never alongside the visible label.
   */
  iconOnly?: boolean
}

/**
 * Pure navbar entry point for the version-history drawer. Renders a tooltip
 * trigger that reflects the drawer's open state via `aria-pressed` and reports
 * clicks via `onToggle`. No store, no routing — see {@link VersionHistoryButton}.
 */
export function VersionHistoryButtonView({
  isOpen,
  onToggle,
  color,
  iconOnly = false,
}: VersionHistoryButtonViewProps) {
  // 1024px is Tailwind `lg`, the same breakpoint the label span collapses at.
  const isLg = useMediaQuery("(min-width: 1024px)")
  return (
    <Tooltip disabled={!iconOnly && isLg}>
      <TooltipTrigger
        className={navbarButtonStyle()}
        style={color ? { color } : undefined}
        // Same text as the tooltip, so the accessible name matches what sighted
        // users see on hover (and announces the keyboard shortcut to AT).
        aria-label={t.fabTooltip}
        aria-pressed={isOpen}
        onClick={onToggle}
      >
        <HistoryIcon className="size-4" aria-hidden />
        <span className={iconOnly ? "hidden" : "hidden lg:inline"}>
          {t.navMenuItem}
        </span>
      </TooltipTrigger>
      <TooltipContent>{t.fabTooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Props for the {@link VersionHistoryButton} container. */
interface VersionHistoryButtonProps {
  /** Icon-only presentation. See {@link VersionHistoryButtonView}. */
  iconOnly?: boolean
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
export const VersionHistoryButton = ({
  iconOnly,
}: VersionHistoryButtonProps) => {
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
    <VersionHistoryButtonView
      isOpen={isOpen}
      iconOnly={iconOnly}
      onToggle={() => (isOpen ? closeDrawer(diagramId) : openDrawer(diagramId))}
    />
  )
}
