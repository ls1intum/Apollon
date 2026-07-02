import type { Meta, StoryObj } from "@storybook/react-vite"

/**
 * Live swatch grids for Apollon's layered design tokens. Every chip resolves its
 * value through the CSS custom property itself (`background: var(--token)`), so
 * the whole page re-themes when you flip the theme toolbar toggle (light / dark).
 *
 * The tokens come from `src/styles/tokens.css`, which defines three layers:
 *
 *   1. `--apollon-*` — the LARGE public editor theming contract embedders override.
 *   2. `--primitive-*` — the literal brand/neutral palette every other token cites.
 *   3. `--home-*` — the webapp's app-level semantics, routed through `--apollon-*`.
 *
 * Each layer is its own story below. See the Theming page for how they cascade.
 */
const meta = {
  title: "UI/Tokens",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

type Token = { name: string; varName: string }

/** A swatch whose background fill is the token. */
function ColorSwatch({ name, varName }: Token) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full rounded-md ring-1 ring-[var(--home-border-default)]"
        style={{ background: `var(${varName})` }}
      />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-[var(--home-text-primary)]">
          {name}
        </span>
        <code className="text-[10px] text-[var(--home-text-muted)]">
          {varName}
        </code>
      </div>
    </div>
  )
}

/** A swatch whose foreground color is the token (drawn as text). */
function TextSwatch({ name, varName }: Token) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-[var(--home-surface-raised)] p-3 ring-1 ring-[var(--home-border-subtle)]">
      <span
        className="text-base font-semibold"
        style={{ color: `var(${varName})` }}
      >
        The quick brown fox
      </span>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-[var(--home-text-primary)]">
          {name}
        </span>
        <code className="text-[10px] text-[var(--home-text-muted)]">
          {varName}
        </code>
      </div>
    </div>
  )
}

/** A swatch showing a token used as a 2px border on a neutral surface. */
function BorderSwatch({ name, varName }: Token) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full rounded-md bg-[var(--home-surface-raised)]"
        style={{ border: `2px solid var(${varName})` }}
      />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-[var(--home-text-primary)]">
          {name}
        </span>
        <code className="text-[10px] text-[var(--home-text-muted)]">
          {varName}
        </code>
      </div>
    </div>
  )
}

/** A pill rendered with a paired background + text token (badges / tags / tones). */
function PairSwatch({
  name,
  bgVar,
  textVar,
}: {
  name: string
  bgVar: string
  textVar: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="inline-flex w-fit items-center rounded-md px-2.5 py-1 text-xs font-medium"
        style={{ background: `var(${bgVar})`, color: `var(${textVar})` }}
      >
        {name}
      </span>
      <code className="text-[10px] text-[var(--home-text-muted)]">
        {bgVar} / {textVar}
      </code>
    </div>
  )
}

/** A tile rounded by the token (radius scale). */
function RadiusSwatch({ name, varName }: Token) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full bg-[var(--home-accent-soft)] ring-1 ring-[var(--home-border-default)]"
        style={{ borderRadius: `var(${varName})` }}
      />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-[var(--home-text-primary)]">
          {name}
        </span>
        <code className="text-[10px] text-[var(--home-text-muted)]">
          {varName}
        </code>
      </div>
    </div>
  )
}

/** A raised plate carrying the token as its box-shadow (elevation scale). */
function ShadowSwatch({ name, varName }: Token) {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      <div
        className="h-14 w-full rounded-md bg-[var(--home-surface-raised)] ring-1 ring-[var(--home-border-subtle)]"
        style={{ boxShadow: `var(${varName})` }}
      />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-[var(--home-text-primary)]">
          {name}
        </span>
        <code className="text-[10px] text-[var(--home-text-muted)]">
          {varName}
        </code>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold text-[var(--home-text-primary)]">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-[var(--home-text-muted)]">{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {children}
      </div>
    </section>
  )
}

function Page({
  title,
  lede,
  children,
}: {
  title: string
  lede: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-8 bg-[var(--home-surface-base)] p-8 text-[var(--home-text-primary)]">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="max-w-3xl text-sm text-[var(--home-text-muted)]">
          {lede}
        </p>
      </header>
      {children}
    </div>
  )
}

