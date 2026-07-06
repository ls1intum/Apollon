# Theming `@tumaet/apollon`

The embeddable Apollon editor is themed entirely through **CSS custom
properties** (`--apollon-*`) plus an optional **`data-theme`** attribute. There
is no CSS-in-JS and no Tailwind in the published bundle — just one
self-contained, Preflight-free stylesheet that _references_ these variables with
built-in light/dark fallbacks. That makes theming framework-agnostic: it works
from React, VS Code webviews, or plain HTML, and an un-themed embed renders
correctly out of the box.

```ts
import "@tumaet/apollon/style.css" // the editor stylesheet (loads the defaults)
```

> **`--apollon-*` is THE public theming contract.** Those are the only variable
> names guaranteed stable across releases. The library is Tailwind-free and
> ships its own self-contained `style.css`, so **do not** reach for shadcn's
> unprefixed token names — `--color-*`, `--radius-*`, and the webapp's `--home-*`
> accent variables are **private/internal** implementation details that are not
> exposed by the published bundle and may change at any time. Theme exclusively
> through `--apollon-*` (typed via `createApollonTheme`) and `data-theme`.

## Quick start

**Start here.** For a first rebrand you only need a handful of tokens. Set
`primary` (your accent), `background` (the canvas), and `foreground` (the ink on
that canvas); optionally `radius`. The entire floating chrome — palette, toolbars,
minimap, menus — re-derives from `background` + `foreground`, so those three get
you ~90% of the way. One caveat: text drawn _on_ `primary` defaults to white,
so if your `primary` is light, also set `primaryForeground` to a dark ink.
Everything below is fine-tuning.

```tsx
import { Apollon, createApollonTheme } from "@tumaet/apollon"

export function Editor() {
  return (
    <Apollon
      // Give the mount a real, resolvable height — a 0px box renders blank.
      style={{ height: "80vh" }}
      theme={createApollonTheme({
        primary: "#ff5722",
        background: "#ffffff",
        foreground: "#1a1a1a",
      })}
    />
  )
}
```

`theme` is spread onto the editor's mount node as inline CSS variables. Anything
you don't set falls back to the stylesheet defaults, so partial themes are fine.

## The `--apollon-*` variable contract

These are the stable, documented variables. Every selector in the editor
stylesheet references them as `var(--apollon-x, <fallback>)`, so overriding any
subset is safe and forward-compatible. The typed `ApollonTheme` field is the
ergonomic alias `createApollonTheme` maps to the CSS variable.

| `ApollonTheme` field | CSS variable                   | Used for                                            |
| -------------------- | ------------------------------ | --------------------------------------------------- |
| `primary`            | `--apollon-primary`            | Accent / brand color (selection, links, highlights) |
| `primaryForeground`  | `--apollon-primary-foreground` | Ink on `primary` — set it when `primary` is light   |
| `foreground`         | `--apollon-foreground`         | Page foreground — the ink drawn on `background`     |
| `secondary`          | `--apollon-secondary`          | Muted / secondary accent                            |
| `background`         | `--apollon-background`         | Canvas / surface background                         |
| `backgroundVariant`  | `--apollon-background-variant` | Slightly raised surface variant                     |
| `surface`            | `--apollon-surface`            | Raised card / popover / menu surface                |
| `surfaceSunken`      | `--apollon-surface-sunken`     | Sunken / recessed surface                           |
| `border`             | `--apollon-border`             | Default border / divider color                      |
| `borderSubtle`       | `--apollon-border-subtle`      | Subtle border / divider color                       |
| `radius`             | `--apollon-radius`             | Base corner radius for shared primitives            |
| `gray`               | `--apollon-gray`               | Neutral gray surface                                |
| `grayVariant`        | `--apollon-gray-variant`       | Stronger gray (borders / dividers)                  |
| `grid`               | `--apollon-grid`               | Canvas grid line color                              |
| `guideVertical`      | `--apollon-guide-vertical`     | Vertical alignment guide                            |
| `guideHorizontal`    | `--apollon-guide-horizontal`   | Horizontal alignment guide                          |
| `danger`             | `--apollon-danger`             | Error / danger text (e.g. validation messages)      |

