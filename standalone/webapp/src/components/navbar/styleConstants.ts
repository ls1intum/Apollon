import type { SxProps, Theme } from "@mui/material/styles"

export const NAVBAR_DROP_SHADOW = "var(--apollon-chrome-shadow-docked)"

// Single source of truth for the app header height — keeps the home dashboard
// and the in-editor navbars (desktop + mobile) the same height everywhere.
export const NAVBAR_MIN_HEIGHT = 52

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
  "&:active": {
    backgroundColor: "var(--apollon-chrome-surface-active)",
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
