---
"@tumaet/ui": patch
---

Drop the unused `cmdk` command-palette component (zero importers) and its dependency, plus a dead `@vitest/coverage-v8` dev dependency. Migrate React linting to `@eslint-react` for ESLint 10 and bump the toolchain (Tailwind 4.3). No component API change.
