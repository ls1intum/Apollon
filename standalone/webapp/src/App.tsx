import { BrowserRouter, Route, Routes } from "react-router"
import { AppProviders } from "./AppProviders"
import { Navbar } from "./components"
import {
  ApollonLocal,
  ApollonPlayground,
  ApollonWithConnection,
  ErrorPage,
  RenderPage,
} from "@/pages"
import { SafeArea } from "capacitor-plugin-safe-area"
import { ToastContainer } from "react-toastify"
import { useShallow } from "zustand/shallow"
import { useThemeStore } from "./stores/useThemeStore"

// To set the safe area insets as for mobile devices
SafeArea.getSafeAreaInsets().then(
  ({ insets: { top, bottom, left, right } }) => {
    document.documentElement.style.setProperty(
      "--safe-area-inset-top",
      `${top}px`
    )
    document.documentElement.style.setProperty(
      "--safe-area-inset-bottom",
      `${bottom}px`
    )
    document.documentElement.style.setProperty(
      "--safe-area-inset-left",
      `${left}px`
    )
    document.documentElement.style.setProperty(
      "--safe-area-inset-right",
      `${right}px`
    )
  }
)

function App() {
  const currentTheme = useThemeStore(useShallow((state) => state.currentTheme))
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <BrowserRouter>
        <AppProviders>
          <Navbar />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Routes>
              <Route path="/" element={<ApollonLocal />} />
              <Route path="/playground" element={<ApollonPlayground />} />
              <Route path="/render" element={<RenderPage />} />
              <Route path="/:diagramId" element={<ApollonWithConnection />} />
              <Route path="*" element={<ErrorPage />} />
            </Routes>
          </div>

          <ToastContainer theme={currentTheme === "dark" ? "dark" : "light"} />
        </AppProviders>
      </BrowserRouter>
    </div>
  )
}

export default App
