import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"

// Two passes from one config:
//   - default → dist/{index,internals}.js   (React + MUI + emotion + xyflow inlined)
//   - LIB_PEERS=true → dist/react/react.js  (those packages externalized)
//
// The `<Apollon>` component lives ONLY in the peer build (lib/react.tsx) —
// shipping it from the bundled entry would render on a second React copy.
//
// dts: standalone pass rolls each entry into one .d.ts; peer pass emits a
// per-file tree (rollupTypes cannot produce multiple rolled files).
//
// CSS: both passes emit identical bytes. We publish only the standalone copy;
// the peer-pass duplicate is removed by the build script (`rm -rf dist/react/assets`).
const isPeerBuild = process.env.LIB_PEERS === "true"

export default defineConfig({
  plugins: [react(), dts({ include: ["lib"], rollupTypes: !isPeerBuild })],
  build: {
    copyPublicDir: false,
    outDir: isPeerBuild ? "dist/react" : "dist",
    emptyOutDir: !isPeerBuild,
    cssCodeSplit: false,
    lib: {
      entry: isPeerBuild
        ? { react: resolve(__dirname, "lib/react.tsx") }
        : {
            index: resolve(__dirname, "lib/index.tsx"),
            internals: resolve(__dirname, "lib/internals.ts"),
          },
      formats: ["es"],
      cssFileName: "style",
    },
    rollupOptions: {
      external: isPeerBuild
        ? [
            "react",
            "react-dom",
            "react/jsx-runtime",
            "react/jsx-dev-runtime",
            "react-dom/client",
            "@emotion/react",
            "@emotion/styled",
            /^@mui\/material(\/.*)?$/,
            "@xyflow/react",
          ]
        : [],
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
