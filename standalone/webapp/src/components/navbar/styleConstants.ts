import { cn } from "@tumaet/ui/lib/utils"

/**
 * Shared Tailwind classes for every text action button in the header so they all
 * match the `BackNav` "All diagrams" link: compact, no uppercase, same hover. Idles
 * in solid foreground with a background-only wash toward the chrome hover surface
 * on hover/focus — the shadcn menubar contract. Inner text/icons use `currentColor`
 * so they track the label.
 *
 * Returns a className string merged through `cn` (callers can override). The mobile
 * overflow menu pins an explicit `var(--apollon-foreground)` foreground via
 * `style={{ color }}` so the label stays legible on the themed dropdown.
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

/**
 * Where each chrome surface reveals an action's text label. `labelClass` toggles
 * the label span; `mq` is the matching media query so a control can disable its
 * icon-only tooltip exactly when the label shows. The Tailwind classes are
 * literal so the JIT compiler can see them. Shared so the one `HomeHelpMenu` can
 * render in the editor band (`lg`), the home band (`wide`, a measured 940px), and
 * the sub-route header (`always`, an md+ island with room) without forking.
 */
export type ChromeReveal = "lg" | "wide" | "always"
export const CHROME_REVEAL: Record<
  ChromeReveal,
  { labelClass: string; mq: string }
> = {
  lg: { labelClass: "hidden lg:inline", mq: "(min-width: 1024px)" },
  wide: { labelClass: "hidden min-[940px]:inline", mq: "(min-width: 940px)" },
  always: { labelClass: "inline", mq: "(min-width: 0px)" },
}