/* ── Layer 2: --apollon-* — the public editor theming contract ─────────────── */

const APOLLON_PRIMARY: Token[] = [
  { name: "Primary", varName: "--apollon-primary" },
  { name: "Secondary", varName: "--apollon-secondary" },
  { name: "Background", varName: "--apollon-background" },
  { name: "Background Variant", varName: "--apollon-background-variant" },
  { name: "Gray", varName: "--apollon-gray" },
]

const APOLLON_SURFACE: Token[] = [
  { name: "Surface", varName: "--apollon-surface" },
  { name: "Surface Sunken", varName: "--apollon-surface-sunken" },
  { name: "Surface Hover", varName: "--apollon-surface-hover" },
]

const APOLLON_BORDER: Token[] = [
  { name: "Border", varName: "--apollon-border" },
  { name: "Border Subtle", varName: "--apollon-border-subtle" },
]

const APOLLON_RADIUS: Token[] = [
  { name: "sm", varName: "--apollon-radius-sm" },
  { name: "md (= radius)", varName: "--apollon-radius-md" },
  { name: "lg", varName: "--apollon-radius-lg" },
]

const APOLLON_CHROME: Token[] = [
  { name: "Chrome Surface", varName: "--apollon-chrome-surface" },
  { name: "Chrome Surface Hover", varName: "--apollon-chrome-surface-hover" },
  { name: "Chrome Surface Active", varName: "--apollon-chrome-surface-active" },
  { name: "Chrome Glass", varName: "--apollon-chrome-glass" },
  { name: "Chrome Accent", varName: "--apollon-chrome-accent" },
]

const APOLLON_SIGNALS: Token[] = [
  { name: "Interactive Selection", varName: "--apollon-interactive-selection" },
  { name: "Dropzone Accent", varName: "--apollon-dropzone-accent" },
  { name: "Dropzone Fill", varName: "--apollon-dropzone-accent-fill" },
  { name: "Guide Vertical", varName: "--apollon-guide-vertical" },
  { name: "Guide Horizontal", varName: "--apollon-guide-horizontal" },
  { name: "Grid", varName: "--apollon-grid" },
]

const APOLLON_SWATCHES: Token[] = [
  { name: "Slate", varName: "--apollon-swatch-slate" },
  { name: "Red", varName: "--apollon-swatch-red" },
  { name: "Orange", varName: "--apollon-swatch-orange" },
  { name: "Amber", varName: "--apollon-swatch-amber" },
  { name: "Green", varName: "--apollon-swatch-green" },
  { name: "Teal", varName: "--apollon-swatch-teal" },
  { name: "Blue", varName: "--apollon-swatch-blue" },
  { name: "Violet", varName: "--apollon-swatch-violet" },
  { name: "Pink", varName: "--apollon-swatch-pink" },
]

const APOLLON_COLLAB: Token[] = Array.from({ length: 8 }, (_, i) => ({
  name: `Slot ${i + 1}`,
  varName: `--apollon-collaboration-color-${i + 1}`,
}))

const APOLLON_ASSESSMENT: {
  name: string
  bgVar: string
  textVar: string
}[] = [
  {
    name: "Positive",
    bgVar: "--apollon-assessment-positive-bg",
    textVar: "--apollon-assessment-positive-text",
  },
  {
    name: "Negative",
    bgVar: "--apollon-assessment-negative-bg",
    textVar: "--apollon-assessment-negative-text",
  },
  {
    name: "Zero",
    bgVar: "--apollon-assessment-zero-bg",
    textVar: "--apollon-assessment-zero-text",
  },
  {
    name: "Ungraded",
    bgVar: "--apollon-assessment-ungraded-bg",
    textVar: "--apollon-assessment-ungraded-text",
  },
]

