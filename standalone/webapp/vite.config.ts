import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { resolve } from "path"
import tailwindcss from "@tailwindcss/vite"
import { apollonAliasResolver, apollonAliases } from "./build/viteResolve"

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
