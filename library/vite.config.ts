import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import { resolve } from "path"

// Two passes from one config: default emits the standalone bundle (peers
// inlined); LIB_PEERS=true emits dist/react/ with peers externalized.
// Only the first pass runs vite-plugin-dts — both subpaths share one .d.ts.
const isPeerBuild = process.env.LIB_PEERS === "true"

export default defineConfig({
  plugins: [react(), ...(isPeerBuild ? [] : [dts({ include: ["lib"] })])],
  build: {
    copyPublicDir: false,
    outDir: isPeerBuild ? "dist/react" : "dist",
    emptyOutDir: !isPeerBuild,
    cssCodeSplit: false,
    lib: {
      name: "apollon-library",
      entry: resolve(__dirname, "lib/index.tsx"),
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
        entryFileNames: "index.js",
      },
    },
    minify: true,
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "lib"),
    },
  },
  esbuild: { drop: ["console", "debugger"] },
})
