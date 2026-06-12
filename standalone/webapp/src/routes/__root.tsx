import { lazy, Suspense } from "react"
import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { Capacitor } from "@capacitor/core"
import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { HomeNavbar } from "@/components/navbar/HomeNavbar"
import { HomeFooter } from "@/components/home/HomeFooter"
import { ErrorPage } from "@/pages/ErrorPage"

// The editor navbar is heavy (File/Share/title controls) and only the editor
// routes need it, so keep it lazy exactly as the old App.tsx did. Route
// components are auto-split by the router plugin; this navbar is NOT a route
// component (it renders in the root layout), so it needs its own lazy().
const Navbar = lazy(() =>
  import("@/components/navbar/Navbar").then((module) => ({
    default: module.Navbar,
  }))
)

/**
 * Root layout — the file-based-routing equivalent of the old `AppLayout`.
 *
 * Chrome is decided purely from the pathname (read OUTSIDE any matched route
 * via `useRouterState`, since the root renders above every match): editor
 * routes get the full editor `Navbar`; the non-home chrome routes (legal, 404)
 * get `HomeNavbar` + `HomeFooter`; the home page renders neither (it owns its
 * own chrome). The `data-testid="editor-area"` wrapper around `<Outlet/>` is
 * relied on by e2e/visual tests and must stay exactly here.
 */
function RootLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname })
  const isHomeRoute = path === "/"
  const isEditorRoute =
    path.startsWith("/local/") ||
    path.startsWith("/shared/") ||
    path === "/playground"
  const isChromeSubRoute = !isHomeRoute && !isEditorRoute

  return (
    <Suspense fallback={<AppLoadingScreen />}>
      {isEditorRoute && <Navbar />}
      {isChromeSubRoute && <HomeNavbar />}
      <div data-testid="editor-area" style={{ flex: 1, overflow: "hidden" }}>
        <Outlet />
      </div>
      {isChromeSubRoute && !Capacitor.isNativePlatform() && (
        <HomeFooter className="hidden md:flex" />
      )}
    </Suspense>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  // A 404 renders in the Outlet slot; because its path is non-home/non-editor,
  // `isChromeSubRoute` already wraps it in HomeNavbar + HomeFooter — matching
  // the old `<Route path="*" element={<ErrorPage/>}/>` chrome behaviour.
  notFoundComponent: () => <ErrorPage />,
})
