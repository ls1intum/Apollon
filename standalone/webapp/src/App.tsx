import { createRouter, RouterProvider } from "@tanstack/react-router"
import { AppLoadingScreen } from "@/components/AppLoadingScreen"
import { routeTree } from "./routeTree.gen"

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

// Safe-area insets MUST NOT be written from JS: a one-shot getSafeAreaInsets()
// write captures boot (portrait) values as inline styles that beat env() forever,
// so a landscape rotation never updates the side insets. Instead Capacitor 8's
// bundled System Bars plugin injects --safe-area-inset-* on Android (working
// around the Android WebView <140 env() bug), and iOS WKWebView resolves
// env(safe-area-inset-*) natively via viewport-fit=cover — both reactive on
// rotation. CSS reads the canonical vars with env() as the fallback (see
// webapp.css / library app.css). Ref: https://capacitorjs.com/docs/apis/system-bars

function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <RouterProvider router={router} />
    </div>
  )
}

export default App
