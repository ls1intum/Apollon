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

  const handleToggle = () => {
    toggleTheme()
    onToggle?.()
  }

  const icon = currentTheme === "dark" ? <SunIcon /> : <MoonIcon />

  if (asMenuItem) {
    return (
      <MenuItem
        onClick={handleToggle}
        sx={{ justifyContent: "space-between !important" }}
      >
        Theme
        {icon}
      </MenuItem>
    )
  }

  return (
    <button type="button" onClick={handleToggle} aria-label="Toggle theme">
      {icon}
    </button>
  )
}