> **Reshaped the typed theming API.** The typed surface was slimmed and two tokens
> renamed. **No action** is needed for un-themed embeds. If you set a typed
> theme: rename `primaryContrast` → **`foreground`** (CSS var
> `--apollon-primary-contrast` → **`--apollon-foreground`**), and the danger CSS
> var `--apollon-alert-danger-color` → **`--apollon-danger`**. Eleven Bootstrap-era
> fields (`backgroundInverse`, `warning` / `warningBackground` / `warningBorder`,
> `dangerBackground` / `dangerBorder`, `switchBoxBorderColor`, `listGroupColor`,
> `btnOutlineSecondaryColor`, `modalBottomBorder`, `surfaceHover`) were removed —
> the Base UI editor never painted them, so setting them already did nothing;
> delete them from your theme object (TypeScript will flag the removed keys).

> **Contrast / pairing.** The palette is internally balanced for WCAG AA. When you
> override one side of a pair, override the other: `foreground` is the ink on
> `background` (and the whole chrome ramp derives from that pair), and
> `primaryForeground` is the ink on `primary`. Changing only one side can drop
> text below the AA contrast ratio — verify each pair (`background` ⇄
> `foreground`, `primary` ⇄ `primaryForeground`) with a contrast checker.

## Radius scale, elevation, and state tints (`--apollon-*`) — CSS-only hooks

A second band of stable `--apollon-*` variables tunes the shared editor
primitives' corner radii, drop shadow, and a couple of state tints. These are
**CSS-variable-only** — they are not on `ApollonTheme` / `createApollonTheme`
(the typed surface stays focused on color), but the names are part of the public
contract, so set them directly via `style` / a stylesheet rule when you want to
restyle the editor's shape or elevation:

| CSS variable                         | Used for                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `--apollon-radius-sm`                | Small radius — node hover/selection rings, chips, pills (default 4px).             |
| `--apollon-radius-md`                | Control radius — inputs, toggles. Routes through `--apollon-radius` (default 6px). |
| `--apollon-radius-lg`                | Panel / popover / menu radius (default 8px).                                       |
| `--apollon-shadow`                   | Drop shadow for floating surfaces — menus, popovers, select listboxes.             |
| `--apollon-interactive-selection`    | Accent ring/fill marking interactive (quiz-pickable) elements (default amber).     |
| `--apollon-hover-neutral`            | Neutral hover wash for quiet controls, derived off `--apollon-foreground`.         |
| `--apollon-dropzone-accent`          | Ring/stroke shown on an assessment feedback drop target on hover (default blue).   |
| `--apollon-dropzone-accent-fill`     | Translucent fill (40% of `--apollon-dropzone-accent`) outlining box/div targets.   |
| `--apollon-on-collaboration-cursor`  | Ink (text/stroke) drawn on a collaborator's colored cursor/avatar (default white). |
| `--apollon-assessment-positive-text` | Glyph/text for a positive (rewarded) score — popover pill AND on-canvas badge.     |
| `--apollon-assessment-positive-bg`   | Soft tint behind a positive score (popover pill + canvas badge).                   |
| `--apollon-assessment-negative-text` | Glyph/text for a negative (penalty) score.                                         |
| `--apollon-assessment-negative-bg`   | Soft tint behind a negative score.                                                 |
| `--apollon-assessment-zero-text`     | Glyph/text for a zero score.                                                       |
| `--apollon-assessment-zero-bg`       | Soft tint behind a zero score.                                                     |
| `--apollon-assessment-ungraded-text` | Text for the "Not graded" pill (popover only — ungraded elements get no badge).    |
| `--apollon-assessment-ungraded-bg`   | Soft tint behind the "Not graded" pill.                                            |

```css
/* Sharpen the editor's corners and lift its menus a touch more. */
.apollon-editor {
  --apollon-radius-sm: 2px;
  --apollon-radius-md: 3px;
  --apollon-radius-lg: 6px;
  --apollon-shadow: 0 6px 20px rgb(0 0 0 / 22%);
}
```

`--apollon-radius-md` references `--apollon-radius`, so tuning the single base
`radius` token still flows through to controls; override `-md` explicitly only
when you want it to diverge from the base. Like every editor variable, each is
referenced as `var(--apollon-x, <fallback>)`, so an un-themed embed keeps the
built-in defaults.

## Collaboration cursor palette (`--apollon-collaboration-color-*`)

When real-time collaboration is enabled, each remote participant's cursor,
selection, and name tag is painted in one of eight stable palette slots. The
slot is chosen deterministically from the participant's name, so the same person
keeps the same color across a session. The defaults are an eight-hue ramp tuned
to stay legible on both the light and dark canvas; override any subset to match
your own brand or accessibility needs (the names are part of the public
contract):

