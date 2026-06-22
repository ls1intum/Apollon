import { Box, Typography } from "@mui/material"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import CircleRoundedIcon from "@mui/icons-material/CircleRounded"
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined"
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded"
import type { FC } from "react"
import {
  selectScopedPreview,
  useVersionStore,
  type PendingVersion,
} from "@/stores/useVersionStore"
import { useClosePreview } from "@/hooks/useVersionPreviewUrlSync"
import { relativeTime } from "./relativeTime"
import {
  ROW_HOVER_BG,
  ROW_SELECTED_BG,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from "./theme"

interface Props {
  diagramId: string
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
  diagramId,
  hasChanges,
  latestSavedVersion,
}) => {
  const previewState = useVersionStore((s) => selectScopedPreview(s, diagramId))
  const closePreview = useClosePreview()

  if (previewState) {
    return (
      <Box
        component="button"
        type="button"
        onClick={() => closePreview()}
        sx={{
          display: "flex",
          width: "100%",
          alignItems: "flex-start",
          gap: 1.25,
          px: 2,
          py: 1.25,
          background: "transparent",
          border: 0,
          borderBottom: "1px solid var(--apollon-chrome-border)",
          color: TEXT_PRIMARY,
          cursor: "pointer",
          textAlign: "left",
          "&:hover": { background: ROW_HOVER_BG },
        }}
        aria-label="Return to current canvas"
      >
        <ArrowBackRoundedIcon
          fontSize="small"
          sx={{ mt: 0.25, color: TEXT_PRIMARY }}
          aria-hidden
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: TEXT_PRIMARY }}
          >
            Return to current
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: TEXT_MUTED, display: "block" }}
          >
            Previewing an earlier version
          </Typography>
        </Box>
      </Box>
    )
  }

  const upToDate = !hasChanges && Boolean(latestSavedVersion)
  let icon: typeof CheckCircleRoundedIcon
  let iconColor: string
  let title: string
  let subtitle: string

  if (!latestSavedVersion) {
    icon = CircleOutlinedIcon
    iconColor = TEXT_MUTED
    title = "Current"
    subtitle = "Not yet saved as a version"
  } else if (upToDate) {
    icon = CheckCircleRoundedIcon
    // Theme-aware success green (shared with the success toast) so the check
    // reads correctly + consistently in both light and dark.
    iconColor = "var(--home-toast-success)"
    title = "Current"
    subtitle = `Up to date · last saved ${relativeTime(latestSavedVersion.createdAt)}`
  } else {
    icon = CircleRoundedIcon
    // Theme-aware warning amber (shared with the warning toast), signaling
    // "there's something to capture" without alarm — HEAD is autosaved every
    // 5 s, so this is "not yet a version," not "at risk."
    iconColor = "var(--home-toast-warning)"
    title = "Current"
    subtitle = `Edits since last save · ${relativeTime(latestSavedVersion.createdAt)}`
  }

  const Icon = icon

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        px: 2,
        py: 1.25,
        bgcolor: ROW_SELECTED_BG,
        borderBottom: "1px solid var(--apollon-chrome-border)",
        // Accent left-rule marks HEAD ("you are here") — the one place the
        // brand accent appears in the list; saved rows stay neutral.
        boxShadow: "inset 3px 0 0 var(--apollon-chrome-accent)",
      }}
      aria-label="Current canvas"
      aria-live="polite"
    >
      <Icon fontSize="small" sx={{ mt: 0.25, color: iconColor }} aria-hidden />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: TEXT_PRIMARY }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: TEXT_MUTED, display: "block" }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  )
}
