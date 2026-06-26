import { DropdownMenuItem } from "@tumaet/ui/components/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { cn } from "@tumaet/ui/lib/utils"
import React from "react"
import { Moon, Sun } from "lucide-react"
import { useShallow } from "zustand/shallow"
import { useThemeStore } from "@/stores/useThemeStore"

/** Props for the pure {@link ThemeSwitcherButton} view. */
interface ThemeSwitcherButtonProps {
  /**
   * Whether dark mode is currently active. Drives the cross-fade between the
   * moon (dark) and sun (light) icons and the accessible label.
   */
  isDarkMode: boolean
  /** Fired when the user clicks the toggle to switch the theme. */
  onToggle: () => void
  /** Merged with the component's own classes. */
  className?: string
  /** Forwarded to the underlying `<button>` element. */
  ref?: React.Ref<HTMLButtonElement>
}

/**
 * Pure light/dark toggle for the header chrome. Cross-fades a sun/moon icon
 * based on `isDarkMode` and reports clicks via `onToggle`. No store, no effects —
 * wire it up with {@link ThemeSwitcherMenu}. Styled in the shared chrome-icon
 * family (size/hover/radius/focus matching `.apollon-chrome-iconbtn`).
 */
export function ThemeSwitcherButton({
  isDarkMode,
  onToggle,
  className,
  ref,
}: ThemeSwitcherButtonProps) {
  const title = isDarkMode ? "Switch to light mode" : "Switch to dark mode"

  const button = (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-label={title}
      // The shared chrome-icon class is the single source of the 32px paint box,
      // 6px radius, hover/active wash, focus ring AND the 44px ::before hit
      // target — so Theme reads as one family with the other icon-only triggers
      // (Favorites, '…' overflow) and is touch-reachable. `relative` is already
      // set by the class; the cross-fade spans below position against it.
      className={cn("apollon-chrome-iconbtn", className)}
    >
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-[250ms]",
          isDarkMode
            ? "scale-100 rotate-0 opacity-100"
            : "scale-[0.6] -rotate-90 opacity-0"
        )}
      >
        <Moon
          className="size-[var(--apollon-chrome-icon)]"
          aria-hidden="true"
        />
      </span>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-[250ms]",
          isDarkMode
            ? "scale-[0.6] rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100"
        )}
      >
        <Sun className="size-[var(--apollon-chrome-icon)]" aria-hidden="true" />
      </span>
    </button>
  )

  // The shared Tooltip (not a native `title`) so Theme reveals with the same
  // instant timing as the other icon-only triggers under the header's delay-0
  // TooltipProvider. Theme is a plain toggle (no DropdownMenu), so there is no
  // trigger conflict with the tooltip.
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}

/** Props for the {@link ThemeSwitcherMenu} container. */
interface ThemeSwitcherMenuProps {
  /**
   * Presentation variant (one bounded axis):
   * - `"icon"` (default): the compact icon toggle used on the desktop bar.
   * - `"menuItem"`: a full-width labelled row inside a dropdown menu (the mobile
   *   overflow menu).
   */
  variant?: "icon" | "menuItem"
  /** Fired in addition to toggling — e.g. to close the overflow menu it lives in. */
  onToggle?: () => void
}

/**
 * Container: reads `currentTheme`/`toggleTheme` from the theme store and renders
 * either the pure {@link ThemeSwitcherButton} (desktop chrome) or a labelled
 * `DropdownMenuItem` row (mobile overflow menu, via `variant="menuItem"`).
 */
export const ThemeSwitcherMenu: React.FC<ThemeSwitcherMenuProps> = ({
  variant = "icon",
  onToggle,
}) => {
  const { currentTheme, toggleTheme } = useThemeStore(
    useShallow((state) => ({
      currentTheme: state.currentTheme,
      toggleTheme: state.toggleTheme,
    }))
  )
  const isDarkMode = currentTheme === "dark"
  const title = isDarkMode ? "Switch to light mode" : "Switch to dark mode"

  const handleToggle = () => {
    toggleTheme()
    onToggle?.()
  }

  if (variant === "menuItem") {
    return (
      <DropdownMenuItem
        onClick={handleToggle}
        aria-label={title}
        className="justify-between"
      >
        Theme
        {isDarkMode ? (
          <Sun
            className="size-[var(--apollon-chrome-icon)]"
            aria-hidden="true"
          />
        ) : (
          <Moon
            className="size-[var(--apollon-chrome-icon)]"
            aria-hidden="true"
          />
        )}
      </DropdownMenuItem>
    )
  }

  return <ThemeSwitcherButton isDarkMode={isDarkMode} onToggle={handleToggle} />
}
