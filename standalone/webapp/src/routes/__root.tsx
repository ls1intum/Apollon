import { lazy, Suspense, useEffect } from "react"
import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { AppProviders } from "@/AppProviders"
import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { DeferredToastContainer } from "@/components/DeferredToastContainer"
import { ChromeSubHeader } from "@/components/navbar/ChromeSubHeader"
import { ErrorPage } from "@/pages/ErrorPage"
import { ensureVersionStoreBootstrapped } from "@/stores/versionStoreBootstrap"

// The editor chrome is heavy and only editor routes need it, so load it lazily.
// It mounts the navbar as immersive in-canvas chrome (portaled into the editor
// canvas via the overlay API) instead of a bar above the canvas.
const EditorChromeHeader = lazy(() =>
  import("@/components/navbar/EditorChromeHeader").then((module) => ({
    default: module.EditorChromeHeader,
  }))
)

function RootLayout() {
  // Install app-wide so a gallery-only session — never opening an editor —
  // still purges a deleted local diagram's versions.
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
        {/* Skip link (WCAG 2.4.1): on editor routes the navbar + version rail are
            in-canvas chrome, so let keyboard users jump straight to the diagram
            instead of tabbing through it. Visually hidden until focused. */}
        {isEditorRoute && (
          <a href="#editor-area" className="apollon-skip-link">
            Skip to diagram
          </a>
        )}
        {isEditorRoute && <EditorChromeHeader />}
        {isChromeSubRoute && <ChromeSubHeader />}
        <div
          id="editor-area"
          data-testid="editor-area"
          tabIndex={-1}
          style={{ flex: 1, overflow: "hidden" }}
        >
          <Outlet />
        </div>
      </Suspense>
      <DeferredToastContainer />
    </AppProviders>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <ErrorPage />,
})
