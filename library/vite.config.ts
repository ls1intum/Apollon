import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"

// Two passes:
//   default        → dist/{index,internals}.js  (React + xyflow inlined)
//   LIB_PEERS=true → dist/react/react.js        (those packages externalized)
//
// Base UI and lucide are regular deps, bundled into both builds (never external).
//
// The `<Apollon>` component ships ONLY from the peer build — otherwise it
// would render on a second, private React copy. The peer entry gets a
// `"use client"` banner so Next.js App Router consumers don't need to
// re-export it themselves (Rollup strips the source-level directive).
const isPeerBuild = process.env.LIB_PEERS === "true"

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["lib"],
      rollupTypes: !isPeerBuild,
      // The JS build aliases @tumaet/ui to its TS source so the runtime inlines
      // into dist. For TYPES, resolve the package's published declarations (via
      // package.json `exports#types`) instead, so the rolled-up .d.ts (default
      // build) doesn't inline raw .ts source. The peer (per-file) build can't
      // inline an external pkg in declarations, so a post-build step (see
      // package.json `build`) localises the @tumaet/ui/theme re-export.
      aliasesExclude: [/^@tumaet\/ui/],
      // api-extractor (rollupTypes) otherwise leaves @tumaet/ui external;
      // bundle it so the rolled .d.ts is self-contained.
      bundledPackages: ["@tumaet/ui"],
    }),
  ],
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
    alias: {
      "@": resolve(__dirname, "lib"),
      // Consume the shared UI package from source so the published dist stays
      // self-contained (@tumaet/ui is inlined — never externalized — in both
      // the default and the LIB_PEERS build passes above).
      "@tumaet/ui": resolve(__dirname, "../packages/ui/src"),
    },
  },
  esbuild: { drop: ["debugger"] },
})
