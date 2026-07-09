import { defineConfig } from "vite"
import { builtinModules } from "node:module"

// Library-mode build for the VS Code extension host bundle.
//
// - format "cjs": extension entries opted out of the VS Code 1.94 ESM
//   migration and are still loaded as CommonJS (microsoft/vscode#130367).
// - target "node20": the version of Node the extension host runs.
// - `vscode` is provided by the host, and Node builtins by the runtime.
//   Everything else is bundled, so the VSIX ships no `node_modules`.
// - Sourcemaps are emitted for the local Extension Development Host and
//   stripped from the VSIX by `.vscodeignore`.
const isProd = process.env.NODE_ENV === "production"

const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
])

export default defineConfig({
  build: {
    target: "node20",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: isProd ? "esbuild" : false,
    reportCompressedSize: false,
    lib: {
      entry: "src/extension.ts",
      formats: ["cjs"],
      fileName: () => "extension.js",
    },
    rollupOptions: {
      external: (id) => id === "vscode" || nodeBuiltins.has(id),
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