| CSS variable                      | Used for                                   |
| --------------------------------- | ------------------------------------------ |
| `--apollon-collaboration-color-1` | Remote-participant cursor slot 1 (amber).  |
| `--apollon-collaboration-color-2` | Remote-participant cursor slot 2 (green).  |
| `--apollon-collaboration-color-3` | Remote-participant cursor slot 3 (blue).   |
| `--apollon-collaboration-color-4` | Remote-participant cursor slot 4 (red).    |
| `--apollon-collaboration-color-5` | Remote-participant cursor slot 5 (violet). |
| `--apollon-collaboration-color-6` | Remote-participant cursor slot 6 (teal).   |
| `--apollon-collaboration-color-7` | Remote-participant cursor slot 7 (orange). |
| `--apollon-collaboration-color-8` | Remote-participant cursor slot 8 (cyan).   |

## Color-picker swatch palette (`--apollon-swatch-*`)

The editor's color picker offers a fixed, accessibility-tuned nine-hue palette
for fills and strokes. Each slot is a public, settable handle; the defaults
re-resolve per theme so the swatches stay legible on both the light and dark
canvas. Override any subset to match your own brand palette.

| CSS variable              | Used for                                |
| ------------------------- | --------------------------------------- |
| `--apollon-swatch-slate`  | Color-picker swatch — slate (default).  |
| `--apollon-swatch-red`    | Color-picker swatch — red (default).    |
| `--apollon-swatch-orange` | Color-picker swatch — orange (default). |
| `--apollon-swatch-amber`  | Color-picker swatch — amber (default).  |
| `--apollon-swatch-green`  | Color-picker swatch — green (default).  |
| `--apollon-swatch-teal`   | Color-picker swatch — teal (default).   |
| `--apollon-swatch-blue`   | Color-picker swatch — blue (default).   |
| `--apollon-swatch-violet` | Color-picker swatch — violet (default). |
| `--apollon-swatch-pink`   | Color-picker swatch — pink (default).   |

## Editor chrome (`--apollon-chrome-*`) — auto-derived, rarely set

The floating editor chrome — the element palette, zoom / undo controls, minimap,
header islands, and version rail — is painted from a second band of variables,
`--apollon-chrome-*`. **You almost never set these.** Every chrome surface,
border, and text color is `color-mix()`-**derived from the two tokens you already
theme** — `--apollon-background` and `--apollon-foreground` — so theming
those two gives the chrome correct, cohesive light/dark values for free. (The one
exception is the ink _on_ the accent, `--apollon-chrome-accent-contrast`, which
follows `primaryForeground` — set that if your `primary` is light.) They are
deliberately kept out of `ApollonTheme` / `createApollonTheme` for that reason:
the typed API is the surface you tune; chrome follows.

The handful that are genuinely meant to be tuned (and are safe to override) are:

| CSS variable                 | Used for                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `--apollon-chrome-accent`    | Accent for meaning (primary action, current marker). Defaults to `--apollon-primary`. |
| `--apollon-chrome-radius-sm` | Pill / small-control corner radius (default 6px).                                     |
| `--apollon-chrome-radius-md` | Control corner radius (default 8px).                                                  |
| `--apollon-chrome-radius-lg` | Panel / rail corner radius (default 12px).                                            |
| `--apollon-chrome-edge`      | Margin from the canvas edge for every cluster (default 10px).                         |
| `--apollon-chrome-gap`       | Gap between adjacent clusters (default 8px).                                          |

Everything else under `--apollon-chrome-*` (the derived surface / border / text
ramp, the glass tint + blur, shadows, motion tokens, and the dimensional
`btn`/`pad`/`hit`/`island-h` system) is **internal** — derived or structural, not
part of the stable contract. Don't depend on those names; theme `background` +
`foreground` and let the chrome derive.

## Light / dark — the `data-theme` mechanism

The bundled stylesheet ships **light defaults in `:root`** and **dark deltas in
`:root[data-theme="dark"]`**. To switch the whole document to dark, set the
attribute on the document root (and let the browser style native controls):

```ts
document.documentElement.setAttribute("data-theme", "dark")
document.documentElement.style.colorScheme = "dark"
```

The editor also reads `data-theme` from any **ancestor**, so you can scope dark
mode to a subtree instead of the whole page. The `<Apollon>` component and the
imperative `ApollonEditor` both accept a `dataTheme` option that sets the
attribute directly on the mount node:

```tsx no-check
<Apollon dataTheme="dark" />
```

