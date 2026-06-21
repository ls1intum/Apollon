import { cn } from "@tumaet/ui/lib/utils"

export const NAVBAR_DROP_SHADOW = "var(--apollon-chrome-shadow-docked)"

// Single source of truth for the app header height — keeps the home dashboard
// header and the editor chrome header the same height everywhere.
export const NAVBAR_MIN_HEIGHT = 52

/**
 * Shared Tailwind classes for every text action button in the header (File,
 * Share, Help, Version history, Save copy) so they all match the `BackNav`
 * "All diagrams" link: compact, no uppercase, and the same hover. Idles in
 * muted chrome text and washes toward the chrome hover surface on hover/focus.
 * Inner text/icons use `currentColor` so the hover colour reaches them.
 *
 * Returns a className string (shadcn idiom) rather than an MUI `SxProps`: pass
 * it to a `@tumaet/ui` Button / DropdownMenuTrigger via `className`, and merge
 * extra classes through the argument (it runs through `cn`, so callers can
 * override). The idle/hover foreground is the muted chrome token by default;
 * the mobile overflow menu pins an explicit `var(--apollon-primary-contrast)`
 * foreground via `style={{ color }}` so the label stays legible on the themed
 * dropdown — this helper never sets the idle colour inline, leaving callers
 * free to override it.
 */
export const navbarButtonStyle = (className?: string): string =>
  cn(
    "inline-flex min-w-0 cursor-pointer items-center gap-1 whitespace-nowrap",
    // Same 32px box, 6px radius and focus-ring as the icon buttons
    // (.apollon-chrome-iconbtn) so text + icon controls read as one family.
    "min-h-[var(--apollon-chrome-btn)] rounded-[var(--apollon-chrome-radius-sm)] px-2 py-1",
    "border-0 bg-transparent text-sm leading-tight font-medium normal-case",
    "text-[color:var(--apollon-chrome-text-muted)] transition-colors",
    "hover:bg-[var(--apollon-chrome-surface-hover)] hover:text-[color:var(--apollon-chrome-text)]",
    "active:bg-[var(--apollon-chrome-surface-active)]",
    "focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none",
    className
  )

export const APP_NAME_FONT_FAMILY =
  '"Poppins", "Avenir Next", "Avenir", "Segoe UI", "Helvetica Neue", Arial, sans-serif'
