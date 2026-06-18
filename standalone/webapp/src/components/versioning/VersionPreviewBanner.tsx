import { TriangleAlertIcon } from "lucide-react"
import { useState, type CSSProperties, type FC } from "react"
import { cn } from "@tumaet/ui/lib/utils"
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

interface ViewProps {
  /**
   * The version's user-facing label (description, falling back to name, then
   * the catch-all). Rendered under the title; empty hides the label row.
   */
  label: string
  /** Relative "time ago" of the previewed version (e.g. "2h ago"). */
  ago: string
  /** Id of the previewed version, handed back to {@link ViewProps.onRestore}. */
  versionId: string
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
  containerWidth?: number
  /** Called when the user clicks "Exit preview". */
  onExit: () => void
  /** Called with the version id when the user clicks "Restore". */
  onRestore: (versionId: string) => void | Promise<void>
  /** Merged onto the root element's classes. */
  className?: string
  /** Forwarded to the root element. */
  ref?: React.Ref<HTMLDivElement>
}

const BANNER_FONT =
  '"Poppins", "Avenir Next", "Avenir", "Segoe UI", "Helvetica Neue", Arial, sans-serif'

// The warning palette comes from the `--home-banner-warning-*` tokens, so the
// banner stays in the notification language across light/dark.
const buttonStyle: CSSProperties = {
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  border: "1px solid var(--home-banner-warning-btn-border)",
  backgroundColor: "var(--home-banner-warning-btn-bg)",
  color: "var(--home-banner-warning-btn-text)",
}

/**
 * Pure presentational preview banner — props in, callbacks out. A soft-gold
 * outlined warning alert with the two actions on the right. Hosting layout
 * overlays it on the canvas (see `ApollonWithConnection`), so the canvas
 * itself never reflows on preview enter/exit.
 */
export function VersionPreviewBannerView({
  label,
  ago,
  versionId,
  canRestore,
  containerWidth,
  onExit,
  onRestore,
  className,
  ref,
}: ViewProps) {
  // Container-relative compactness. Falls back to "not compact" until
  // the first ResizeObserver tick lands — first paint may be slightly
  // off, then settles within a frame.
  const isSmall =
    containerWidth !== undefined && containerWidth < COMPACT_WIDTH_PX
  const isNarrow =
    containerWidth !== undefined && containerWidth < STACKED_WIDTH_PX

  const [restoring, setRestoring] = useState(false)

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      // Fixed width so the banner doesn't reflow as the user clicks between
      // previews with different description lengths. Capped to viewport width
      // minus a small inset for narrow screens.
      className={cn(
        "flex w-[720px] max-w-[calc(100%-16px)] items-start gap-3 rounded-lg border",
        className
      )}
      style={{
        fontFamily: BANNER_FONT,
        backgroundColor: "var(--home-banner-warning-bg)",
        color: "var(--home-banner-warning-text)",
        borderColor: "var(--home-banner-warning-border)",
        boxShadow: "var(--home-shadow-overlay-box)",
        padding: isSmall ? "0.5rem 0.625rem" : "0.625rem 1rem",
        gap: isSmall ? "0.5rem" : "0.875rem",
      }}
    >
      <TriangleAlertIcon
        className="mt-0.5 size-4 shrink-0"
        style={{ color: "var(--home-banner-warning-icon)" }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div
          className="font-semibold"
          style={{
            fontSize: isSmall ? "0.875rem" : "0.9375rem",
            lineHeight: 1.35,
          }}
        >
          Read-only preview{ago && ` · ${ago}`}
        </div>
        {label && (
          <div
            className="overflow-hidden break-words whitespace-pre-wrap"
            style={{
              marginTop: "0.25rem",
              fontSize: isSmall ? "0.75rem" : "0.8125rem",
              lineHeight: 1.4,
              color: "var(--home-banner-warning-muted)",
              // Cap height tighter on small so the banner doesn't take over
              // the canvas with a long description.
              maxHeight: isSmall ? "2.8em" : "4.2em",
            }}
            title={label}
          >
            {label}
          </div>
        )}
      </div>

      {/* Full labels at every width. Stack vertically below ~480px so the
          message column gets its width back; buttons stay right-aligned and
          compact so the banner doesn't dominate the canvas. */}
      <div
        className="mt-0.5 flex shrink-0"
        style={{
          flexDirection: isNarrow ? "column" : "row",
          gap: isNarrow ? "0.5rem" : isSmall ? "0.25rem" : "0.5rem",
          alignItems: isNarrow ? "stretch" : "center",
          marginLeft: isSmall ? "0.5rem" : "1rem",
        }}
      >
        <button
          type="button"
          onClick={onExit}
          className="inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors hover:[background:var(--home-banner-warning-btn-hover)]"
          style={{
            ...buttonStyle,
            padding: isSmall ? "0.25rem 0.625rem" : "0.375rem 0.75rem",
            fontSize: isSmall ? "0.8125rem" : "0.875rem",
          }}
        >
          {t.exitPreview}
        </button>
        {canRestore && (
          <button
            type="button"
            disabled={restoring}
            onClick={async () => {
              setRestoring(true)
              try {
                await onRestore(versionId)
              } finally {
                setRestoring(false)
              }
            }}
            className="inline-flex cursor-pointer items-center justify-center rounded-md font-semibold transition-colors hover:[background:var(--home-banner-warning-btn-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              ...buttonStyle,
              padding: isSmall ? "0.375rem 0.75rem" : "0.5rem 1rem",
              fontSize: isSmall ? "0.8125rem" : "0.875rem",
            }}
          >
            {t.restoreThis}
          </button>
        )}
      </div>
    </div>
  )
}

interface ContainerProps {
  diagramId: string
  onExit: () => void
  onRestore: (versionId: string) => void | Promise<void>
  canRestore: boolean
  containerWidth?: number
  className?: string
}

/**
 * Thin container — reads the active preview + the matching version summary
 * from `useVersionStore` to resolve the label / time-ago, then renders
 * {@link VersionPreviewBannerView}. Renders nothing when no preview is active.
 */
export const VersionPreviewBanner: FC<ContainerProps> = ({
  diagramId,
  onExit,
  onRestore,
  canRestore,
  containerWidth,
  className,
}) => {
  const preview = useVersionStore((s) => s.preview)
  const versions = useVersionStore((s) => selectVersions(s, diagramId))
  if (!preview) return null

  const summary = versions.find((v) => v.id === preview.versionId)
  // Description is the user-facing label everywhere else; fall back to
  // `name` (carries pre-restore copy like "Before restoring 'X'") then to
  // the catch-all string.
  const label =
    summary?.description?.trim() || summary?.name?.trim() || t.unnamed
  const ago = summary ? relativeTime(summary.createdAt) : ""

  return (
    <VersionPreviewBannerView
      label={label}
      ago={ago}
      versionId={preview.versionId}
      canRestore={canRestore}
      containerWidth={containerWidth}
      onExit={onExit}
      onRestore={onRestore}
      className={className}
    />
  )
}
