// The version sidebar (desktop rail + mobile drawer) is one of the editor's
// chrome surfaces: it is portaled into the editor's overlay regions and its
// glass surface derives from `--apollon-background`, so it themes in lock-step
// with the document — light in light mode, charcoal in dark. Text therefore
// uses the theme-following `--apollon-chrome-*` contract, NOT fixed on-dark
// tokens (white-on-light would be invisible in light mode).
export const TEXT_PRIMARY = "var(--apollon-chrome-text)"
// `--apollon-chrome-text-muted` (a 58% mix of the contrast colour into the
// background) is too weak: it lands at ~4.4:1 on the base surface and ~3.3:1
// over the selected-row tint — under WCAG AA. The sidebar renders muted
// captions on BOTH (the HEAD pseudo-row sits on the selected tint), so it uses
// a stronger 70% mix that clears 4.5:1 on every surface in both themes
// (light: ~6.7:1 base / ~5.0:1 selected; dark: ~6.7:1 base / ~6.1:1 selected).
export const TEXT_MUTED =
  "color-mix(in srgb, var(--apollon-foreground, #000) 70%, var(--apollon-background, #fff))"
export const ROW_HOVER_BG = "var(--apollon-chrome-surface-hover)"
export const ROW_SELECTED_BG = "var(--apollon-chrome-surface-active)"
