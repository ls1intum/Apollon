import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { cn } from "@tumaet/ui/lib/utils"
import { HistoryIcon } from "lucide-react"
import { useLocation } from "react-router"
import { useVersionStore } from "@/stores/useVersionStore"
import { secondary } from "@/constants"
import { versioningStrings as t } from "@/components/versioning/strings"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"
import { navTriggerClass } from "./styles"

/**
 * Foreground palette for the navbar text-button triggers.
 * - `onDark` — the always-dark desktop bar (muted `secondary` gray).
 * - `onSurface` — the themed mobile dropdown (`--apollon-primary-contrast`,
 *   legible in both light and dark mode).
 *
 * Matches the `tone` union used by `BackNav` and the other navbar children.
 */
type NavTone = "onDark" | "onSurface"

const toneColor: Record<NavTone, string> = {
  onDark: secondary,
  onSurface: "var(--apollon-primary-contrast)",
}

/** Props for the pure {@link VersionHistoryButtonView}. */
interface VersionHistoryButtonViewProps {
  /** Whether the version-history drawer is currently open (drives `aria-pressed`). */
  isOpen: boolean
  /** Fired when the user clicks the button to toggle the drawer. */
  onToggle: () => void
  /** Foreground palette for the surface this lives on. Defaults to `onDark`. */
  tone?: NavTone
  /** Merged with the component's own classes. */
  className?: string
}

/**
 * Pure navbar entry point for the version-history drawer. Renders a tooltip
 * trigger that reflects the drawer's open state via `aria-pressed` and reports
 * clicks via `onToggle`. No store, no routing — see {@link VersionHistoryButton}.
 */
export function VersionHistoryButtonView({
  isOpen,
  onToggle,
  tone = "onDark",
  className,
}: VersionHistoryButtonViewProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(navTriggerClass, className)}
        style={{ color: toneColor[tone] }}
        aria-label={t.drawerTitle}
        aria-pressed={isOpen}
        onClick={onToggle}
      >
        <HistoryIcon className="size-4" aria-hidden />
        <span>{t.navMenuItem}</span>
      </TooltipTrigger>
      <TooltipContent>{t.fabTooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Props for the {@link VersionHistoryButton} container. */
interface VersionHistoryButtonProps {
  /** Foreground palette for the surface this lives on. Defaults to `onDark`. */
  tone?: NavTone
}

/**
 * Discoverable navbar entry point for the version-history sidebar.
 *
 * Renders only on a shared/connected diagram route, where the version drawer
 * is actually mounted (ApollonWithConnection). Local diagrams (`/local/:id`)
 * and `/` have no versioning backend or drawer, so the button is hidden —
 * the user must Share first.
 */
export const VersionHistoryButton = ({
  tone = "onDark",
}: VersionHistoryButtonProps) => {
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
    <VersionHistoryButtonView
      isOpen={isOpen}
      tone={tone}
      onToggle={() => (isOpen ? closeDrawer(diagramId) : openDrawer(diagramId))}
    />
  )
}
