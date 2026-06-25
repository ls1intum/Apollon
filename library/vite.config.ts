import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"
import { readFileSync } from "fs"

// The bundled Inter woff2 is base64-inlined into style.css (and index.js via
// `?inline`), so the SIL Open Font License binary ships inside our artifacts.
// The OFL requires its license text to travel with the font, so emit it into
// dist as a sibling file, in every build pass (each embeds the font).
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

// Three build passes (env-selected, run sequentially by the `build` script):
//   default           → dist/{index,internals,export}.js
//                        React + MUI + emotion + xyflow inlined: one
//                        self-contained file for non-bundler / non-React hosts.
//   LIB_PEERS=true     → dist/react/react.js
//                        React family externalized; ships the `<Apollon>`
//                        component for React hosts that share their own React.
//   LIB_EXTERNAL=true  → dist/external/index.js
//                        EVERY runtime dependency externalized (the React family
//                        plus @dnd-kit/zustand/uuid/@chenglou/pretext). Same
//                        imperative API as the default entry, but the host's
//                        bundler resolves, de-duplicates, and gets full SBOM
//                        attribution for each dependency instead of a minified
//                        inlined blob. For bundler hosts of any framework
//                        (Angular, Vue, Svelte, React) — e.g. Artemis.
//
// `yjs`/`y-protocols` are always external (CRDT singleton — see below).
const isPeerBuild = process.env.LIB_PEERS === "true"
const isExternalBuild = process.env.LIB_EXTERNAL === "true"
const isDefaultBuild = !isPeerBuild && !isExternalBuild

// React-family peers — externalized by the peer build and the fully external
// build so the editor renders on the host's single React 19 copy. (The React
// Compiler, target "19", emits `import { c } from "react/compiler-runtime"`,
// kept external so it resolves to the consumer's React 19, not a bundled copy.)
const REACT_PEERS = [
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

// Apollon's own non-framework runtime deps. Inlined everywhere except the fully
// external build, where the host resolves them — one shared copy and full SBOM
// visibility instead of a copy buried inside the bundle.
const RUNTIME_DEPS = [/^@dnd-kit\//, "zustand", "uuid", "@chenglou/pretext"]

export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] },
    }),
    // The fully external entry exposes the same surface as the default entry, so
    // it reuses the root `dist/index.d.ts` types — no need to emit a second copy.
    ...(isExternalBuild
      ? []
      : [dts({ include: ["lib"], rollupTypes: !isPeerBuild })]),
    // Every pass embeds Inter (style.css inline in the default pass; the lazy
    // exportFonts/exportStyles chunks base64-inline it in all) — OFL clause 2
    // requires the license to travel with every artifact, so emit it in each.
    emitFontLicense(),
  ],
  build: {
    copyPublicDir: false,
    outDir: isExternalBuild
      ? "dist/external"
      : isPeerBuild
        ? "dist/react"
        : "dist",
    // Only the first (default) pass clears dist; the later passes write into
    // their own subdirectories.
    emptyOutDir: isDefaultBuild,
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
        : isExternalBuild
          ? { index: resolve(__dirname, "lib/index.tsx") }
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
      // in every pass so they never enter any published chunk; the lazy
      // `import()`s in lib/export resolve them from the host's node_modules.
      external: [
        /^@resvg\/resvg-wasm/,
        "jspdf",
        "svg2pdf.js",
        // Yjs is a CRDT whose runtime relies on module-level singletons
        // (`instanceof AbstractType` checks, the shared Doc/transaction state).
        // A bundled copy would be a second, private Yjs that can't interoperate
        // with the host's — both wasted bytes and a correctness hazard for hosts
        // that already use Yjs (e.g. a collaborative code editor). Keep it (and
        // the y-protocols awareness/sync helpers built on it) external in ALL
        // passes so the host provides exactly one instance; declared as required
        // peerDependencies.
        "yjs",
        /^y-protocols(\/.*)?$/,
        ...(isPeerBuild || isExternalBuild ? REACT_PEERS : []),
        ...(isExternalBuild ? RUNTIME_DEPS : []),
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
