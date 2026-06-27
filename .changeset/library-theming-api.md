---
"@tumaet/apollon": minor
---

Adds a public theming API for embedding hosts. You can now theme the editor with a typed helper instead of hand-writing CSS variables: `createApollonTheme()` maps a structured `ApollonTheme` (primary, background, grid, etc.) to the underlying `--apollon-*` custom properties, and `<Apollon>` accepts optional `theme` and `dataTheme` props (also available as `ApollonOptions` fields) that are applied to the editor mount node.

```ts
import { Apollon, createApollonTheme } from "@tumaet/apollon/react"

<Apollon theme={createApollonTheme({ primary: "#6d28d9", background: "#0b0b0c" })} dataTheme="dark" />
```

The CSS custom-property contract remains the framework-agnostic source of truth (documented in `THEMING.md`); the helper is an ergonomic, type-safe wrapper over it. Un-themed embeds are unaffected.