```ts no-check
new ApollonEditor(element, { dataTheme: "dark" })
```

Scoped `dataTheme` themes the **entire editor** — the canvas, the derived glass
chrome, and every floating surface (menus, selects, tooltips, the color picker),
even though those portal to `document.body` outside the mount subtree. Use it
when you want the editor dark on an otherwise-light page.

The one thing scoped `dataTheme` does _not_ touch is the surrounding **document**
— `<html>`/`<body>`, native form controls, and your own app chrome keep their
own theme. If you want the whole page dark, set `data-theme` on the document root
instead (the snippet above); the editor inherits it automatically.

If you omit `dataTheme`, the editor inherits whatever `data-theme` an ancestor
declares (or the light default).

> **A `theme` value is theme-independent.** Inline `theme` variables are spread
> on the mount node and win over _both_ the light and the dark base for that
> token. So `theme={createApollonTheme({ background: "#fafafa" })}` pins that
> background in **both** light and dark — toggling `dataTheme` won't change it.
> That's correct for brand colors that read on either theme (e.g. `primary`); but
> if you override `background` / `foreground` / `surface`, provide a matching
> value per theme (swap the theme object when you toggle `dataTheme`), or drive
> dark from the document root and only override theme-independent accents.

## `createApollonTheme`

```ts
import { createApollonTheme, type ApollonTheme } from "@tumaet/apollon"

const theme: Record<`--apollon-${string}`, string> = createApollonTheme({
  primary: "#0f3a66",
  foreground: "#12161f",
  background: "#fafafa",
})
// → { "--apollon-primary": "#0f3a66", "--apollon-foreground": "#12161f", "--apollon-background": "#fafafa" }
```

`createApollonTheme(theme: ApollonTheme)` returns a framework-agnostic style
object of `--apollon-*` CSS custom properties. Only the keys you provide are
emitted — unset tokens keep the stylesheet's fallbacks. The result is a plain
object, so it composes with any styling layer:

```tsx no-check
// React inline style
<Apollon theme={createApollonTheme({ primary: "tomato" })} />
```

```ts no-check
// Imperative — set on the host element yourself
const vars = createApollonTheme({ primary: "tomato" })
for (const [key, value] of Object.entries(vars)) {
  element.style.setProperty(key, value)
}
new ApollonEditor(element)
```

## Host patterns

### External React embedders

Pass `theme` (and optionally `dataTheme`) to `<Apollon>`. Drive dark mode from
your app's own state:

```tsx
import { Apollon, createApollonTheme } from "@tumaet/apollon"

function EmbeddedEditor({ dark }: { dark: boolean }) {
  return (
    <Apollon
      style={{ height: "80vh" }}
      dataTheme={dark ? "dark" : undefined}
      theme={createApollonTheme({ primary: "#0f3a66" })}
    />
  )
}
```

The `theme` prop is spread **after** `style`, so a theme token always wins over
a same-named property you happen to set in `style`.

### VS Code webview

VS Code auto-applies `vscode-light` / `vscode-dark` / `vscode-high-contrast`
classes to `<body>`. Map those to `data-theme` so the editor follows live theme
switches with no JS — either with a tiny observer, or purely in CSS by scoping
the palette per class (what the bundled Apollon VS Code editor does):

```css
/* CSS-only: re-declare the dark palette under the vscode-dark body class */
body.vscode-dark,
body.vscode-high-contrast {
  --apollon-background: #181a18;
  --apollon-foreground: white;
  /* …the rest of the dark contract… */
}
```

```ts no-check
// or: mirror the body class onto data-theme once, then rely on the defaults
const sync = () => {
  const dark = document.body.classList.contains("vscode-dark")
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light")
}
new MutationObserver(sync).observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
})
sync()
```

### The Apollon webapp

The standalone webapp owns dark mode via its theme store, which toggles
`data-theme` + `color-scheme` on `document.documentElement`. The editor inherits
that automatically. The app additionally **bridges its accent to the editor
accent** in its own root scope only — `--apollon-primary: var(--home-accent-base)`
— so the embedded editor matches the app's brand. That bridge lives in the
webapp's CSS (never in the published library default), so external embeds keep
the neutral blue default unless they opt in.

## Backward compatibility

`theme` and `dataTheme` are both optional. Existing embeds that pass neither
keep working exactly as before: the stylesheet's per-property fallbacks
(`var(--apollon-primary, #3e8acc)`, etc.) and the `:root` / `:root[data-theme]`
blocks fully define the default light and dark looks.
