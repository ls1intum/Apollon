import React from "react"
import { Typography } from "@/components/ui"
import { ColorEditorGroupProvider } from "@/components/styleEditor/ColorEditorGroup"

/**
 * Shared layout primitives for node/edge edit popovers.
 *
 * Top diagram editors (Lucidchart, draw.io, Figma's inspector) give every
 * edit panel the same skeleton: a header, then titled groups of controls on a
 * single consistent spacing scale. These primitives provide that skeleton so
 * individual popovers stop hand-rolling `display:flex; gap:N` wrappers with
 * per-file magic numbers.
 *
 * Spacing scale (keep popovers on these, don't invent new gaps):
 *   - GAP between sections in a layout: 12
 *   - GAP between controls inside a section: 8
 */

const SECTION_GAP = 12
const FIELD_GAP = 8

interface PopoverLayoutProps {
  /** Optional title shown at the top of the popover (e.g. "Sequence Flow"). */
  title?: React.ReactNode
  children: React.ReactNode
}

/** Root vertical stack for a popover's contents, with an optional header. */
export const PopoverLayout: React.FC<PopoverLayoutProps> = ({
  title,
  children,
}) => (
  <ColorEditorGroupProvider>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: SECTION_GAP,
        width: "100%",
      }}
    >
      {title && (
        <Typography
          variant="subtitle2"
          sx={{
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </div>
  </ColorEditorGroupProvider>
)

interface PopoverSectionProps {
  /** Optional group label (e.g. "Source", "Connection"). */
  title?: React.ReactNode
  /** Element rendered on the right of the title row (e.g. an icon button). */
  action?: React.ReactNode
  /** Draw a hairline divider above the section. Default `false`. */
  divider?: boolean
  children: React.ReactNode
}

/** A titled group of controls with consistent inner spacing. */
export const PopoverSection: React.FC<PopoverSectionProps> = ({
  title,
  action,
  divider = false,
  children,
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: FIELD_GAP,
      ...(divider
        ? {
            borderTop: "1px solid var(--popover-divider, #d1d5dc)",
            paddingTop: SECTION_GAP,
          }
        : {}),
    }}
  >
    {(title || action) && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 24,
          gap: FIELD_GAP,
        }}
      >
        {title ? (
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        ) : (
          <span />
        )}
        {action}
      </div>
    )}
    {children}
  </div>
)

/**
 * Whether an edge's endpoint names are worth showing to the user: both must be
 * present and distinct. When either is missing or they're identical, naming
 * them adds noise (e.g. "Source → Source"), so callers should fall back to
 * generic wording and hide the Connection section.
 */
export const hasDistinctEndpointNames = (
  source?: string,
  target?: string
): boolean => {
  const s = source?.trim()
  const t = target?.trim()
  return Boolean(s && t && s !== t)
}

/**
 * The "Source → Target" relationship line shared by every directed-edge
 * popover. Renders nothing unless both endpoint names are present and distinct.
 */
export const ConnectionInfo: React.FC<{
  source?: string
  target?: string
}> = ({ source, target }) =>
  hasDistinctEndpointNames(source, target) ? (
    <Typography variant="body2" sx={{ opacity: 0.7 }}>
      {source} → {target}
    </Typography>
  ) : null

/**
 * Header for an assessment box: "Assessment for <type>" with the assessed
 * element's name shown in a highlighted chip (instead of quotation marks), and
 * an optional action (e.g. a delete button) pinned to the right.
 */
export const AssessmentHeader: React.FC<{
  type: string
  name: string
  action?: React.ReactNode
}> = ({ type, name, action }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: FIELD_GAP,
    }}
  >
    {/* One flowing sentence: the name is an inline highlighted span, so it
        wraps as part of the text instead of floating to its own line. */}
    <Typography variant="subtitle2" sx={{ flex: 1 }}>
      Assessment for {type}
      {name && " "}
      {name && <span data-slot="assessment-name-chip">{name}</span>}
    </Typography>
    {action}
  </div>
)
