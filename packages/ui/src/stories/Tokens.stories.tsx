import type { Meta, StoryObj } from "@storybook/react-vite"

/**
 * Live swatch grids for Apollon's design tokens. Every chip resolves its value
 * through the CSS custom property itself (`background: var(--token)`), so the
 * whole page re-themes when you flip the theme toolbar toggle (light / dark).
 *
 * The tokens come from `src/styles/tokens.css` and are grouped by their
 * `--home-*` semantic role (surfaces, text, borders, accent, badge/tag, banner,
 * toast) plus the theme-independent radius scale.
 */
const meta = {
  title: "UI/Tokens",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

type Token = { name: string; varName: string }

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

/** A swatch whose foreground color is the token (drawn as text + a bar). */
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

/** A pill rendered with a paired background + text token (badges / tags). */
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

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--home-text-primary)]">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {children}
      </div>
    </section>
  )
}

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

export const AllTokens: Story = {
  render: () => (
    <div className="flex flex-col gap-8 bg-[var(--home-surface-base)] p-8 text-[var(--home-text-primary)]">
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
    </div>
  ),
}
