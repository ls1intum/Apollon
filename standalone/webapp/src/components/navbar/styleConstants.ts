import type { SxProps, Theme } from "@mui/material/styles"
import { NAVBAR_BACKGROUND_COLOR, secondary } from "@/constants"

export const NAVBAR_DROP_SHADOW = "0 1px 3px rgba(15, 23, 42, 0.16)"

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
 * link: compact, no uppercase, and the same hover. `onDark` (the desktop bar)
 * idles in the muted `secondary` grey and brightens to white on hover with a
 * translucent fill; otherwise (the light mobile menu) it tints the surface.
 * Inner text/icons must use `currentColor` so the hover colour reaches them.
 */
export const navbarButtonSx = (
  fg: string,
  onDark: boolean
): SxProps<Theme> => ({
  textTransform: "none",
  minWidth: 0,
  gap: 0.5,
  px: 1,
  py: 0.5,
  fontSize: "0.875rem",
  fontWeight: 500,
  lineHeight: 1.25,
  borderRadius: "var(--home-radius-md)",
  color: fg,
  "& .MuiButton-startIcon": { mx: 0 },
  "&:hover": onDark
    ? { backgroundColor: "rgba(255, 255, 255, 0.1)", color: "#fff" }
    : { backgroundColor: "var(--apollon-background-variant)" },
})

/** Desktop bar omits an explicit colour → muted grey on the dark bar; the
 * mobile menu passes a colour → that colour on the light surface. */
export const navbarButtonStyle = (color?: string): SxProps<Theme> =>
  navbarButtonSx(color ?? secondary, !color)

export const APP_NAME_FONT_FAMILY =
  '"Poppins", "Avenir Next", "Avenir", "Segoe UI", "Helvetica Neue", Arial, sans-serif'

export const NAVBAR_SX: SxProps<Theme> = {
  position: "sticky",
  top: 0,
  zIndex: (theme) => theme.zIndex.appBar,
  bgcolor: NAVBAR_BACKGROUND_COLOR,
  backgroundImage: "none",
  borderBottom: "none",
  boxShadow: NAVBAR_DROP_SHADOW,
}
