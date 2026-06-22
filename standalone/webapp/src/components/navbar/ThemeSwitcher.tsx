import { useThemeStore } from "@/stores/useThemeStore"
import MenuItem from "@mui/material/MenuItem"
import React from "react"
import { useShallow } from "zustand/shallow"
import { MoonIcon, SunIcon } from "../Icon"

interface Props {
  asMenuItem?: boolean
  onToggle?: () => void
}

export const ThemeSwitcherMenu: React.FC<Props> = ({
  asMenuItem = false,
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

  if (asMenuItem) {
    return (
      <MenuItem
        onClick={handleToggle}
        aria-label={title}
        sx={{ justifyContent: "space-between !important" }}
      >
        Theme
        {isDarkMode ? <SunIcon /> : <MoonIcon />}
      </MenuItem>
    )
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={title}
      title={title}
      className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--apollon-chrome-radius-sm)] border-0 bg-transparent p-0 text-[color:var(--apollon-chrome-text-muted)] transition-colors duration-200 hover:bg-[color:var(--apollon-chrome-surface-hover)] hover:text-[color:var(--apollon-chrome-text)] active:bg-[color:var(--apollon-chrome-surface-active)] focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none"
    >
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-[250ms] ${
          isDarkMode
            ? "scale-100 rotate-0 opacity-100"
            : "scale-[0.6] -rotate-90 opacity-0"
        }`}
      >
        <MoonIcon width={18} height={18} fill="currentColor" />
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-[250ms] ${
          isDarkMode
            ? "scale-[0.6] rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100"
        }`}
      >
        <SunIcon width={18} height={18} fill="currentColor" />
      </span>
    </button>
  )
}
