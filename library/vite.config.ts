import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"

// Two passes from one config:
//   - default (LIB_PEERS unset) emits dist/{index,internals}.js with
//     React + MUI + emotion + xyflow inlined — the standalone bundle
//     Angular / Vue / Svelte / vanilla hosts get from `@tumaet/apollon`.
//   - LIB_PEERS=true emits dist/react/react.js with those packages
//     externalized. React hosts opt into `@tumaet/apollon/react` to
//     dedupe against their own React, and that subpath is the ONLY one
//     exposing the `<Apollon>` component (lib/react.tsx) — a component
//     rendered on a second, bundled React copy is an invalid hook call.
//
// Declarations: the standalone pass rolls lib/index.tsx + lib/internals.ts
// into single dist/{index,internals}.d.ts files; the peer pass emits a
// per-file tree under dist/react/ (rollupTypes bundles every entry into
// one file, so it cannot produce a separate rolled file per subpath).
//
// The `/internals` subpath ships only from the standalone build; its
// consumers (host integration tests) never need the externalized
// shape and never use React/MUI directly.
//
// CSS: both passes emit identical bytes because both transform the same
// CSS imports. We publish only the standalone copy (`./style.css` exports
// to `dist/assets/style.css`); the peer-build copy at `dist/react/assets/`
// is duplicate output and gets removed by the package.json `build` script
// (`rm -rf dist/react/assets`). Vite has no per-pass "skip CSS emit" knob,
// so post-build cleanup is the simplest honest path.
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
