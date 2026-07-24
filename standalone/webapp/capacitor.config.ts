import type { CapacitorConfig } from "@capacitor/cli"
import { KeyboardResize } from "@capacitor/keyboard"

// Public half of the Capgo Encryption V2 signing keypair. It is NOT secret and
// is safe to ship in the binary; the private half lives only in CI and signs
// each bundle. When set, the plugin STRICTLY rejects any update whose signature
// does not verify — so a compromised update host cannot ship malicious JS. Read
// from the environment at `cap sync`/build time (see fastlane/APP_STORE_READINESS
// or docs) rather than committed, so rotating the key needs no code change.
const liveUpdatePublicKey = process.env.CAPGO_PUBLIC_KEY

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
