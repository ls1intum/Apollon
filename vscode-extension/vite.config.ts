import { defineConfig } from "vite"
import { builtinModules } from "node:module"

// Library-mode build for the VS Code extension host bundle.
//
// - format: "cjs" — VS Code 1.86+ still requires CJS extension entries
//   (microsoft/vscode#130367, extensions explicitly opted out of the 1.94
//   ESM migration).
// - target: "node20" — VS Code 1.95+ ships Node 20.18 in the host.
// - external: `vscode` (host-provided) + every Node builtin with and
//   without the `node:` prefix. Anything else gets bundled.
// - sourcemap: separate `.map` file; .vscodeignore strips src/ from the
//   VSIX so the map references stay private to local debug.
// - inlineDynamicImports defaults to true in single-entry lib mode, so
//   no chunking — matches the LimitChunkCountPlugin guarantee webpack
//   provided.
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
      output: {
        exports: "named",
        interop: "auto",
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
