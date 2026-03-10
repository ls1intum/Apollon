import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve, join } from "path"
import fs from "fs"
import tailwindcss from "@tailwindcss/vite"
// tsconfigPaths optional; using a targeted transform plugin instead

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "apollon-alias-resolver",
      enforce: "pre",
      async load(id) {
        // Only process library files
        const libraryRoot = resolve(__dirname, "../../library").replace(/\\/g, "/")
        const normalizedId = id.replace(/\\/g, "/")
        
        if (!normalizedId.includes(libraryRoot)) {
          return null
        }
        
        // Read the file
        try {
          let code = await fs.promises.readFile(id, "utf-8")
          const libraryLibRoot = resolve(__dirname, "../../library/lib").replace(/\\/g, "/")
          
          // Replace @/ imports with absolute paths to library/lib
          code = code.replace(
            /from\s+["']@\/([^"']+)["']/g,
            (match, importPath) => {
              const absolutePath = resolve(libraryLibRoot, importPath).replace(/\\/g, "/")
              return `from "${absolutePath}"`
            }
          )
          
          code = code.replace(
            /import\s+["']@\/([^"']+)["']/g,
            (match, importPath) => {
              const absolutePath = resolve(libraryLibRoot, importPath).replace(/\\/g, "/")
              return `import "${absolutePath}"`
            }
          )
          
          return { code, map: null }
        } catch (e) {
          return null
        }
      },
    },
  ],
  resolve: {
    alias: [
      { find: "@", replacement: resolve(__dirname, "src") },
      { find: "assets", replacement: resolve(__dirname, "assets") },
      // Use local library build output entry file for reliable resolution
      {
        find: "@tumaet/apollon",
        replacement: resolve(__dirname, "../../library/lib"),
      },
    ],
    // Avoid duplicate React copies across workspace
    dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    fs: {
      // Allow serving files from the monorepo root and the library package
      allow: [
        resolve(__dirname, "..", ".."),
        resolve(__dirname, "..", "..", "library"),
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:4444",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ["@tumaet/apollon"],
  },
})