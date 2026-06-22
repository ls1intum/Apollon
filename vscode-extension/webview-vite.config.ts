import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, type UserConfig } from "vite"

// Shared Vite config for both webviews (menu/ and editor/).
//
// Output filenames `index.js` and `index.css` are LOAD-BEARING — the
// extension host reads them by name from `src/menu-provider.ts`. Don't
// rename without updating that file.
//
// Per-webview vite.config.ts files re-export this so a single `tsc` /
// `vite` invocation per workspace still sees a config file, and Tailwind
// JIT scans each webview's own src/ tree (it uses CWD by default).
export function defineWebviewConfig(): UserConfig {
  return defineConfig({
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", { target: "19" }]],
        },
      }),
      tailwindcss(),
    ],
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
          assetFileNames: (info) =>
            info.name?.endsWith(".css")
              ? "index.css"
              : "assets/[name][extname]",
          inlineDynamicImports: true,
        },
      },
    },
  })
}
