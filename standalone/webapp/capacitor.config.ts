import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "de.tum.cit.ase.apollonreengineering",
  appName: "Apollon Reengineering Mobile",
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
