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
   * label stays legible on the themed dropdown. `NavbarFile`/`NavbarHelp`/
   * `SaveLocalCopyButton` follow the same convention.
   */
  color?: string
  /**
   * Classes for the label span — the header passes `"hidden lg:inline"` to
   * collapse to the icon when space is tight; the mobile menu omits it so the
   * label always shows.
   */
  labelClassName?: string
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
  labelClassName,
}: VersionHistoryButtonViewProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={navbarButtonStyle()}
        style={color ? { color } : undefined}
        aria-label={t.drawerTitle}
        aria-pressed={isOpen}
        onClick={onToggle}
      >
        <HistoryIcon className="size-4" aria-hidden />
        <span className={labelClassName}>{t.navMenuItem}</span>
      </TooltipTrigger>
      <TooltipContent>{t.fabTooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Props for the {@link VersionHistoryButton} container. */
interface Props {
  /** Foreground colour for the icon + label. See {@link VersionHistoryButtonView}. */
  color?: string
  /** Classes for the label span. See {@link VersionHistoryButtonView}. */
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
    <VersionHistoryButtonView
      isOpen={isOpen}
      color={color}
      labelClassName={labelClassName}
      onToggle={() => (isOpen ? closeDrawer(diagramId) : openDrawer(diagramId))}
    />
  )
}
