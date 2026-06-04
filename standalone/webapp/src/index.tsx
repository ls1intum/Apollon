import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { useThemeStore } from "./stores/useThemeStore.tsx"
import { usePersistenceModelStore } from "./stores/usePersistenceModelStore.tsx"
import { runLegacyMigrationIfNeeded } from "./services/legacyMigration"
import { log } from "./logger"
import {
  setLogger as setApollonLogger,
  setLogLevel as setApollonLogLevel,
} from "@tumaet/apollon/react"
import { StatusBar } from "@capacitor/status-bar"

const rootElement = document.getElementById("root")

useThemeStore.getState().initializeTheme()

// Hide status bar on mobile
StatusBar.hide().catch(() => {
  // Silently fail if not on mobile
})

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
