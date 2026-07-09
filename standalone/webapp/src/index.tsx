import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { useThemeStore } from "./stores/useThemeStore.tsx"
import { usePersistenceModelStore } from "./stores/usePersistenceModelStore.tsx"
import { runLegacyMigrationIfNeeded } from "./services/legacyMigration"
import { log } from "./logger"
import {
  setLogger as setApollonLogger,
  setLogLevel as setApollonLogLevel,
} from "@tumaet/apollon"
import { StatusBar } from "@capacitor/status-bar"
import { Keyboard } from "@capacitor/keyboard"

const rootElement = document.getElementById("root")

useThemeStore.getState().initializeTheme()

// Hide status bar on mobile
StatusBar.hide().catch(() => {
  // Silently fail if not on mobile
})

// iOS only. WKWebView scrolls a focused input into view by scrolling the whole
// webview, which on this `position: fixed` document leaves it stranded off-origin
// after the keyboard dismisses. The editor keeps its own chrome above the keyboard
// via `visualViewport`, so the native scroll is pure interference.
Keyboard.setScroll({ isDisabled: true }).catch(() => {
  // Silently fail off-native and on Android, where setScroll is unimplemented.
})

// Safe-area preview seam. Browser device-emulators draw a notch / Dynamic
// Island but report env(safe-area-inset-*) = 0, so chrome can't be verified
// against a notch in a plain browser. This lets a developer (and the Playwright
// suite) simulate insets WITHOUT shipping a hardcoded floor. Gated on DEV or the
// dedicated e2e build (VITE_E2E) — both statically false in a real
// production/native bundle, so this tree-shakes out of the shipped app; on real
// devices the insets come from env() (iOS) / Capacitor System Bars (Android).
// Usage from the console:
//   __apollonSafeArea(47)            // 47px on all four sides
//   __apollonSafeArea([0, 59, 34, 59]) // [top, right, bottom, left]
//   __apollonSafeArea(null)          // clear
// The value persists via localStorage so a reload keeps the simulated notch.
if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
  const SIDES = ["top", "right", "bottom", "left"] as const
  const applySafeArea = (value: number | number[] | null) => {
    const root = document.documentElement.style
    if (value === null) {
      SIDES.forEach((s) => root.removeProperty(`--safe-area-inset-${s}`))
      return
    }
    const px = Array.isArray(value) ? value : [value, value, value, value]
    SIDES.forEach((s, i) =>
      root.setProperty(`--safe-area-inset-${s}`, `${px[i] ?? 0}px`)
    )
  }
  const saved = localStorage.getItem("apollon:safe-area-sim")
  if (saved) {
    try {
      applySafeArea(JSON.parse(saved))
    } catch {
      /* ignore malformed value */
    }
  }
  ;(window as unknown as Record<string, unknown>).__apollonSafeArea = (
    value: number | number[] | null
  ) => {
    if (value === null) localStorage.removeItem("apollon:safe-area-sim")
    else localStorage.setItem("apollon:safe-area-sim", JSON.stringify(value))
    applySafeArea(value)
  }
}

const apollonSink = {
  debug: (...args: unknown[]) => log.debug(...args),
  warn: (...args: unknown[]) => log.warn(...args),
  error: (...args: unknown[]) => log.error(...args),
}

setApollonLogger(apollonSink)
setApollonLogLevel(import.meta.env.DEV ? "debug" : "warn")

// One-time migration of diagrams from the legacy native iOS app. Gated on the
// persistence store finishing hydration from localStorage so the imported
// models can't be clobbered by a late hydration. No-ops off iOS / after done.
function startLegacyMigration() {
  if (usePersistenceModelStore.persist.hasHydrated()) {
    void runLegacyMigrationIfNeeded()
  } else {
    const unsubscribe = usePersistenceModelStore.persist.onFinishHydration(
      () => {
        unsubscribe()
        void runLegacyMigrationIfNeeded()
      }
    )
  }
}

startLegacyMigration()

if (rootElement) {
  createRoot(rootElement).render(<App />)
} else {
  log.error("Root element not found")
}
