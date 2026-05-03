import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { useThemeStore } from "./stores/useThemeStore.tsx"
import { log } from "./logger"

const rootElement = document.getElementById("root")

useThemeStore.getState().initializeTheme()

void import("@tumaet/apollon").then(
  ({ setLogger: setApollonLogger, setLogLevel: setApollonLogLevel }) => {
    const apollonSink = {
      debug: (...args: unknown[]) => log.debug(...args),
      warn: (...args: unknown[]) => log.warn(...args),
      error: (...args: unknown[]) => log.error(...args),
    }

    setApollonLogger(apollonSink)
    setApollonLogLevel(import.meta.env.DEV ? "debug" : "warn")
  }
)

if (rootElement) {
  createRoot(rootElement).render(<App />)
} else {
  log.error("Root element not found")
}
