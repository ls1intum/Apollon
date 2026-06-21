import type { SxProps, Theme } from "@mui/material/styles"

export const NAVBAR_DROP_SHADOW = "var(--apollon-chrome-shadow-docked)"

// Single source of truth for the app header height — keeps the home dashboard
// header and the editor chrome header the same height everywhere.
export const NAVBAR_MIN_HEIGHT = 52

/**
 * Shared style for every action button in the header (File, Share, Help,
 * Version history, Save copy) so they all match the `BackNav` "All diagrams"
 * link: compact, no uppercase, and the same hover. Idles in muted chrome text
 * and washes toward the chrome hover surface on hover/focus. `color` lets the
 * mobile menu pin an explicit foreground; inner text/icons use `currentColor`
 * so the hover colour reaches them.
 */
export const navbarButtonStyle = (fg?: string): SxProps<Theme> => ({
  textTransform: "none",
  // Labels never wrap to a second line inside a glass island.
  whiteSpace: "nowrap",
  minWidth: 0,
  // Same 32px box, 6px radius and focus-ring as the icon buttons
  // (.apollon-chrome-iconbtn) so text + icon controls read as one family.
  minHeight: "var(--apollon-chrome-btn)",
  display: "inline-flex",
  alignItems: "center",
  gap: 0.5,
  px: 1,
  py: 0.5,
  fontSize: "0.875rem",
  fontWeight: 500,
  lineHeight: 1.25,
  borderRadius: "var(--apollon-chrome-radius-sm)",
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
    outline: "none",
    boxShadow:
      "0 0 0 2px color-mix(in srgb, var(--apollon-chrome-accent) 45%, transparent)",
  },
})

export const APP_NAME_FONT_FAMILY =
  '"Poppins", "Avenir Next", "Avenir", "Segoe UI", "Helvetica Neue", Arial, sans-serif'
