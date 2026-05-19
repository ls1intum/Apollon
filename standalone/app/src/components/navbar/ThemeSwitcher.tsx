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

  return (
    <button onClick={toggleTheme}>
      {currentTheme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
