import {
  CheckCircle2Icon,
  CircleIcon,
  ArrowLeftIcon,
  type LucideIcon,
} from "lucide-react"
import type { CSSProperties, FC } from "react"
import { useVersionStore, type PendingVersion } from "@/stores/useVersionStore"
import { relativeTime } from "./relativeTime"
import {
  ROW_HOVER_BG,
  ROW_SELECTED_BG,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "./theme"

interface Props {
  /**
   * `true` when the editor's current state vector differs from the SV at
   * the time of the last snapshot. This is the same signal that gates the
   * Save button — passed in (rather than recomputed) so the two stay in
   * lock-step on every Yjs update.
   */
  hasChanges: boolean
  /** The latest non-pending, non-failed version, if any. */
  latestSavedVersion: PendingVersion | undefined
}

const ROW_BORDER = "1px solid var(--home-on-dark-border)"

/**
 * Pseudo-row at the top of the sidebar that represents HEAD ("you are
 * here"). Three states:
 *
 *   ✓ green  — current canvas matches the last snapshot
 *   ●  amber — there are edits since the last snapshot
 *   ○  muted — no snapshot exists yet
 *
 * During preview, the row morphs into a "Return to current" affordance —
 * clicking exits preview. This keeps the "current state" surface in one
 * place; users always know where to click to come back.
 *
 * Note on the "saved" semantic: HEAD is autosaved every 5 s regardless,
 * so the user's work isn't at risk between auto-versions. The dot tracks
 * "has been captured as a version-history row," not "persisted to disk."
 * Copy is chosen to convey that without alarming users — "Edits since
 * last save" is accurate; "Unsaved" would be misleading.
 */
export const CurrentVersionRow: FC<Props> = ({
  hasChanges,
  latestSavedVersion,
}) => {
  const previewState = useVersionStore((s) => s.preview)
  const exitPreview = useVersionStore((s) => s.exitPreview)

  if (previewState) {
    return (
      <button
        type="button"
        onClick={() => exitPreview()}
        className="flex w-full cursor-pointer items-start gap-2.5 border-0 bg-transparent px-4 py-2.5 text-left transition-colors [&:hover]:[background:var(--row-hover-bg)]"
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
      className="flex items-start gap-2.5 px-4 py-2.5"
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
