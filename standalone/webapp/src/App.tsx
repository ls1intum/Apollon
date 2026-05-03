import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes, useLocation } from "react-router"
import { AppProviders } from "./AppProviders"
import { DeferredToastContainer } from "./components/DeferredToastContainer"
import { ErrorPage } from "@/pages/ErrorPage"

const HomePage = lazy(() =>
  import("@/pages/HomePage").then((module) => ({ default: module.HomePage }))
)
const ApollonLocal = lazy(() =>
  import("@/pages/ApollonLocal").then((module) => ({
    default: module.ApollonLocal,
  }))
)
const ApollonPlayground = lazy(() =>
  import("@/pages/ApollonPlayground").then((module) => ({
    default: module.ApollonPlayground,
  }))
)
const ApollonWithConnection = lazy(() =>
  import("@/pages/ApollonWithConnection").then((module) => ({
    default: module.ApollonWithConnection,
  }))
)
const ImprintPage = lazy(() =>
  import("@/pages/ImprintPage").then((module) => ({
    default: module.ImprintPage,
  }))
)
const PrivacyPage = lazy(() =>
  import("@/pages/PrivacyPage").then((module) => ({
    default: module.PrivacyPage,
  }))
)
const Navbar = lazy(() =>
  import("@/components/navbar/Navbar").then((module) => ({
    default: module.Navbar,
  }))
)

const PageFallback = () => (
  <div
    style={{
      flex: 1,
      background: "var(--home-bg-primary)",
    }}
  />
)

const AppLayout = () => {
  const location = useLocation()
  const isHomeRoute = location.pathname === "/"

  return (
    <>
      {!isHomeRoute && (
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
      )}
      <div data-testid="editor-area" style={{ flex: 1, overflow: "hidden" }}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/local/:id" element={<ApollonLocal />} />
            <Route path="/playground" element={<ApollonPlayground />} />
            <Route path="/imprint" element={<ImprintPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/shared/:id" element={<ApollonWithConnection />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </Suspense>
      </div>
    </>
  )
}

// To set the safe area insets as for mobile devices
void import("capacitor-plugin-safe-area").then(({ SafeArea }) => {
  void SafeArea.getSafeAreaInsets().then(
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
})

function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <BrowserRouter>
        <AppProviders>
          <AppLayout />
          <DeferredToastContainer />
        </AppProviders>
      </BrowserRouter>
    </div>
  )
}

export default App
