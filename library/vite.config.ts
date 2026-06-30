import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"
import { readFileSync } from "fs"

// The bundled Inter woff2 is base64-inlined into style.css (and index.js via
// `?inline`), so the SIL Open Font License binary ships inside our artifacts.
// The OFL requires its license text to travel with the font, so emit it into
// dist as a sibling file.
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

// Single build pass — `dist/{index,internals,export}.js`.
//
// EVERY runtime dependency a consumer can install from `@tumaet/apollon` is
// externalized: the React family (react / react-dom / @xyflow/react), the UI
// primitives (Base UI, lucide), @dnd-kit, zustand, uuid, @chenglou/pretext, and
// the CRDT singletons (yjs / y-protocols). The host's bundler resolves and
// de-duplicates them and gets full SBOM attribution for each — instead of a
// minified copy inlined into one chunk and invisible to supply-chain tooling.
//
// This is the only published shape: `import { ApollonEditor } from
// "@tumaet/apollon"` for bundler hosts of any framework (Angular, Vue, Svelte —
// e.g. Artemis), and `import { Apollon } from "@tumaet/apollon"` for React
// hosts. Both render on the host's single React copy — one entry, no per-host or
// inlined build variants. CDN / no-bundler users load it via a CDN that resolves
// the peers (e.g. esm.sh); the React family / xyflow / yjs / y-protocols are
// declared as required peerDependencies.
//
// `@tumaet/ui` (Apollon's private, unpublishable design-system package) and its
// styling utilities (cmdk / class-variance-authority / clsx / tailwind-merge)
// stay BUNDLED — a consumer cannot install them, so they are not externalized.

// React-family peers — externalized so the editor renders on the host's single
// React 19 copy. (The React Compiler, target "19", emits `import { c } from
// "react/compiler-runtime"`, kept external so it resolves to the consumer's
// React 19, not a bundled copy.)
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
// `@tumaet/apollon` declares in `dependencies`, externalized like the peers
// above. Base UI + lucide are imported both directly AND through the bundled
// `@tumaet/ui`, so externalizing them here also de-duplicates @tumaet/ui's copy.
// Base UI + zustand use subpath regexes (`@base-ui/react/menu`,
// `zustand/middleware`) — Rollup treats subpaths as distinct ids, so an exact
// specifier would still inline them.
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
    dts({
      include: ["lib"],
      rollupTypes: true,
      // The JS build aliases @tumaet/ui to its TS source so the runtime inlines
      // into dist. For TYPES, resolve the package's published declarations (via
      // package.json `exports#types`) instead, so the rolled-up .d.ts doesn't
      // inline raw .ts source.
      aliasesExclude: [/^@tumaet\/ui/],
      // api-extractor (rollupTypes) otherwise leaves @tumaet/ui external; bundle
      // it so the rolled .d.ts is self-contained (no dependency on the private
      // workspace package).
      bundledPackages: ["@tumaet/ui"],
    }),
    // style.css base64-inlines Inter; the lazy exportFonts/exportStyles chunks
    // do too — OFL clause 2 requires the license to travel with the artifact.
    emitFontLicense(),
  ],
  build: {
    copyPublicDir: false,
    outDir: "dist",
    emptyOutDir: true,
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
      entry: {
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
      // so they never enter any published chunk; the lazy `import()`s in
      // lib/export resolve them from the host's node_modules.
      //
      // yjs is a CRDT whose runtime relies on module-level singletons
      // (`instanceof AbstractType`, shared Doc/transaction state). A bundled copy
      // would be a second, private Yjs that can't interoperate with the host's —
      // wasted bytes and a correctness hazard for hosts that already use Yjs.
      // Keep it (and the y-protocols helpers built on it) external so the host
      // provides exactly one instance; declared as a required peerDependency.
      external: [
        /^@resvg\/resvg-wasm/,
        "jspdf",
        "svg2pdf.js",
        "yjs",
        /^y-protocols(\/.*)?$/,
        ...REACT_PEERS,
        ...RUNTIME_DEPS,
      ],
      output: {
        assetFileNames: "assets/[name][extname]",
        entryFileNames: "[name].js",
        // The `<Apollon>` component and hooks ship from the main entry. Mark
        // only the `index` chunk `"use client"` (Rollup strips source-level
        // directives, so re-add it here) so React Server Component / Next.js App
        // Router consumers can import the component without re-wrapping it; the
        // `internals` / `export` chunks stay directive-free.
        banner: (chunk) => (chunk.name === "index" ? '"use client";' : ""),
      },
    },
    minify: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "lib"),
      // Consume the shared UI package from source so the published dist stays
      // self-contained (@tumaet/ui is inlined — never externalized — because it
      // is private and unpublishable).
      "@tumaet/ui": resolve(__dirname, "../packages/ui/src"),
    },
  },
  esbuild: { drop: ["debugger"] },
})
