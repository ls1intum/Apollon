import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"

// Two passes from one config:
//   - default (LIB_PEERS unset) emits dist/{index,internals}.js with
//     React + MUI + emotion + xyflow inlined. This is the standalone
//     bundle Angular / Vue / Svelte / vanilla JS hosts (Artemis is the
//     primary consumer) get when they import `@tumaet/apollon`.
//   - LIB_PEERS=true emits dist/react/index.js with those packages
//     externalized — React hosts opt in via `@tumaet/apollon/react`
//     to dedupe against their own React copy.
// Only the standalone pass runs vite-plugin-dts; both subpaths share
// the rolled-up dist/index.d.ts.
//
// The `/internals` subpath ships only from the standalone build; its
// consumers (host integration tests) never need the externalized
// shape and never use React/MUI directly.
const isPeerBuild = process.env.LIB_PEERS === "true"

export default defineConfig({
  plugins: [
    react(),
    ...(isPeerBuild ? [] : [dts({ include: ["lib"], rollupTypes: true })]),
  ],
  build: {
    copyPublicDir: false,
    outDir: isPeerBuild ? "dist/react" : "dist",
    emptyOutDir: !isPeerBuild,
    cssCodeSplit: false,
    lib: {
      entry: isPeerBuild
        ? { index: resolve(__dirname, "lib/index.tsx") }
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
