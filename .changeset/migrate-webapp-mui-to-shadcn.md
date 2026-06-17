---
"@tumaet/webapp": minor
---

Migrate the standalone web app from MUI 6 / Emotion to a shared shadcn-style component library (`@tumaet/ui`) built on Base UI primitives and `lucide-react`, unifying the editor shell, modals, version history, and home gallery with the Tailwind homepage. Design tokens now live in a single source of truth and are exposed to Tailwind via `@theme`, the navbar is a single responsive component, dialogs/menus/sheets use Base UI for accessible focus trapping and `Escape` handling, and the editor accent is bridged to the app accent for one coherent brand. Removes the `@mui/material`, `@mui/icons-material`, and `@emotion/*` dependencies.
