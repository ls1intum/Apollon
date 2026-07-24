import type { CapacitorConfig } from "@capacitor/cli"
import { KeyboardResize } from "@capacitor/keyboard"

// Public half of the Capgo Encryption V2 signing keypair (safe to ship; the
// private half lives only in CI). When set, the plugin STRICTLY rejects any
// update whose signature does not verify, so a compromised host cannot push
// malicious JS. Read from the env at `cap sync` time so rotating it needs no
// code change. Release builds set CAPGO_REQUIRE_SIGNING=true so a missing key
// fails the build LOUDLY rather than silently shipping unsigned OTA.
const liveUpdatePublicKey = process.env.CAPGO_PUBLIC_KEY
if (process.env.CAPGO_REQUIRE_SIGNING === "true" && !liveUpdatePublicKey) {
  throw new Error(
    "CAPGO_PUBLIC_KEY is required for release builds (CAPGO_REQUIRE_SIGNING=true) " +
      "so over-the-air updates enforce signatures."
  )
}

const config: CapacitorConfig = {
  appId: "de.tum.cit.ase.apollon",
  appName: "Apollon",
  webDir: "dist",
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
  },
  plugins: {
    // Over-the-air web-bundle updates (HTML/CSS/JS only), self-hosted first-party
    // on apollon.aet.cit.tum.de. Manual mode: the app's own liveUpdate service
    // fetches a static manifest, gates by native version, and applies on the next
    // cold start; the plugin verifies the signature and auto-rolls-back a bundle
    // that fails to call notifyAppReady(). See src/services/liveUpdate.ts.
    CapacitorUpdater: {
      autoUpdate: false,
      resetWhenUpdate: true,
      appReadyTimeout: 10000,
      ...(liveUpdatePublicKey ? { publicKey: liveUpdatePublicKey } : {}),
    },
    StatusBar: {
      overlaysWebView: true,
    },
    Keyboard: {
      // The document is `position: fixed; overflow: hidden`, and the editor already
      // measures the keyboard overlap itself via `visualViewport` (the overlay grid's
      // --apollon-keyboard-inset). Letting the native shell also resize or scroll the
      // webview fights that measurement and strands the view scrolled-up on dismiss.
      resize: KeyboardResize.None,
    },
  },
}

export default config
