import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"

// Single-pass library build. Peers (React + MUI + emotion + xyflow) are
// always externalized — consumers install them. Two entries: the public
// surface (`.`) and a `/internals` subpath that exposes the Yjs wire
// protocol for host integration tests. The internals subpath is NOT
// covered by semver.
export default defineConfig({
  // rollupTypes: bundle all .d.ts into a single dist/index.d.ts so consumers
  // on NodeNext don't trip on internal relative imports without `.js` suffix.
  plugins: [react(), dts({ include: ["lib"], rollupTypes: true })],
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: {
        index: resolve(__dirname, "lib/index.tsx"),
        internals: resolve(__dirname, "lib/internals.ts"),
      },
      formats: ["es"],
      cssFileName: "style",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom/client",
        "@emotion/react",
        "@emotion/styled",
        /^@mui\/material(\/.*)?$/,
        "@xyflow/react",
      ],
      output: {
        assetFileNames: "assets/[name][extname]",
        entryFileNames: "[name].js",
      },
    },
    minify: true,
  },
  resolve: {
    alias: { "@": resolve(__dirname, "lib") },
  },
  esbuild: { drop: ["debugger"] },
})
