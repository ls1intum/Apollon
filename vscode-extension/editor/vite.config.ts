import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// Output filenames `index.js` and `index.css` are load-bearing —
// ../src/menu-provider.ts references them directly.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    target: "es2022",
    minify: true,
    rollupOptions: {
      input: "src/index.tsx",
      output: {
        entryFileNames: "index.js",
        chunkFileNames: "[name].js",
        assetFileNames: (info) => {
          if (info.name && info.name.endsWith(".css")) {
            return "index.css"
          }
          return "assets/[name][extname]"
        },
        inlineDynamicImports: true,
      },
    },
  },
})
