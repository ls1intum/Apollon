import fs from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// Cross-package source resolution shared by the Storybook vitest config
// (vitest.config.storybook.ts). vite.config.ts keeps its OWN inline copy of this
// logic on purpose: importing a sibling module from vite.config crashes Vite's
// esbuild config loader in the CI Playwright container, so the two must be kept
// in sync by hand. This file lives at the package root (not under build/, which
// is gitignored) so it is committed and present on a fresh checkout.
const here =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))

// Resolve the editor library and design system from source so Storybook gets
// real HMR + Fast Refresh on their components.
export const apollonAliases = [
  { find: "@", replacement: resolve(here, "src") },
  { find: "assets", replacement: resolve(here, "assets") },
  { find: "@tumaet/apollon", replacement: resolve(here, "../../library/lib") },
  { find: "@tumaet/ui", replacement: resolve(here, "../../packages/ui/src") },
]

// The editor library uses a `@/` alias -> library/lib, which collides with the
// webapp's own `@/` -> src. Rewrite `@/…` imports in library files to an absolute
// library/lib path. Only files that actually import `@/…` are intercepted, so
// every other library file keeps Vite's native source maps.
export const apollonAliasResolver = {
  name: "apollon-alias-resolver",
  enforce: "pre" as const,
  async load(id: string) {
    const libraryRoot = resolve(here, "../../library").replace(/\\/g, "/")
    if (!id.replace(/\\/g, "/").includes(libraryRoot)) return null
    let original: string
    try {
      original = await fs.promises.readFile(id, "utf-8")
    } catch {
      return null
    }
    if (!original.includes("@/")) return null
    const libRoot = resolve(here, "../../library/lib").replace(/\\/g, "/")
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
}
