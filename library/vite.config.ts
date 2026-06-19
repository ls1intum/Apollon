import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"
import { readFileSync } from "fs"

// The bundled Inter woff2 is base64-inlined into style.css (and index.js via
// `?inline`), so the SIL Open Font License binary ships inside our artifacts.
// The OFL requires its license text to travel with the font, so emit it into
// dist as a sibling file, in both build passes (each embeds the font).
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
    // React Compiler (target "19" — the library is React-19-only) emits
    // `import { c } from "react/compiler-runtime"`, which the peer build keeps
    // external so it resolves to the consumer's React 19 rather than bundling a
    // polyfill copy.
    react({
      babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] },
    }),
    dts({ include: ["lib"], rollupTypes: !isPeerBuild }),
    // Both passes embed Inter (style.css inline in the default pass; the lazy
    // exportFonts/exportStyles chunks base64-inline it in both) — OFL clause 2
    // requires the license to travel with every artifact, so emit it in each.
    emitFontLicense(),
  ],
  build: {
    copyPublicDir: false,
    outDir: isPeerBuild ? "dist/react" : "dist",
    emptyOutDir: !isPeerBuild,
    cssCodeSplit: false,
    // Base64-inline the bundled Inter woff2 (from lib/styles/fonts.css) into the
    // single published style.css instead of emitting separate assets (they
    // exceed Vite's 4 KB default). Trade-off: every style.css consumer downloads
    // the font inline (~+170 KB gzipped for the Latin+Greek+Cyrillic+Vietnamese
    // subset — woff2 is already Brotli-compressed, so base64-inlining adds ~the
    // raw woff2 size and gzip can't shrink it further) — no separate request or
    // 404 risk, but no per-file HTTP caching. Accepted to keep one
    // self-contained stylesheet. The function scopes this to fonts; other
    // assets keep the default.
    assetsInlineLimit: (filePath) =>
      /\.woff2?($|\?)/.test(filePath) ? true : undefined,
    lib: {
      entry: isPeerBuild
        ? { react: resolve(__dirname, "lib/react.tsx") }
        : {
            index: resolve(__dirname, "lib/index.tsx"),
            internals: resolve(__dirname, "lib/internals.ts"),
            export: resolve(__dirname, "lib/export/index.ts"),
          },
      formats: ["es"],
      cssFileName: "style",
    },
    rollupOptions: {
      // The `@tumaet/apollon/export` renderers are optionalDependencies the
      // consumer installs — keep them (and resvg's `?url` wasm subpath) external
      // in both passes so they never enter any published chunk; the lazy
      // `import()`s in lib/export resolve them from the host's node_modules.
      external: [
        /^@resvg\/resvg-wasm/,
        "jspdf",
        "svg2pdf.js",
        ...(isPeerBuild
          ? [
              "react",
              "react-dom",
              "react/jsx-runtime",
              "react/jsx-dev-runtime",
              "react/compiler-runtime",
              "react-dom/client",
              "@emotion/react",
              "@emotion/styled",
              /^@mui\/material(\/.*)?$/,
              "@xyflow/react",
            ]
          : []),
      ],
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
