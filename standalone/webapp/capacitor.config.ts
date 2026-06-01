import type { CapacitorConfig } from "@capacitor/cli"

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
  },
}

export default config
