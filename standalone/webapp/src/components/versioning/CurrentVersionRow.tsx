import {
  CheckCircle2Icon,
  CircleIcon,
  ArrowLeftIcon,
  type LucideIcon,
} from "lucide-react"
import type { CSSProperties, FC } from "react"
import { cn } from "@tumaet/ui/lib/utils"
import { useVersionStore, type PendingVersion } from "@/stores/useVersionStore"
import { relativeTime } from "./relativeTime"
import {
  ROW_HOVER_BG,
  ROW_SELECTED_BG,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "./theme"

interface ViewProps {
  /**
   * `true` when the editor's current state vector differs from the SV at
   * the time of the last snapshot. This is the same signal that gates the
   * Save button — passed in (rather than recomputed) so the two stay in
   * lock-step on every Yjs update.
   */
  hasChanges: boolean
  /** The latest non-pending, non-failed version, if any. */
  latestSavedVersion?: PendingVersion
  /**
   * `true` while an earlier version is being previewed. The row morphs into
   * a "Return to current" affordance that calls {@link ViewProps.onExitPreview}.
   */
  isPreviewing: boolean
  /** Called when the user clicks the "Return to current" affordance. */
  onExitPreview: () => void
  /** Merged onto the root element's classes. */
  className?: string
  /** Forwarded to the root element. */
  ref?: React.Ref<HTMLDivElement>
}

const ROW_BORDER = "1px solid var(--home-on-dark-border)"

/**
 * Pure presentational HEAD pseudo-row ("you are here"). Props in, callbacks
 * out — no store, no router. Three resting states:
 *
 *   ✓ green  — current canvas matches the last snapshot
 *   ●  amber — there are edits since the last snapshot
 *   ○  muted — no snapshot exists yet
 *
 * While previewing, the row morphs into a "Return to current" button that
 * reports `onExitPreview`. This keeps the "current state" surface in one
 * place; users always know where to click to come back.
 *
 * Note on the "saved" semantic: HEAD is autosaved every 5 s regardless,
 * so the user's work isn't at risk between auto-versions. The dot tracks
 * "has been captured as a version-history row," not "persisted to disk."
 * Copy is chosen to convey that without alarming users — "Edits since
 * last save" is accurate; "Unsaved" would be misleading.
 */
export function CurrentVersionRowView({
  hasChanges,
  latestSavedVersion,
  isPreviewing,
  onExitPreview,
  className,
  ref,
}: ViewProps) {
  if (isPreviewing) {
    return (
      <button
        type="button"
        onClick={onExitPreview}
        className={cn(
          "flex w-full cursor-pointer items-start gap-2.5 border-0 bg-transparent px-4 py-2.5 text-left transition-colors [&:hover]:[background:var(--row-hover-bg)]",
          className
        )}
        style={
          {
            color: TEXT_PRIMARY,
            borderBottom: ROW_BORDER,
            "--row-hover-bg": ROW_HOVER_BG,
          } as CSSProperties
        }
        aria-label="Return to current canvas"
      >
        <ArrowLeftIcon
          className="mt-0.5 size-4"
          style={{ color: TEXT_PRIMARY }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div
            className="text-sm font-semibold"
            style={{ color: TEXT_PRIMARY }}
          >
            Return to current
          </div>
          <div className="text-xs" style={{ color: TEXT_MUTED }}>
            Previewing an earlier version
          </div>
        </div>
      </button>
    )
  }

  const upToDate = !hasChanges && Boolean(latestSavedVersion)
  let icon: LucideIcon
  let iconColor: string
  let title: string
  let subtitle: string

  if (!latestSavedVersion) {
    icon = CircleIcon
    iconColor = TEXT_MUTED
    title = "Current"
    subtitle = "Not yet saved as a version"
  } else if (upToDate) {
    icon = CheckCircle2Icon
    // Tailwind-ish green that reads on dark bg without theming.
    iconColor = "#5cb47a"
    title = "Current"
    subtitle = `Up to date · last saved ${relativeTime(latestSavedVersion.createdAt)}`
  } else {
    icon = CircleIcon
    // Amber, signaling "there's something to capture" without alarm — HEAD
    // is autosaved every 5 s, so this is "not yet a version," not "at risk."
    iconColor = "#e8a857"
    title = "Current"
    subtitle = `Edits since last save · ${relativeTime(latestSavedVersion.createdAt)}`
  }

  const Icon = icon
  // The amber/edits state uses a filled dot; the others an outline/check.
  const fillIcon = Boolean(latestSavedVersion) && !upToDate

  return (
    <div
      ref={ref}
      className={cn("flex items-start gap-2.5 px-4 py-2.5", className)}
      style={{ background: ROW_SELECTED_BG, borderBottom: ROW_BORDER }}
      aria-label="Current canvas"
      aria-live="polite"
    >
      <Icon
        className="mt-0.5 size-4"
        style={{ color: iconColor, fill: fillIcon ? iconColor : "none" }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
          {title}
        </div>
        <div className="text-xs" style={{ color: TEXT_MUTED }}>
          {subtitle}
        </div>
      </div>
    </div>
  )
}

type ContainerProps = Pick<
  ViewProps,
  "hasChanges" | "latestSavedVersion" | "className"
>

/**
 * Thin container — reads preview state from `useVersionStore` and renders
 * {@link CurrentVersionRowView}. Existing call sites keep working unchanged.
 */
export const CurrentVersionRow: FC<ContainerProps> = ({
  hasChanges,
  latestSavedVersion,
  className,
}) => {
  const previewState = useVersionStore((s) => s.preview)
  const exitPreview = useVersionStore((s) => s.exitPreview)

  return (
    <CurrentVersionRowView
      hasChanges={hasChanges}
      latestSavedVersion={latestSavedVersion}
      isPreviewing={Boolean(previewState)}
      onExitPreview={exitPreview}
      className={className}
    />
  )
}
