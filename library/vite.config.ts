import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"
import { readFileSync } from "fs"

// The bundled Inter woff2 is base64-inlined into style.css (and index.js via
// `?inline`), so the SIL Open Font License binary ships inside our artifacts.
// The OFL requires its license text to travel with the font, so emit it into
// dist as a sibling file. Non-peer build only — that pass owns style.css.
function emitFontLicense(): Plugin {
  return {
    name: "apollon-emit-font-license",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "LICENSE-InterFont",
        source: readFileSync(
          resolve(__dirname, "lib/assets/fonts/LICENSE-InterFont"),
          "utf8"
        ),
      })
    },
  }
}

// Two passes:
//   default        → dist/{index,internals}.js  (React + MUI + emotion + xyflow inlined)
//   LIB_PEERS=true → dist/react/react.js        (those packages externalized)
//
// The `<Apollon>` component ships ONLY from the peer build — otherwise it
// would render on a second, private React copy. The peer entry gets a
// `"use client"` banner so Next.js App Router consumers don't need to
// re-export it themselves (Rollup strips the source-level directive).
const isPeerBuild = process.env.LIB_PEERS === "true"

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ["lib"], rollupTypes: !isPeerBuild }),
    ...(isPeerBuild ? [] : [emitFontLicense()]),
  ],
  build: {
    copyPublicDir: false,
    outDir: isPeerBuild ? "dist/react" : "dist",
    emptyOutDir: !isPeerBuild,
    cssCodeSplit: false,
    // Base64-inline the bundled Inter woff2 (from lib/styles/fonts.css) into the
    // single published style.css instead of emitting separate assets (they
    // exceed Vite's 4 KB default). Trade-off: every style.css consumer downloads
    // the font inline — no separate request or 404 risk, but ~33% base64
    // overhead and no per-file HTTP caching. Acceptable for a small Latin
    // subset. The function scopes this to fonts; other assets keep the default.
    assetsInlineLimit: (filePath) =>
      /\.woff2?($|\?)/.test(filePath) ? true : undefined,
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
        banner: isPeerBuild ? '"use client";' : undefined,
      },
    },
    minify: true,
  },
  resolve: {
    alias: { "@": resolve(__dirname, "lib") },
  },
  esbuild: { drop: ["debugger"] },
})
