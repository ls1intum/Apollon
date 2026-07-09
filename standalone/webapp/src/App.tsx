import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
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
// rotation. The canonical vars are declared once, in @tumaet/ui tokens.css, with
// env() as the fallback. Ref: https://capacitorjs.com/docs/apis/system-bars

function App() {
  // Mark the root on touch/native so hover-only affordances (e.g. the diagram
  // card's overlay controls) can reveal themselves where there is no hover.
  // `@media(hover:none)` is unreliable in Capacitor webviews (Android WebView
  // reports hover:hover), so key off a definitive native check OR a coarse
  // pointer instead; CSS targets [data-coarse-pointer].
  useEffect(() => {
    const root = document.documentElement
    const coarse = window.matchMedia?.("(pointer: coarse)")
    const update = () =>
      root.toggleAttribute(
        "data-coarse-pointer",
        Capacitor.isNativePlatform() || Boolean(coarse?.matches)
      )
    update()
    coarse?.addEventListener("change", update)
    return () => coarse?.removeEventListener("change", update)
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <RouterProvider router={router} />
    </div>
  )
}

export default App
