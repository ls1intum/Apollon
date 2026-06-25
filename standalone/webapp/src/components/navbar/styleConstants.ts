import { cn } from "@tumaet/ui/lib/utils"

export const NAVBAR_DROP_SHADOW = "var(--apollon-chrome-shadow-docked)"

// Single source of truth for the app header height — keeps the home dashboard
// header and the editor chrome header the same height everywhere.
export const NAVBAR_MIN_HEIGHT = 52

/**
 * Shared Tailwind classes for every text action button in the header (File,
 * Share, Help, Version history, Save copy) so they all match the `BackNav`
 * "All diagrams" link: compact, no uppercase, and the same hover. Idles in
 * solid foreground (matching the wordmark/title) with a background-only wash
 * toward the chrome hover surface on hover/focus — the shadcn menubar contract.
 * Inner text/icons use `currentColor` so they track the label.
 *
 * Returns a className string (shadcn idiom) rather than an MUI `SxProps`: pass
 * it to a `@tumaet/ui` Button / DropdownMenuTrigger via `className`, and merge
 * extra classes through the argument (it runs through `cn`, so callers can
 * override). The idle foreground is the solid `text-foreground` token by
 * default; the mobile overflow menu pins an explicit
 * `var(--apollon-primary-contrast)` foreground via `style={{ color }}` so the
 * label stays legible on the themed dropdown.
 */
export const navbarButtonStyle = (className?: string): string =>
  cn(
    // `justify-start text-left` is load-bearing: these classes are merged onto a
    // shadcn `Button` (DropdownMenuTrigger render=) whose own base sets
    // `justify-center`/`text-center`. Without overriding here, File/Help labels
    // mis-center against the right-pinned caret. Every text trigger is
    // left-aligned content with the caret/icon pinned to the edges.
    "inline-flex min-w-0 cursor-pointer items-center justify-start gap-1 whitespace-nowrap text-left",
    // Same 32px box, 6px radius and focus-ring as the icon buttons
    // (.apollon-chrome-iconbtn) so text + icon controls read as one family.
    "min-h-[var(--apollon-chrome-btn)] rounded-[var(--apollon-chrome-radius-sm)] px-2 py-1",
    "border-0 bg-transparent text-sm leading-tight font-medium normal-case",
    "text-foreground transition-colors",
    "hover:bg-[var(--apollon-chrome-surface-hover)]",
    "active:bg-[var(--apollon-chrome-surface-active)]",
    "focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none",
    className
  )
