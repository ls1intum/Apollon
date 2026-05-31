import { useThemeStore } from "@/stores/useThemeStore"
import React from "react"
import { useShallow } from "zustand/shallow"
import { MoonIcon, SunIcon } from "../Icon"

export const ThemeSwitcherMenu: React.FC = () => {
  const { currentTheme, toggleTheme } = useThemeStore(
    useShallow((state) => ({
      currentTheme: state.currentTheme,
      toggleTheme: state.toggleTheme,
    }))
  )
  const isDarkMode = currentTheme === "dark"
  const title = isDarkMode ? "Switch to light mode" : "Switch to dark mode"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={title}
      title={title}
      className="relative mt-[5px] inline-flex h-9 w-9 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[var(--home-text-secondary)] transition-all duration-200 hover:scale-115 hover:text-white hover:drop-shadow-[0_0_10px_var(--home-glow-neutral)] active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#212529]"
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
