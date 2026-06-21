import type { SxProps, Theme } from "@mui/material/styles"

export const NAVBAR_DROP_SHADOW = "var(--apollon-chrome-shadow-docked)"

// Single source of truth for the app header height — keeps the home dashboard
// and the in-editor navbars (desktop + mobile) the same height everywhere.
export const NAVBAR_MIN_HEIGHT = 52

/**
 * Toolbar height for the editor navbars. MUI's `regular` Toolbar variant
 * re-imposes `min-height: 64px` at ≥600px (via `theme.mixins.toolbar`), which
 * silently overrides a plain `minHeight`, so the editor bar would stay 64px
 * while the home `<header>` is 52px. Override that exact breakpoint so both
 * headers are the same height at every width.
 */
export const NAVBAR_TOOLBAR_SX = {
  minHeight: NAVBAR_MIN_HEIGHT,
  "@media (min-width:600px)": { minHeight: NAVBAR_MIN_HEIGHT },
}

/**
 * Shared style for every action button in the navbars (File, Share, Help,
 * Version history, Save copy) so they all match the `BackNav` "All diagrams"
 * link: compact, no uppercase, and the same hover. One theme-reactive idiom now
 * that the header is a light themed surface (not a dark plate): idle in muted
 * chrome text, wash toward the chrome hover surface on hover/focus. Inner
 * text/icons use `currentColor` so the hover colour reaches them.
 */
export const navbarButtonSx = (fg?: string): SxProps<Theme> => ({
  textTransform: "none",
  minWidth: 0,
  gap: 0.5,
  px: 1,
  py: 0.5,
  fontSize: "0.875rem",
  fontWeight: 500,
  lineHeight: 1.25,
  borderRadius: "var(--apollon-chrome-radius-md)",
  color: fg ?? "var(--apollon-chrome-text-muted)",
  "& .MuiButton-startIcon": { mx: 0 },
  "&:hover": {
    backgroundColor: "var(--apollon-chrome-surface-hover)",
    color: "var(--apollon-chrome-text)",
  },
  "&:focus-visible": {
    outline: "2px solid var(--apollon-chrome-accent)",
    outlineOffset: "2px",
  },
})

/** `color` lets the mobile menu pin an explicit colour; otherwise the shared
 * muted-chrome idiom applies (desktop bar + light popover are now identical). */
export const navbarButtonStyle = (color?: string): SxProps<Theme> =>
  navbarButtonSx(color)

export const APP_NAME_FONT_FAMILY =
  '"Poppins", "Avenir Next", "Avenir", "Segoe UI", "Helvetica Neue", Arial, sans-serif'

export const NAVBAR_SX: SxProps<Theme> = {
  position: "sticky",
  top: 0,
  // Span the full width of the header band. Without this the AppBar shrink-wraps
  // to its content inside the flex band, so a short diagram title would leave the
  // bar (and its right-aligned options button) only as wide as the content —
  // colliding with the floating palette. Full width keeps the options button at
  // the far right, clear of the palette.
  width: "100%",
  zIndex: (theme) => theme.zIndex.appBar,
  // Glass material — the canvas is full-bleed behind this band, so the same
  // translucent tint floor + backdrop blur the palette/controls use reads as
  // glass here too, making the mobile bar one family with the rest of the chrome.
  bgcolor: "var(--apollon-chrome-glass)",
  backdropFilter: "var(--apollon-chrome-glass-blur)",
  WebkitBackdropFilter: "var(--apollon-chrome-glass-blur)",
  color: "var(--apollon-chrome-text)",
  backgroundImage: "none",
  // Hairline drawn as an inset shadow (not a border) so it doesn't add to the
  // header's height — the mobile/safe-area height budgets stay exact.
  borderBottom: "none",
  boxShadow:
    "inset 0 -1px 0 var(--apollon-chrome-border), var(--apollon-chrome-shadow-docked)",
}
