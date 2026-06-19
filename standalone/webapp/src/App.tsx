import { createRouter, RouterProvider } from "@tanstack/react-router"
import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { routeTree } from "./routeTree.gen"
import { log } from "@/logger"

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: AppLoadingScreen,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Augment the (empty) HistoryState interface so typed `state` writes (Link
// `state` / navigate({ state })) type-check; reads go through runtime guards in
// navProvenance.
declare module "@tanstack/history" {
  interface HistoryState {
    /** Nav provenance: the editor route a chrome page (legal/404) was reached from. */
    from?: string
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
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <RouterProvider router={router} />
    </div>
  )
}

export default App
