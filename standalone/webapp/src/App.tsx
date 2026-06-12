import { createRouter, RouterProvider } from "@tanstack/react-router"
import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { routeTree } from "./routeTree.gen"
import { log } from "@/logger"

// Single router instance for the app. Route components are code-split by the
// router plugin; `defaultPreload: "intent"` warms a route's chunk on link
// hover/focus, matching the snappiness the old manual lazy() routes had.
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: AppLoadingScreen,
})

// Module augmentation: makes Link `to`, navigate(), useParams/useSearch fully
// type-safe against this app's route tree.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Typed history state used across the app (nav provenance + a couple of
// one-shot hints). Augmenting the (otherwise empty) HistoryState interface
// makes Link `state` / navigate({ state }) and `location.state` reads type-safe.
declare module "@tanstack/history" {
  interface HistoryState {
    /** Nav provenance: the editor route a chrome page (legal/404) was reached from. */
    from?: string
    /** Home gallery hint: highlight a just-opened shared diagram card. */
    highlightSharedDiagramId?: string
  }
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
  // The router renders the file-based tree starting at __root, which owns the
  // app providers (Editor/Modal context), the navbar/footer chrome, the
  // editor-area wrapper, and the toast container. Providers live INSIDE the
  // router so modals rendered by ModalProvider (which call useNavigate) are
  // bound to the active router.
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <RouterProvider router={router} />
    </div>
  )
}

export default App
