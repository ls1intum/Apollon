import { Alert, Box, Button } from "@mui/material"
import { useState, type FC } from "react"
import { selectVersions, useVersionStore } from "@/stores/useVersionStore"
import { versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"

/**
 * Compactness thresholds in **container pixels**, not viewport pixels.
 * The banner overlays the canvas column; that column's width depends on
 * whether the desktop sidebar is open (it shrinks the canvas by 320px),
 * whether devtools are docked, etc. Querying `window` widths gives the
 * wrong answer in any non-trivial layout. The values still echo the
 * common phone/phablet thresholds — they're chosen for readability of
 * the banner's content (icon + title + 2 buttons) at given widths.
 */
const COMPACT_WIDTH_PX = 768
const STACKED_WIDTH_PX = 480

interface Props {
  diagramId: string
  onExit: () => void
  onRestore: (versionId: string) => void | Promise<void>
  /**
   * False when restoring this version would not change the canvas — e.g.
   * the user clicked the latest saved version with no unsaved local
   * edits. The Restore button is hidden in that case so the only
   * affordance is "Exit". When the user has unsaved changes, this is
   * true even on the latest version (Restore = "discard unsaved work").
   */
  canRestore: boolean
  /**
   * Measured width of the banner's container (typically the canvas
   * column). When `undefined` the banner falls back to its desktop
   * layout — first paint may be off for a frame, then settles.
   */
  containerWidth: number | undefined
}

/**
 * Compact preview banner. Standard MUI `<Alert severity="warning">` with
 * the two actions in `action`. Hosting layout overlays it on the canvas
 * (see `ApollonWithConnection`), so the canvas itself never reflows on
 * preview enter/exit.
 */
export const VersionPreviewBanner: FC<Props> = ({
  diagramId,
  onExit,
  onRestore,
  canRestore,
  containerWidth,
}) => {
  // Container-relative compactness. Falls back to "not compact" until
  // the first ResizeObserver tick lands — first paint may be slightly
  // off, then settles within a frame.
  const isSmall =
    containerWidth !== undefined && containerWidth < COMPACT_WIDTH_PX
  const isNarrow =
    containerWidth !== undefined && containerWidth < STACKED_WIDTH_PX

  const preview = useVersionStore((s) => s.preview)
  const versions = useVersionStore((s) => selectVersions(s, diagramId))
  const [restoring, setRestoring] = useState(false)
  if (!preview) return null

  const summary = versions.find((v) => v.id === preview.versionId)
  // Description is the user-facing label everywhere else; fall back to
  // `name` (carries pre-restore copy like "Before restoring 'X'") then to
  // the catch-all string.
  const label =
    summary?.description?.trim() || summary?.name?.trim() || t.unnamed
  const ago = summary ? relativeTime(summary.createdAt) : ""

  return (
    <Alert
      severity="warning"
      variant="filled"
      role="status"
      aria-live="polite"
      sx={{
        // Soft-gold outlined warning: tinted body, gold border, neutral text,
        // amber icon. Poppins + lg radius to match the notification language.
        fontFamily:
          '"Poppins", "Avenir Next", "Avenir", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        bgcolor: "var(--home-banner-warning-bg)",
        color: "var(--home-banner-warning-text)",
        border: "1px solid var(--home-banner-warning-border)",
        borderRadius: "var(--home-radius-lg)",
        boxShadow: "0 12px 32px var(--home-shadow-overlay)",
        alignItems: "flex-start",
        // Fixed width so the banner doesn't reflow as the user clicks
        // between previews with different description lengths. Capped to
        // viewport width minus a small inset for narrow screens.
        width: 720,
        maxWidth: "calc(100% - 16px)",
        px: isSmall ? 1.25 : 2,
        py: isSmall ? 1 : 1.25,
        "& .MuiAlert-icon": {
          py: 0.5,
          mr: isSmall ? 1 : 1.75,
          color: "var(--home-banner-warning-icon)",
        },
        "& .MuiAlert-message": { minWidth: 0, flex: 1, py: 0.5 },
        // Generous breathing room between the message block and the
        // actions. Pinned to the top so the buttons stay anchored when
        // a long description makes the message column grow taller —
        // they don't drift down with the banner. Tighter gap on small.
        //
        // `mr: 0` overrides MUI's default `marginRight: -8px` on the
        // action slot (designed to compensate for icon-button padding
        // we don't have here). Without the override, our text buttons
        // sit ~8px from the alert's right edge instead of honoring the
        // alert's own `pr` — visually too tight against the boundary.
        "& .MuiAlert-action": {
          p: 0,
          mr: 0,
          ml: isSmall ? 1.25 : 4,
          mt: 0.5,
          alignItems: "flex-start",
          alignSelf: "flex-start",
        },
      }}
      action={
        <Box
          sx={{
            display: "flex",
            // Stack vertically below ~480px so the message column gets
            // its width back. Buttons remain right-aligned and compact —
            // not full-width — so the banner doesn't dominate the canvas.
            flexDirection: isNarrow ? "column" : "row",
            gap: isNarrow ? 0.5 : isSmall ? 0.25 : 1,
            alignItems: isNarrow ? "stretch" : "center",
          }}
        >
          {/* Full labels at every width. The narrow-viewport label
              swap ("Exit"/"Restore") felt clipped — and once we stack
              the actions vertically below 480px, each button has its
              own row anyway, so there's no horizontal pressure that
              required the abbreviation. `whiteSpace: nowrap` prevents
              awkward mid-word wraps in the side-by-side compact case. */}
          <Button
            onClick={onExit}
            size={isSmall ? "small" : "medium"}
            sx={{
              textTransform: "none",
              fontFamily: "inherit",
              px: isSmall ? 1.25 : 1.5,
              minWidth: 0,
              whiteSpace: "nowrap",
              border: "1px solid var(--home-banner-warning-btn-border)",
              bgcolor: "var(--home-banner-warning-btn-bg)",
              color: "var(--home-banner-warning-btn-text)",
              "&:hover": {
                bgcolor: "var(--home-banner-warning-btn-hover)",
              },
            }}
          >
            {t.exitPreview}
          </Button>
          {canRestore && (
            <Button
              disableElevation
              disabled={restoring}
              onClick={async () => {
                setRestoring(true)
                try {
                  await onRestore(preview.versionId)
                } finally {
                  setRestoring(false)
                }
              }}
              size={isSmall ? "small" : "medium"}
              sx={{
                textTransform: "none",
                fontFamily: "inherit",
                fontWeight: 600,
                px: isSmall ? 1.5 : 2,
                minWidth: 0,
                whiteSpace: "nowrap",
                border: "1px solid var(--home-banner-warning-btn-border)",
                bgcolor: "var(--home-banner-warning-btn-bg)",
                color: "var(--home-banner-warning-btn-text)",
                "&:hover": {
                  bgcolor: "var(--home-banner-warning-btn-hover)",
                },
              }}
            >
              {t.restoreThis}
            </Button>
          )}
        </Box>
      }
    >
      <Box
        sx={{
          fontWeight: 600,
          fontSize: isSmall ? "0.875rem" : "0.9375rem",
          lineHeight: 1.35,
        }}
      >
        Read-only preview{ago && ` · ${ago}`}
      </Box>
      {label && (
        <Box
          sx={{
            mt: 0.5,
            fontSize: isSmall ? "0.75rem" : "0.8125rem",
            lineHeight: 1.4,
            color: "var(--home-banner-warning-muted)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            // Cap height tighter on small so the banner doesn't take over
            // the canvas with a long description.
            maxHeight: isSmall ? "2.8em" : "4.2em",
            overflow: "hidden",
          }}
          title={label}
        >
          {label}
        </Box>
      )}
    </Alert>
  )
}
