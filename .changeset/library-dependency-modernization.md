---
"@tumaet/apollon": patch
---

Modernize the build toolchain and cut a runtime dependency, behavior-identical. `uuid` is gone — the editor now mints RFC-4122 v4 IDs from an embed-safe `crypto.getRandomValues` (works in any context, unlike `crypto.randomUUID`). The build moves to Vite 8 (Rolldown/Oxc), TypeScript 6.0, and vite-plugin-dts 5 (+ `@microsoft/api-extractor`), and every remaining runtime dependency (`@base-ui/react`, `lucide-react`, `@chenglou/pretext`, …) is verified at its latest release. No public API or rendering change.
