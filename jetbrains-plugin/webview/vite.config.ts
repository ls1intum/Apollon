import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// The diagram canvas hosted inside the JetBrains plugin's JCEF browser.
// Output filenames `index.js` / `index.css` are LOAD-BEARING: `public/index.html`
// references them by name, and (from Phase 2 onward) the plugin's custom scheme
// handler serves this directory verbatim.
//
// `yjs` is bundled rather than externalized — it backs the library's diagram
// store (local undo/redo, not just collaboration), and a JCEF page has no
// module resolution at runtime beyond what we ship it.
export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] },
    }),
  ],
  // Assets resolve relative to whatever origin serves this bundle (a local Vite
  // dev server during development, the plugin's custom scheme in production).
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    target: "es2022",
    minify: true,
    // The resvg wasm binary must stay a real asset for `?url` to name it.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        entryFileNames: "index.js",
        // The PNG renderer and its 2.5 MB wasm binary are `import()`-ed on first
        // export; splitting them out keeps them off the canvas's startup path.
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "index.css" : "assets/[name][extname]",
      },
    },
  },
})
