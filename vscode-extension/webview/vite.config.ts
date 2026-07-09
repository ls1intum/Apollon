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
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    target: "es2022",
    minify: true,
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        entryFileNames: "index.js",
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "index.css" : "assets/[name][extname]",
        inlineDynamicImports: true,
      },
    },
  },
})
