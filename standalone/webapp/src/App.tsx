import { lazy, Suspense } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router"
import { AppProviders } from "./AppProviders"
import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { HomeNavbar } from "@/components/navbar/HomeNavbar"
import { DeferredToastContainer } from "./components/DeferredToastContainer"
import { ErrorPage } from "@/pages/ErrorPage"
import { log } from "@/logger"

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

const LegacySharedDiagramRedirect = () => {
  const { id } = useParams()
  const location = useLocation()

  if (!id || !new URLSearchParams(location.search).has("view")) {
    return <ErrorPage />
  }

  return (
    <Navigate
      to={`/shared/${encodeURIComponent(id)}${location.search}`}
      replace
    />
  )
}

const AppLayout = () => {
  const location = useLocation()
  const path = location.pathname
  // Editor routes get the full editor navbar (File/Share/title). The home page
  // renders its own HomeNavbar; the remaining chrome routes (legal, 404) get a
  // HomeNavbar too — never the editor navbar, which has no editor behind it.
  const isHomeRoute = path === "/"
  const isEditorRoute =
    path.startsWith("/local/") ||
    path.startsWith("/shared/") ||
    path === "/playground"

  return (
    <Suspense fallback={<AppLoadingScreen />}>
      {isEditorRoute && <Navbar />}
      {!isHomeRoute && !isEditorRoute && <HomeNavbar />}
      <div data-testid="editor-area" style={{ flex: 1, overflow: "hidden" }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/local/:id" element={<ApollonLocal />} />
          <Route path="/playground" element={<ApollonPlayground />} />
          <Route path="/imprint" element={<ImprintPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route
            path="/shared/:diagramId"
            element={<ApollonWithConnection />}
          />
          <Route path="/:id" element={<LegacySharedDiagramRedirect />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </div>
    </Suspense>
  )
}

// To set the safe area insets as for mobile devices
void import("capacitor-plugin-safe-area")
  .then(({ SafeArea }) => {
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
  .catch((error) => {
    log.error("Failed to initialize safe-area insets", error as Error)
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
