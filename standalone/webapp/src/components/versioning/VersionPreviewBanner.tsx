import { Alert, Box, Button } from "@mui/material"
import { useState, type FC } from "react"
import {
  selectScopedPreview,
  selectVersions,
  useVersionStore,
} from "@/stores/useVersionStore"
import { versioningStrings as t } from "./strings"
import { relativeTime } from "./relativeTime"

/**
 * Compactness thresholds in **container pixels**, not viewport pixels.
 * The banner overlays the canvas column; that column's width depends on
 * whether the desktop sidebar is open (it shrinks the canvas by 320px),
 * whether devtools are docked, etc. Querying `window` widths gives the
 * wrong answer in any non-trivial layout.
 */
const COMPACT_WIDTH_PX = 768

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
  // Container-relative compactness (tightens icon/action gaps on a narrow
  // canvas column). Falls back to "not compact" until the first ResizeObserver
  // tick lands — first paint may be slightly off, then settles within a frame.
  const isSmall =
    containerWidth !== undefined && containerWidth < COMPACT_WIDTH_PX

  const preview = useVersionStore((s) => selectScopedPreview(s, diagramId))
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
        // Soft floating-chrome elevation, matching the island shadow language.
        boxShadow:
          "0 0 1px 0 rgb(15 23 42 / 20%), 0 2px 8px 0 rgb(15 23 42 / 12%)",
        // Compact, content-hugging pill (centred by the parent), not a 720px
        // slab — a single vertically-centred row of icon · message · actions.
        alignItems: "center",
        width: "max-content",
        maxWidth: "calc(100% - 16px)",
        px: 1.25,
        py: 0.5,
        "& .MuiAlert-icon": {
          py: 0,
          mr: isSmall ? 0.75 : 1,
          fontSize: "1.1rem",
          color: "var(--home-banner-warning-icon)",
        },
        "& .MuiAlert-message": { minWidth: 0, flex: 1, py: 0.25 },
        "& .MuiAlert-action": {
          p: 0,
          mr: 0,
          ml: isSmall ? 1 : 1.75,
          mt: 0,
          alignItems: "center",
          alignSelf: "center",
        },
      }}
      action={
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 0.5,
            alignItems: "center",
          }}
        >
          {/* Short labels for the compact pill. `whiteSpace: nowrap` prevents
              mid-word wraps so the two actions stay on one row. */}
          <Button
            onClick={onExit}
            size="small"
            sx={{
              textTransform: "none",
              fontFamily: "inherit",
              fontSize: "0.8125rem",
              px: 1,
              py: 0.25,
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
              size="small"
              sx={{
                textTransform: "none",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: "0.8125rem",
                px: 1.25,
                py: 0.25,
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
      {/* One concise line: "Read-only preview · 2h ago". The snapshot
          description rides along as a hover tooltip rather than a second row,
          so the banner stays a compact pill instead of a tall card. */}
      <Box
        title={label || undefined}
        sx={{
          fontWeight: 600,
          fontSize: "0.8125rem",
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}
      >
        Read-only preview{ago && ` · ${ago}`}
      </Box>
    </Alert>
  )
}
