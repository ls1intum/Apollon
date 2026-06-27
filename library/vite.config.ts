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
//                        React + Base UI + lucide + xyflow inlined: one
//                        self-contained file for non-bundler / non-React hosts.
//   LIB_PEERS=true     → dist/react/react.js
//                        React family externalized (Base UI + lucide stay
//                        bundled); ships the `<Apollon>` component for React
//                        hosts that share their own React.
//   LIB_EXTERNAL=true  → dist/external/index.js
//                        EVERY runtime dependency externalized (the React family
//                        plus Base UI, lucide, @dnd-kit, zustand, uuid, and
//                        @chenglou/pretext). Same imperative API as the default
//                        entry, but the host's bundler resolves, de-duplicates,
//                        and gets full SBOM attribution for each dependency
//                        instead of a minified inlined blob. For bundler hosts of
//                        any framework (Angular, Vue, Svelte, React) — e.g.
//                        Artemis.
//
// `@tumaet/ui` (Apollon's private design-system package) and its small styling
// utilities (class-variance-authority / clsx / tailwind-merge) are NOT
// publishable on their own, so they stay bundled in EVERY pass — only deps a
// consumer can actually install from `@tumaet/apollon` are externalized.
//
// `yjs`/`y-protocols` are always external (CRDT singleton — see below).
//
// The `<Apollon>` component ships ONLY from the peer build — otherwise it
// would render on a second, private React copy. The peer entry gets a
// `"use client"` banner so Next.js App Router consumers don't need to
// re-export it themselves (Rollup strips the source-level directive).
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
  "@xyflow/react",
]

// Apollon's own non-framework runtime deps — every third-party package
// `@tumaet/apollon` declares in `dependencies`. Inlined everywhere except the
// fully external build, where the host resolves them from its own node_modules:
// one shared copy and full SBOM visibility instead of a copy buried inside the
// bundle. Base UI + lucide are the editor's UI primitives; the editor imports
// them directly AND through the bundled `@tumaet/ui`, so externalizing them here
// also de-duplicates @tumaet/ui's copy.
// @tumaet/ui's other deps (cva / clsx / tailwind-merge) are NOT declared
// by @tumaet/apollon, so they stay bundled — a consumer couldn't install them.
// Base UI + zustand are matched with subpaths (`@base-ui/react/menu`,
// `zustand/middleware`) — Rollup treats those as distinct ids, so an exact
// specifier would still inline them into the external build.
const RUNTIME_DEPS = [
  /^@base-ui\/react(\/.*)?$/,
  "lucide-react",
  /^@dnd-kit\//,
  /^zustand(\/.*)?$/,
  "uuid",
  "@chenglou/pretext",
]

export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] },
    }),
    // The fully external entry exposes the same surface as the default entry, so
    // it reuses the root `dist/index.d.ts` types — no need to emit a second copy.
    ...(isExternalBuild
      ? []
      : [
          dts({
            include: ["lib"],
            rollupTypes: !isPeerBuild,
            // The JS build aliases @tumaet/ui to its TS source so the runtime
            // inlines into dist. For TYPES, resolve the package's published
            // declarations (via package.json `exports#types`) instead, so the
            // rolled-up .d.ts (default build) doesn't inline raw .ts source. The
            // peer (per-file) build can't inline an external pkg in
            // declarations, so a post-build step (see package.json `build`)
            // localises the @tumaet/ui/theme re-export.
            aliasesExclude: [/^@tumaet\/ui/],
            // api-extractor (rollupTypes) otherwise leaves @tumaet/ui external;
            // bundle it so the rolled .d.ts is self-contained.
            bundledPackages: ["@tumaet/ui"],
          }),
        ]),
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
    alias: {
      "@": resolve(__dirname, "lib"),
      // Consume the shared UI package from source so the published dist stays
      // self-contained (@tumaet/ui is inlined — never externalized — in all
      // three build passes above; it is private and unpublishable, so even the
      // fully external entry bundles it).
      "@tumaet/ui": resolve(__dirname, "../packages/ui/src"),
    },
  },
  esbuild: { drop: ["debugger"] },
})
