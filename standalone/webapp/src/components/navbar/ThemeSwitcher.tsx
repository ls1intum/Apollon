import { cn } from "@tumaet/ui/lib/utils"
import React from "react"
import { useShallow } from "zustand/shallow"
import { useThemeStore } from "@/stores/useThemeStore"
import { MoonIcon, SunIcon } from "../Icon"

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
 * Pure light/dark toggle for the always-dark navbar. Cross-fades a sun/moon
 * icon based on `isDarkMode` and reports clicks via `onToggle`. No store, no
 * effects — wire it up with {@link ThemeSwitcherMenu}.
 */
export function ThemeSwitcherButton({
  isDarkMode,
  onToggle,
  className,
  ref,
}: ThemeSwitcherButtonProps) {
  const title = isDarkMode ? "Switch to light mode" : "Switch to dark mode"

  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-label={title}
      title={title}
      className={cn(
        "relative mt-[5px] inline-flex h-9 w-9 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-white/70 transition-all duration-200 hover:scale-115 hover:text-white active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#212529]",
        className
      )}
    >
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-[250ms]",
          isDarkMode
            ? "scale-100 rotate-0 opacity-100"
            : "scale-[0.6] -rotate-90 opacity-0"
        )}
      >
        <MoonIcon width={18} height={18} fill="currentColor" />
      </span>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-[250ms]",
          isDarkMode
            ? "scale-[0.6] rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100"
        )}
      >
        <SunIcon width={18} height={18} fill="currentColor" />
      </span>
    </button>
  )
}

/**
 * Navbar container: reads `currentTheme`/`toggleTheme` from the theme store and
 * renders the pure {@link ThemeSwitcherButton}.
 */
export const ThemeSwitcherMenu: React.FC = () => {
  const { currentTheme, toggleTheme } = useThemeStore(
    useShallow((state) => ({
      currentTheme: state.currentTheme,
      toggleTheme: state.toggleTheme,
    }))
  )

  return (
    <ThemeSwitcherButton
      isDarkMode={currentTheme === "dark"}
      onToggle={toggleTheme}
    />
  )
}
