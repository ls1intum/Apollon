import type { CapacitorConfig } from "@capacitor/cli"
import { KeyboardResize } from "@capacitor/keyboard"

const config: CapacitorConfig = {
  appId: "de.tum.cit.ase.apollon",
  appName: "Apollon",
  webDir: "dist",
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
  },
  plugins: {
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
