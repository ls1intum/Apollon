import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { useThemeStore } from "./stores/useThemeStore.tsx"
import { log } from "./logger"
import {
  setLogger as setApollonLogger,
  setLogLevel as setApollonLogLevel,
} from "@tumaet/apollon"
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

if (rootElement) {
  createRoot(rootElement).render(<App />)
} else {
  log.error("Root element not found")
}
