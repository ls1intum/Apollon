import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import themings from "@/constants/themings.json"

interface ThemeState {
  systemThemePreference: string | null
  userThemePreference: string | null
  currentTheme: string
  setSystemThemePreference: (value: string) => void
  setUserThemePreference: (value: string) => void
  setTheme: (theming: string) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      systemThemePreference: null,
      userThemePreference: null,
      currentTheme: "light", // Default theme
      setSystemThemePreference: (value: string) =>
        set({ systemThemePreference: value }),
      setUserThemePreference: (value: string) =>
        set({ userThemePreference: value }),
      setTheme: (theming: string) => {
        const root = document.documentElement
        // @ts-expect-error TS doesn't know that theming is a key of themings
        for (const themingVar of Object.keys(themings[theming])) {
          // @ts-expect-error TS doesn't know that themingVar is a key of themings[theming]
          root.style.setProperty(themingVar, themings[theming][themingVar])
        }
        set({ currentTheme: theming })
      },
      toggleTheme: () => {
        const {
          userThemePreference,
          systemThemePreference,
          setTheme,
          setUserThemePreference,
        } = get()
        const currentPreference =
          userThemePreference || systemThemePreference || "light"
        const newTheme = currentPreference === "dark" ? "light" : "dark"
        setTheme(newTheme)
        setUserThemePreference(newTheme)
      },
      initializeTheme: () => {
        const { userThemePreference, setSystemThemePreference, setTheme } =
          get()
        if (!userThemePreference) {
          if (
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
          ) {
            setSystemThemePreference("dark")
            setTheme("dark")
          } else {
            setSystemThemePreference("light")
            setTheme("light")
          }
        } else {
          setTheme(userThemePreference)
        }
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        systemThemePreference: state.systemThemePreference,
        userThemePreference: state.userThemePreference,
        currentTheme: state.currentTheme,
      }),
    }
  )
)
