import { lazy, Suspense, useEffect } from "react"
import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { AppProviders } from "@/AppProviders"
import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { DeferredToastContainer } from "@/components/DeferredToastContainer"
import { DiagramFileDropzone } from "@/components/DiagramFileDropzone"
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
  const isEditorRoute =
    path.startsWith("/local/") ||
    path.startsWith("/shared/") ||
    path === "/playground"

  // The editor mounts its chrome as in-canvas overlay (portaled into the canvas)
  // — so it renders here, above the Outlet. Every NON-editor route (home, legal,
  // 404) instead owns its own sticky island header INSIDE its scroll container
  // via `PageShell`, so the header scrolls-then-sticks identically everywhere and
  // the page's `app-scroll-y` scroll viewport always has a bounded height to
  // scroll against. Do NOT render a sub-header here above the `overflow:hidden`
  // wrapper: the page would have no bounded scroll root and long legal copy
  // would clip.
  //
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
        <div
          id="editor-area"
          data-testid="editor-area"
          tabIndex={-1}
          style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <Outlet />
        </div>
      </Suspense>
      {/* Whole-window file drop → import. Mounted once, above every route. */}
      <DiagramFileDropzone />
      <DeferredToastContainer />
    </AppProviders>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <ErrorPage />,
})
