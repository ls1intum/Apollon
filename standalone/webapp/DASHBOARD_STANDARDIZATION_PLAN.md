# Dashboard Standardization Plan

Safety checkpoint branch: `checkpoint/dashboard-wip-2026-05-31`
(working-tree changes are NOT frozen by the branch — review diffs as we go)

## Goals (locked decisions)

- Full standardization of the **dashboard view** (the `hasDiagrams` branch): color
  tokens, spacing scale, typography scale.
- Token naming restructured to **`category-role-variant`**.
- Add **`--home-on-accent-*`** tokens for translucent-white surfaces sitting on the
  accent banner / dark navbar.
- Remove **dead tokens** (defined but never used in TSX).
- **Dedupe the logo** asset (delete `Apollon Logo V1.svg`, import kebab-case).
- **Landing-page code left as-is** this pass (it will inherit renamed tokens but its
  layout/logic is not refactored).

---

## 1. Token renaming map (category-role-variant)

Defined in `src/webapp.css` (`:root` + `:root[data-theme="dark"]`) and
`src/constants/themings.json` (`light` + `dark`). Both files must stay in sync.

### Surfaces
| Old | New |
|-----|-----|
| `--home-bg-primary` | `--home-surface-base` |
| `--home-bg-secondary` | `--home-surface-sunken` |
| `--home-bg-card` | `--home-surface-panel` |
| `--home-surface-strong` | `--home-surface-raised` |
| `--home-surface-strong-hover` | `--home-surface-raised-hover` |
| `--home-table-header-bg` | `--home-surface-row-alt` |

### Text
| Old | New |
|-----|-----|
| `--home-text-primary` | `--home-text-primary` (keep) |
| `--home-text-secondary` | `--home-text-secondary` (keep) |
| `--home-title-strong` | `--home-text-strong` |
| `--home-icon-muted` | `--home-text-muted` |
| `--home-meta-primary` | `--home-text-muted` (fold — same value/role) |
| `--home-badge-text` | `--home-text-on-badge` |

### Borders / dividers
| Old | New |
|-----|-----|
| `--home-border-color` | `--home-border-default` |
| `--home-divider-strong` | `--home-border-strong` |
| `--home-divider-subtle` | `--home-border-subtle` |

### Accent
| Old | New |
|-----|-----|
| `--home-accent-color` | `--home-accent-base` |
| `--home-accent-soft` | `--home-accent-soft` (keep) |
| `--home-interactive-strong` | `--home-accent-strong` |
| `--home-focus-ring` | `--home-accent-ring` |
| `--home-hover-overlay-bg` | `--home-accent-base` (fold — same value) |
| `--home-hover-overlay-text` | `--home-accent-contrast` |

### On-accent (NEW — for banner/navbar white-alpha)
| New token | Light/Dark intent |
|-----------|-------------------|
| `--home-on-accent-bg` | translucent white, idle |
| `--home-on-accent-bg-hover` | translucent white, hover |
| `--home-on-accent-border` | translucent white border |
| `--home-on-accent-text` | text/icon on accent (white) |

### Badge / status / misc (kept, used)
- `--home-badge-bg` -> `--home-badge-bg` (keep)
- `--home-file-fold-color` -> `--home-badge-fold` (used only by FileDocumentIcon)
- `--home-favorite-star` -> keep (used)
- `--home-glow-neutral` -> keep (used by highlight pulse)
- `--home-shadow-card-hover`, `--home-shadow-overlay` -> keep (used)
- `--home-surface-soft-hover-alt` -> `--home-surface-raised-active` (1 use, gallery empty CTA)

### DEAD — delete from css + json
- `--home-chip-bg`, `--home-chip-text`, `--home-chip-active-bg`, `--home-chip-active-text`
- `--home-favorite-bg`, `--home-favorite-border`
- `--home-glow-favorite`, `--home-glow-favorite-strong`
- `--home-surface-soft`, `--home-surface-soft-hover`
- `--home-meta-secondary`
- `--home-document-fold`
- `--home-brand-accent`

> Note: `--apollon-*` tokens (guide, alert-danger, background, etc.) are the editor's
> own system — out of scope, left untouched.

---

## 2. Spacing scale

Card layout in `DiagramCard.tsx` uses a `--card-scale` multiplier with raw px
(`scalePx(54)`, `scalePx(16)`, etc.). Keep the scale mechanism (it's intentional
responsive sizing) but document the base step values as named constants at top of file
so the magic numbers read as a scale:

```
CARD_PAD_X = 16, CARD_PAD_TOP = 54, CARD_ICON_H = 138, GAP = 8, DIVIDER_PAD = 16,
META_PAD = 14, BADGE_PAD = ...
```

Elsewhere prefer Tailwind spacing utilities (`gap-2`, `px-3`, `py-2`) which are already
mostly consistent — audit for stray `text-[12px]`-style arbitrary values.

---

## 3. Typography scale

Unify the scattered sizes (`13px`, `12px`, `11px`, `10.5px`, `10px`, `text-xs`) into a
small documented scale. Proposal:

| Name | Size | Use |
|------|------|-----|
| title | 13px / `text-[13px]` | card title |
| body | 12px / `text-xs` | controls, search |
| meta | 11px | "Modified ..." |
| caption | 10px | "Created ...", badges |

Apply via Tailwind arbitrary values or 2-3 small `.home-type-*` utility classes in
`webapp.css`. Replace inline `fontSize` in `DiagramCard.tsx` with these.

---

## 4. Banner / navbar buttons

- `HomePage.tsx` banner buttons (lines ~399-445): replace raw
  `rgba(255,255,255,...)` + inline `onMouseEnter/Leave` with `--home-on-accent-*`
  tokens and CSS `:hover` (new `.home-on-accent-btn` class).
- `HomeNavbar.tsx` quick-actions trigger (lines ~88-93): same tokens.

---

## 5. Logo dedupe

- Delete `assets/images/Apollon Logo V1.svg` (byte-identical duplicate).
- `BrandAndVersion.tsx`: change import to `assets/images/apollon-logo-v1.svg`.

---

## 6. Execution order (each step independently reviewable)

1. Rewrite token definitions in `webapp.css` + `themings.json` (rename + add on-accent
   + drop dead). Keep both files identical key-sets.
2. Mechanical rename across consuming TSX/CSS (old token -> new token).
3. Banner/navbar on-accent refactor.
4. DiagramCard typography + spacing constants.
5. Logo dedupe.
6. `npm run lint` + `prettier --write` + build to verify; manual smoke of dashboard
   light/dark.

> Hardcoded `DARK_THUMBNAIL_STROKE/FILL` in DiagramCard are SVG-pixel recolor logic,
> not theme chrome — left as-is (flagged, not changed).
