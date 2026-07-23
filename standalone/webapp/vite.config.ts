import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { resolve } from "path"
import fs from "fs"
import tailwindcss from "@tailwindcss/vite"

// Cross-package source aliases. Kept INLINE here (and mirrored in ./viteResolve
// for the Storybook vitest config) rather than imported: importing a sibling
// module crashes Vite's esbuild config loader in the CI Playwright container
// (mcr.microsoft.com/playwright noble), so only this config must stay
// self-contained. Keep the two copies in sync.
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

// Pure routing kernel loaded by a module Worker. It contains no JSX and must not
// receive React Refresh's browser-only `window` preamble in dev mode.
const ROUTING_KERNEL =
  /library\/lib\/(?:utils\/geometry\/|utils\/(?:edgeUtils|connectionModes)\.ts|edges\/Connection\.ts)/

// The editor library uses a `@/` alias -> library/lib, which collides with the
// webapp's own `@/` -> src. Rewrite `@/…` imports in library files to an absolute
// library/lib path (the webapp's `@/` keeps mapping to src). Only files that
// actually import `@/…` are intercepted, so every other library file keeps Vite's
// native source maps; the rewrite is line-preserving, so only the import lines of
// the rewritten files shift.
const createApollonAliasResolver = () => ({
  name: "apollon-alias-resolver",
  enforce: "pre" as const,
  async load(id: string) {
    const libraryRoot = resolve(__dirname, "../../library").replace(/\\/g, "/")
    if (!id.replace(/\\/g, "/").includes(libraryRoot)) return null
    let original: string
    try {
      original = await fs.promises.readFile(id, "utf-8")
    } catch {
      return null
    }
    if (!original.includes("@/")) return null
    const libRoot = resolve(__dirname, "../../library/lib").replace(/\\/g, "/")
    const code = original
      .replace(
        /from\s+["']@\/([^"']+)["']/g,
        (_m, p) => `from "${resolve(libRoot, p).replace(/\\/g, "/")}"`
      )
      .replace(
        /import\s+["']@\/([^"']+)["']/g,
        (_m, p) => `import "${resolve(libRoot, p).replace(/\\/g, "/")}"`
      )
    if (code === original) return null
    return { code, map: null }
  },
})

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
      exclude: ROUTING_KERNEL,
      babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] },
    }),
    tailwindcss(),
    createApollonAliasResolver(),
  ],
  // Worker bundles run their own plugin pipeline. The edge-geometry worker is
  // reached through the library source alias, so it needs the same `@/` rewrite
  // as the main webapp graph rather than resolving those imports into webapp/src.
  worker: {
    plugins: () => [createApollonAliasResolver()],
  },
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
