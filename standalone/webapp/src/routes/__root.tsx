import { lazy, Suspense, useEffect } from "react"
import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { Capacitor } from "@capacitor/core"
import { AppProviders } from "@/AppProviders"
import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { DeferredToastContainer } from "@/components/DeferredToastContainer"
import { HomeNavbar } from "@/components/navbar/HomeNavbar"
import { HomeFooter } from "@/components/home/HomeFooter"
import { ErrorPage } from "@/pages/ErrorPage"
import { ensureVersionStoreBootstrapped } from "@/stores/versionStoreBootstrap"

// The editor navbar is heavy and only editor routes need it, so load it lazily.
const Navbar = lazy(() =>
  import("@/components/navbar/Navbar").then((module) => ({
    default: module.Navbar,
  }))
)

function RootLayout() {
  // Install the version-store side-effects (delete cascade, cross-tab sync)
  // app-wide so a gallery-only session — never opening an editor — still purges
  // a deleted local diagram's versions. Idempotent.
  useEffect(() => {
    ensureVersionStoreBootstrapped()
  }, [])

  // Pathname read OUTSIDE any matched route — the root renders above every match.
  const path = useRouterState({ select: (s) => s.location.pathname })
  const isHomeRoute = path === "/"
  const isEditorRoute =
    path.startsWith("/local/") ||
    path.startsWith("/shared/") ||
    path === "/playground"
  const isChromeSubRoute = !isHomeRoute && !isEditorRoute

  // Providers live inside the router so a modal's useNavigate binds to it.
  return (
    <AppProviders>
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
      <DeferredToastContainer />
    </AppProviders>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <ErrorPage />,
})