export const ApollonContract: Story = {
  name: "Public contract (--apollon-*)",
  render: () => (
    <Page
      title="--apollon-* — the public editor theming contract"
      lede="The large, stable surface embedders of @tumaet/apollon override (typed via createApollonTheme, plus CSS-only hooks). It references --primitive-* only, never --home-*, so an external host themes the editor without depending on app semantics. This is a representative slice — see library/THEMING.md for the full contract."
    >
      <Section title="Primary & background">
        {APOLLON_PRIMARY.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Surfaces">
        {APOLLON_SURFACE.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Borders">
        {APOLLON_BORDER.map((t) => (
          <BorderSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section
        title="Radius & elevation"
        description="--apollon-radius-md routes through the base --apollon-radius; --apollon-shadow lifts floating surfaces."
      >
        {APOLLON_RADIUS.map((t) => (
          <RadiusSwatch key={t.varName} {...t} />
        ))}
        <ShadowSwatch name="Shadow" varName="--apollon-shadow" />
      </Section>

      <Section
        title="Status colors"
        description="Warning (yellow, internal) and the typed danger text color."
      >
        <ColorSwatch
          name="Warning Yellow"
          varName="--apollon-alert-warning-yellow"
        />
        <ColorSwatch name="Danger" varName="--apollon-danger" />
      </Section>

      <Section
        title="Editor chrome (--apollon-chrome-*)"
        description="The floating-UI system: surface ramp, glass, accent. Mostly color-mix-derived from --apollon-background + --apollon-foreground — only the tunable subset is shown."
      >
        {APOLLON_CHROME.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Selection & guide signals">
        {APOLLON_SIGNALS.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section
        title="Assessment tones"
        description="Score-pill background + text pairs (the AssessmentIcon and popover pill share these)."
      >
        {APOLLON_ASSESSMENT.map((t) => (
          <PairSwatch key={t.bgVar} {...t} />
        ))}
      </Section>

      <Section
        title="Color-picker swatch palette (--apollon-swatch-*)"
        description="The fixed, accessibility-tuned fill palette the editor color-picker reads."
      >
        {APOLLON_SWATCHES.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section
        title="Collaboration cursor palette (--apollon-collaboration-color-*)"
        description="Eight deterministic slots assigned per remote participant by name hash."
      >
        {APOLLON_COLLAB.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>
    </Page>
  ),
}

/* ── Layer 1: --primitive-* — the literal palette ──────────────────────────── */

const PRIMITIVE_BRAND: Token[] = [
  { name: "White", varName: "--primitive-white" },
  { name: "Black", varName: "--primitive-black" },
  { name: "Blue 500", varName: "--primitive-blue-500" },
  { name: "Slate 500", varName: "--primitive-slate-500" },
]

const PRIMITIVE_SURFACE: Token[] = [
  { name: "Surface Raised", varName: "--primitive-surface-raised" },
  { name: "Surface Raised Hover", varName: "--primitive-surface-raised-hover" },
  { name: "Surface Sunken", varName: "--primitive-surface-sunken" },
  {
    name: "Surface Raised Active",
    varName: "--primitive-surface-raised-active",
  },
]

const PRIMITIVE_TEXT: Token[] = [
  { name: "Text Primary", varName: "--primitive-text-primary" },
  { name: "Text Secondary", varName: "--primitive-text-secondary" },
  { name: "Text Muted", varName: "--primitive-text-muted" },
]

const PRIMITIVE_BORDER: Token[] = [
  { name: "Border Default", varName: "--primitive-border-default" },
  { name: "Border Strong", varName: "--primitive-border-strong" },
  { name: "Border Subtle", varName: "--primitive-border-subtle" },
]

const PRIMITIVE_ACCENT: Token[] = [
  { name: "Accent Base", varName: "--primitive-accent-base" },
  { name: "Accent Soft", varName: "--primitive-accent-soft" },
  { name: "Accent Strong", varName: "--primitive-accent-strong" },
  { name: "Accent Contrast", varName: "--primitive-accent-contrast" },
]

export const Primitives: Story = {
  name: "Palette (--primitive-*)",
  render: () => (
    <Page
      title="--primitive-* — the literal brand/neutral palette"
      lede="The only layer where literal #hex / rgb() values live. Both higher layers reference these by var(), so a primitive's light/dark pair re-resolves everywhere it is cited. A representative slice of the full palette."
    >
      <Section title="Brand & neutral">
        {PRIMITIVE_BRAND.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Surfaces">
        {PRIMITIVE_SURFACE.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Text">
        {PRIMITIVE_TEXT.map((t) => (
          <TextSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Borders">
        {PRIMITIVE_BORDER.map((t) => (
          <BorderSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Accent">
        {PRIMITIVE_ACCENT.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>
    </Page>
  ),
}

/* ── Layer 3: --home-* — the webapp app semantics ──────────────────────────── */

const SURFACES: Token[] = [
  { name: "Base", varName: "--home-surface-base" },
  { name: "Sunken", varName: "--home-surface-sunken" },
  { name: "Raised", varName: "--home-surface-raised" },
  { name: "Raised Hover", varName: "--home-surface-raised-hover" },
  { name: "Raised Active", varName: "--home-surface-raised-active" },
  { name: "Row Alt", varName: "--home-surface-row-alt" },
]

const TEXT: Token[] = [
  { name: "Primary", varName: "--home-text-primary" },
  { name: "Secondary", varName: "--home-text-secondary" },
  { name: "Strong", varName: "--home-text-strong" },
  { name: "Muted", varName: "--home-text-muted" },
]

const BORDERS: Token[] = [
  { name: "Default", varName: "--home-border-default" },
  { name: "Strong", varName: "--home-border-strong" },
  { name: "Subtle", varName: "--home-border-subtle" },
]

const ACCENT: Token[] = [
  { name: "Base", varName: "--home-accent-base" },
  { name: "Soft", varName: "--home-accent-soft" },
  { name: "Strong", varName: "--home-accent-strong" },
  { name: "Ring", varName: "--home-accent-ring" },
  { name: "Contrast", varName: "--home-accent-contrast" },
]

const BANNER: Token[] = [
  { name: "Background", varName: "--home-banner-warning-bg" },
  { name: "Border", varName: "--home-banner-warning-border" },
  { name: "Icon", varName: "--home-banner-warning-icon" },
  { name: "Button Bg", varName: "--home-banner-warning-btn-bg" },
  { name: "Button Hover", varName: "--home-banner-warning-btn-hover" },
]

const TOAST: Token[] = [
  { name: "Success", varName: "--home-toast-success" },
  { name: "Error", varName: "--home-toast-error" },
  { name: "Warning", varName: "--home-toast-warning" },
  { name: "Info", varName: "--home-toast-info" },
]

const RADIUS: Token[] = [
  { name: "sm", varName: "--home-radius-sm" },
  { name: "md", varName: "--home-radius-md" },
  { name: "lg", varName: "--home-radius-lg" },
  { name: "xl", varName: "--home-radius-xl" },
]

export const AppSemantics: Story = {
  name: "App semantics (--home-*)",
  render: () => (
    <Page
      title="--home-* — the webapp app semantics"
      lede="The standalone webapp's semantic tokens, routed through --apollon-* and the primitives. Re-theming the --apollon-* layer flows through to these automatically; the Tailwind bridge in theme.css maps them onto --color-*/--radius-* so utilities like bg-card resolve here."
    >
      <Section title="Surfaces">
        {SURFACES.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Text">
        {TEXT.map((t) => (
          <TextSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Borders">
        {BORDERS.map((t) => (
          <BorderSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Accent">
        {ACCENT.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Badge & Tags">
        <PairSwatch
          name="Badge"
          bgVar="--home-badge-bg"
          textVar="--home-text-on-badge"
        />
        <PairSwatch
          name="Type"
          bgVar="--home-tag-type-bg"
          textVar="--home-tag-type-text"
        />
        <PairSwatch
          name="Local"
          bgVar="--home-tag-local-bg"
          textVar="--home-tag-local-text"
        />
        <PairSwatch
          name="Shared"
          bgVar="--home-tag-shared-bg"
          textVar="--home-tag-shared-text"
        />
      </Section>

      <Section title="Warning Banner">
        {BANNER.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Toast Accents">
        {TOAST.map((t) => (
          <ColorSwatch key={t.varName} {...t} />
        ))}
      </Section>

      <Section title="Radius">
        {RADIUS.map((t) => (
          <RadiusSwatch key={t.varName} {...t} />
        ))}
      </Section>
    </Page>
  ),
}
