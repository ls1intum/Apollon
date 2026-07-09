import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// The editor webview. Output filenames `index.js` / `index.css` are LOAD-BEARING:
// `src/webviewHtml.ts` references them by name.
//
// `yjs` is bundled rather than externalized — it backs the library's diagram
// store (local undo/redo, not just collaboration), and a webview has no module
// resolution at runtime.
export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] },
    }),
  ],
  // Assets resolve relative to the `vscode-webview:` URI the host hands out.
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
