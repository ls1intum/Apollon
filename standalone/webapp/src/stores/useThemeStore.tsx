import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

const THEME_STORE_VERSION = 2
const LEGACY_THEME_STORE_NAME = "theme-storage"
const THEME_STORE_NAME = "apollon-theme"

// Run once at module load: if the new key is absent but the legacy key exists,
// copy its payload under the new key so zustand's hydration picks it up.
if (typeof localStorage !== "undefined") {
  try {
    if (
      !localStorage.getItem(THEME_STORE_NAME) &&
      localStorage.getItem(LEGACY_THEME_STORE_NAME)
    ) {
      localStorage.setItem(
        THEME_STORE_NAME,
        localStorage.getItem(LEGACY_THEME_STORE_NAME)!
      )
      localStorage.removeItem(LEGACY_THEME_STORE_NAME)
    }
  } catch {
    // localStorage may be unavailable in some environments; skip silently.
  }
}

type ThemeMode = "light" | "dark"

const coerceThemeMode = (value: unknown): ThemeMode | null => {
  if (value === "light" || value === "dark") {
    return value
  }
  return null
}

const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === "undefined") {
    return
  }

  const root = document.documentElement
  // Flip the theme in a single frame. Without this, every header control's own
  // hover/colour transition also fires on the theme swap — each at its own
  // duration — so the chrome reads as a slow, staggered recolour while the body
  // snaps. Mark the root for one frame so a global rule can disable transitions
  // during the swap; hover/interaction transitions resume immediately after.
  root.setAttribute("data-theme-switching", "")
  root.setAttribute("data-theme", theme)
  // Let the browser style native controls/scrollbars for the active scheme.
  root.style.colorScheme = theme
  if (typeof window !== "undefined" && window.requestAnimationFrame) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() =>
        root.removeAttribute("data-theme-switching")
      )
    })
  } else {
    root.removeAttribute("data-theme-switching")
  }
}

interface ThemeState {
  systemThemePreference: ThemeMode | null
  userThemePreference: ThemeMode | null
  currentTheme: ThemeMode
  setSystemThemePreference: (value: ThemeMode) => void
  setUserThemePreference: (value: ThemeMode) => void
  setTheme: (theming: ThemeMode) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

type PersistedThemeShape = {
  systemThemePreference?: unknown
  userThemePreference?: unknown
  currentTheme?: unknown
}

const normalizePersistedThemeState = (state: PersistedThemeShape) => {
  const systemThemePreference = coerceThemeMode(state.systemThemePreference)
  const userThemePreference = coerceThemeMode(state.userThemePreference)
  const currentTheme = coerceThemeMode(state.currentTheme) ?? "light"

  return {
    systemThemePreference,
    userThemePreference,
    currentTheme,
  } satisfies Pick<
    ThemeState,
    "systemThemePreference" | "userThemePreference" | "currentTheme"
  >
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => {
      const applyThemeState = (
        theme: ThemeMode,
        nextState: Partial<
          Pick<ThemeState, "systemThemePreference" | "userThemePreference">
        > = {}
      ) => {
        applyThemeToDocument(theme)
        set({ ...nextState, currentTheme: theme })
      }

      return {
        systemThemePreference: null,
        userThemePreference: null,
        currentTheme: "light",
        setSystemThemePreference: (value: ThemeMode) =>
          set({ systemThemePreference: value }),
        setUserThemePreference: (value: ThemeMode) =>
          set({ userThemePreference: value }),
        setTheme: (theming: ThemeMode) => {
          const theme = coerceThemeMode(theming) ?? "light"
          applyThemeState(theme)
        },
        toggleTheme: () => {
          const { userThemePreference, systemThemePreference } = get()
          const currentPreference =
            userThemePreference ?? systemThemePreference ?? "light"
          const newTheme: ThemeMode =
            currentPreference === "dark" ? "light" : "dark"
          applyThemeState(newTheme, { userThemePreference: newTheme })
        },
        initializeTheme: () => {
          const { userThemePreference } = get()

          if (!userThemePreference) {
            const systemThemePreference: ThemeMode =
              window.matchMedia &&
              window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
            applyThemeState(systemThemePreference, { systemThemePreference })
            return
          }

          applyThemeState(userThemePreference)
        },
      }
    },
    {
      name: THEME_STORE_NAME,
      version: THEME_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        systemThemePreference: state.systemThemePreference,
        userThemePreference: state.userThemePreference,
        currentTheme: state.currentTheme,
      }),
      migrate: (persistedState) => {
        return normalizePersistedThemeState(
          (persistedState as PersistedThemeShape) ?? {}
        ) as ThemeState
      },
    }
  )
)
