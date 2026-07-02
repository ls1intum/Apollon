---
"@tumaet/apollon": minor
---

Reshape and fix the editor theming API.

**New: `primaryForeground`.** `ApollonTheme.primaryForeground` (CSS var `--apollon-primary-foreground`) sets the ink drawn on `primary` — accent buttons, the active tool — and defaults to white. Set it to a dark value when your `primary` is light, so on-accent text stays legible instead of white-on-light.

**Fixed: scoped theming now covers the whole editor.** With a scoped `dataTheme="dark"` (or an inline `theme` override on the mount node), the in-canvas glass chrome and many surfaces previously stayed frozen in light mode — `surface` / `border` / `secondary` / `danger` / `grid` / swatches / assessment / collaboration colors, plus every popup that portals out of the editor (menus, selects, tooltips, and the element color picker). They now re-resolve against the scoped mount, so an editor themed dark on a light page is fully dark. Document-root dark (`data-theme` on `<html>`) was already correct and is unchanged.

**Reshaped the typed API.** `primaryContrast` → `foreground` (CSS var `--apollon-primary-contrast` → `--apollon-foreground`) and the danger CSS var `--apollon-alert-danger-color` → `--apollon-danger`; `foreground` is the page ink drawn on `background`, so the old name misled. Eleven never-painted Bootstrap-era fields (`backgroundInverse`, `warning` / `warningBackground` / `warningBorder`, `dangerBackground` / `dangerBorder`, `switchBoxBorderColor`, `listGroupColor`, `btnOutlineSecondaryColor`, `modalBottomBorder`, `surfaceHover`) were removed — the Base UI editor never painted them. The typed API is new and has no external consumers, so these ship as a minor rather than a major: un-themed embeds are unaffected, and a typed embed gets a compile error on any renamed/removed key. Theme `primary` + `background` + `foreground` and the chrome derives the rest (add `primaryForeground` if `primary` is light); see `THEMING.md`.
