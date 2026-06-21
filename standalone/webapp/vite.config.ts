import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { resolve } from "path"
import fs from "fs"
import tailwindcss from "@tailwindcss/vite"

// Cross-package source aliases. Kept INLINE (not imported from ./build/viteResolve)
// so vite's esbuild config loader stays self-contained — importing a sibling
// module that pulls `vite` types crashes the esbuild config bundle in the CI
// visual container (mcr.microsoft.com/playwright noble). The Storybook config
// still uses build/viteResolve; only this config must be esbuild-load-safe.
const apollonAliases = [
  { find: "@", replacement: resolve(__dirname, "src") },
  { find: "assets", replacement: resolve(__dirname, "assets") },
  {
    find: "@tumaet/apollon",
    replacement: resolve(__dirname, "../../library/lib"),
  },
  {
    find: "@tumaet/ui",
    replacement: resolve(__dirname, "../../packages/ui/src"),
  },
]

// The editor library uses a `@/` alias -> library/lib, which collides with the
// webapp's own `@/` -> src. Rewrite `@/…` to an absolute library/lib path only
// inside files under the library directory; the webapp's `@/` keeps mapping to src.
const apollonAliasResolver = {
  name: "apollon-alias-resolver",
  enforce: "pre" as const,
  async load(id: string) {
    const libraryRoot = resolve(__dirname, "../../library").replace(/\\/g, "/")
    if (!id.replace(/\\/g, "/").includes(libraryRoot)) return null
    try {
      let code = await fs.promises.readFile(id, "utf-8")
      const libRoot = resolve(__dirname, "../../library/lib").replace(
        /\\/g,
        "/"
      )
      code = code.replace(
        /from\s+["']@\/([^"']+)["']/g,
        (_m, p) => `from "${resolve(libRoot, p).replace(/\\/g, "/")}"`
      )
      code = code.replace(
        /import\s+["']@\/([^"']+)["']/g,
        (_m, p) => `import "${resolve(libRoot, p).replace(/\\/g, "/")}"`
      )
      return { code, map: null }
    } catch {
      return null
    }
  },
}

const webappPort = Number(process.env.APOLLON_WEBAPP_PORT || 5173)
const serverPort = Number(process.env.APOLLON_SERVER_PORT || 8000)
const wsPort = Number(process.env.APOLLON_WS_PORT || 4444)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must run BEFORE the react plugin so it can transform route files and
    // (re)generate src/routeTree.gen.ts. File options live in tsr.config.json.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react({
      babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] },
    }),
    tailwindcss(),
    apollonAliasResolver,
  ],
  resolve: {
    alias: apollonAliases,
    // Avoid duplicate React copies across workspace
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: webappPort,
    host: true,
    strictPort: false,
    fs: {
      // Allow serving files from the monorepo root and the library package
      allow: [
        resolve(__dirname, "..", ".."),
        resolve(__dirname, "..", "..", "library"),
      ],
    },
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${serverPort}`,
        changeOrigin: true,
      },
      // The server-rendered embed page lives on the API host. Proxy it too so
      // the iframe snippet (which points at the webapp origin in dev) resolves
      // instead of falling through to the SPA's catch-all error page.
      "/embed": {
        target: `http://127.0.0.1:${serverPort}`,
        changeOrigin: true,
      },
      "/ws": {
        target: `ws://127.0.0.1:${wsPort}`,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ["@tumaet/apollon"],
  },
})
