import type { ApollonTheme } from "@tumaet/apollon"

// The playground's theming catalog — only tokens the editor actually paints,
// tiered by how often a consumer needs them and whether their effect is visible
// on a default diagram:
//
//   • essential — rebrand any diagram at a glance (primary, background, radius…).
//   • advanced  — surfaces / borders / shape scale, visible in menus & popovers.
//   • feature   — only visible when a specific mode is active (Assessment,
//                 collaboration, highlight, the color picker). These groups carry
//                 a `reveal` context so the panel can switch the editor into the
//                 state where the token is observable, or a `note` when it can't.
//
// Excluded: knobs that only duplicate another token — `radius-md` (= `radius`),
// `dropzone-accent-fill` (= 40% of `dropzone-accent`), `chrome-accent` (= `primary`).

export type ThemeTokenType = "color" | "length" | "shadow"
export type ThemeTier = "essential" | "advanced" | "feature"
export type RevealContext = "assessment" | "collaboration" | "highlight"

export interface ThemeToken {
  /** The public CSS custom property this control drives. */
  cssVar: `--apollon-${string}`
  label: string
  /** Control kind: color swatch, px slider, or free-text (shadow). */
  type: ThemeTokenType
  /** Built-in light default (from tokens.css), shown until overridden. */
  default: string
  /** Typed `ApollonTheme` field this maps to, when part of the typed API. */
  field?: keyof ApollonTheme
  /** For `length` sliders: bounds/step in px. */
  min?: number
  max?: number
  step?: number
  /** One-line hint surfaced under the control. */
  hint?: string
}

export interface ThemeGroup {
  id: string
  label: string
  tier: ThemeTier
  /** Short blurb shown at the top of the group. */
  blurb: string
  /** For `feature` groups: the editor state that makes these tokens visible. */
  reveal?: RevealContext
  /** For groups whose context can't be auto-driven: how to see the effect. */
  note?: string
  tokens: ThemeToken[]
}

const RADIUS = { type: "length", min: 0, max: 24, step: 1 } as const
const SPACE = { type: "length", min: 0, max: 40, step: 1 } as const

export const THEME_GROUPS: ThemeGroup[] = [
  {
    id: "essentials",
    label: "Essentials",
    tier: "essential",
    blurb: "The handful of tokens that rebrand any diagram at a glance.",
    tokens: [
      {
        cssVar: "--apollon-primary",
        label: "Primary",
        type: "color",
        default: "#2e78b6",
        field: "primary",
        hint: "Accent / brand color (selection, links, handles).",
      },
      {
        cssVar: "--apollon-primary-foreground",
        label: "Primary foreground",
        type: "color",
        default: "#ffffff",
        field: "primaryForeground",
        hint: "Ink on Primary. Set a dark value if Primary is light.",
      },
      {
        cssVar: "--apollon-foreground",
        label: "Foreground",
        type: "color",
        default: "#12161f",
        field: "foreground",
        hint: "Text/ink on the background. Keep AA against Background.",
      },
      {
        cssVar: "--apollon-background",
        label: "Background",
        type: "color",
        default: "#ffffff",
        field: "background",
        hint: "Canvas background. The chrome derives its palette from this.",
      },
      {
        cssVar: "--apollon-secondary",
        label: "Secondary",
        type: "color",
        default: "#6c757d",
        field: "secondary",
        hint: "Muted / secondary accent.",
      },
      {
        cssVar: "--apollon-radius",
        label: "Radius",
        default: "6px",
        field: "radius",
        hint: "Base corner radius for nodes and controls.",
        ...RADIUS,
      },
      {
        cssVar: "--apollon-grid",
        label: "Grid",
        type: "color",
        default: "rgba(36, 39, 36, 0.1)",
        field: "grid",
        hint: "Canvas grid lines (translucent by default).",
      },
    ],
  },
  {
    id: "surfaces",
    label: "Surfaces & borders",
    tier: "advanced",
    blurb: "Raised/sunken surfaces and dividers — seen in menus and popovers.",
    tokens: [
      {
        cssVar: "--apollon-background-variant",
        label: "Background variant",
        type: "color",
        default: "#f8f9fa",
        field: "backgroundVariant",
        hint: "Slightly raised surface variant.",
      },
      {
        cssVar: "--apollon-surface",
        label: "Surface",
        type: "color",
        default: "#ffffff",
        field: "surface",
        hint: "Raised card / popover / menu surface.",
      },
      {
        cssVar: "--apollon-surface-sunken",
        label: "Surface sunken",
        type: "color",
        default: "#eef2f6",
        field: "surfaceSunken",
        hint: "Sunken / recessed surface.",
      },
      {
        cssVar: "--apollon-border",
        label: "Border",
        type: "color",
        default: "#cdd5df",
        field: "border",
        hint: "Default border / divider color.",
      },
      {
        cssVar: "--apollon-border-subtle",
        label: "Border subtle",
        type: "color",
        default: "#e3e8ef",
        field: "borderSubtle",
        hint: "Subtle border / divider color.",
      },
      {
        cssVar: "--apollon-gray",
        label: "Gray",
        type: "color",
        default: "#e9ecef",
        field: "gray",
        hint: "Neutral gray surface.",
      },
      {
        cssVar: "--apollon-gray-variant",
        label: "Gray variant",
        type: "color",
        default: "#495057",
        field: "grayVariant",
        hint: "Stronger gray (borders / dividers).",
      },
    ],
  },
  {
    id: "shape",
    label: "Shape & elevation",
    tier: "advanced",
    blurb: "The corner-radius scale and the floating-surface drop shadow.",
    tokens: [
      {
        cssVar: "--apollon-radius-sm",
        label: "Radius sm",
        default: "4px",
        hint: "Hover/selection rings, chips, pills.",
        ...RADIUS,
      },
      {
        cssVar: "--apollon-radius-lg",
        label: "Radius lg",
        default: "8px",
        hint: "Panels, popovers, menus.",
        ...RADIUS,
      },
      {
        cssVar: "--apollon-shadow",
        label: "Shadow",
        type: "shadow",
        default: "0 4px 12px rgba(0, 0, 0, 0.18)",
        hint: "Drop shadow for floating surfaces (menus, popovers).",
      },
    ],
  },
  {
    id: "guides",
    label: "Guides & feedback",
    tier: "advanced",
    note: "Alignment guides appear while dragging a node; the error color shows on validation messages.",
    blurb: "Alignment guides and the error text color.",
    tokens: [
      {
        cssVar: "--apollon-guide-vertical",
        label: "Guide vertical",
        type: "color",
        default: "#d63031",
        field: "guideVertical",
      },
      {
        cssVar: "--apollon-guide-horizontal",
        label: "Guide horizontal",
        type: "color",
        default: "#0984e3",
        field: "guideHorizontal",
      },
      {
        cssVar: "--apollon-danger",
        label: "Error text",
        type: "color",
        default: "#721c24",
        field: "danger",
      },
    ],
  },
  {
    id: "assessment",
    label: "Assessment",
    tier: "feature",
    reveal: "assessment",
    blurb: "Score-badge tone pairs — text on its matching soft tint.",
    tokens: [
      {
        cssVar: "--apollon-assessment-positive-text",
        label: "Positive text",
        type: "color",
        default: "#166534",
      },
      {
        cssVar: "--apollon-assessment-positive-bg",
        label: "Positive bg",
        type: "color",
        default: "#dcfce7",
      },
      {
        cssVar: "--apollon-assessment-negative-text",
        label: "Negative text",
        type: "color",
        default: "#991b1b",
      },
      {
        cssVar: "--apollon-assessment-negative-bg",
        label: "Negative bg",
        type: "color",
        default: "#fee2e2",
      },
      {
        cssVar: "--apollon-assessment-zero-text",
        label: "Zero text",
        type: "color",
        default: "#1e40af",
      },
      {
        cssVar: "--apollon-assessment-zero-bg",
        label: "Zero bg",
        type: "color",
        default: "#dbeafe",
      },
      {
        cssVar: "--apollon-assessment-ungraded-text",
        label: "Ungraded text",
        type: "color",
        default: "#475569",
      },
      {
        cssVar: "--apollon-assessment-ungraded-bg",
        label: "Ungraded bg",
        type: "color",
        default: "#f1f5f9",
      },
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    tier: "feature",
    reveal: "collaboration",
    blurb: "The eight remote-cursor palette slots and the on-cursor ink.",
    tokens: [
      {
        cssVar: "--apollon-collaboration-color-1",
        label: "Slot 1",
        type: "color",
        default: "#ffb61e",
      },
      {
        cssVar: "--apollon-collaboration-color-2",
        label: "Slot 2",
        type: "color",
        default: "#37b24d",
      },
      {
        cssVar: "--apollon-collaboration-color-3",
        label: "Slot 3",
        type: "color",
        default: "#1c7ed6",
      },
      {
        cssVar: "--apollon-collaboration-color-4",
        label: "Slot 4",
        type: "color",
        default: "#f03e3e",
      },
      {
        cssVar: "--apollon-collaboration-color-5",
        label: "Slot 5",
        type: "color",
        default: "#ae3ec9",
      },
      {
        cssVar: "--apollon-collaboration-color-6",
        label: "Slot 6",
        type: "color",
        default: "#0ca678",
      },
      {
        cssVar: "--apollon-collaboration-color-7",
        label: "Slot 7",
        type: "color",
        default: "#f76707",
      },
      {
        cssVar: "--apollon-collaboration-color-8",
        label: "Slot 8",
        type: "color",
        default: "#1098ad",
      },
      {
        cssVar: "--apollon-on-collaboration-cursor",
        label: "On-cursor ink",
        type: "color",
        default: "#ffffff",
        hint: "Text/stroke drawn on a collaborator's colored cursor.",
      },
    ],
  },
  {
    id: "highlight",
    label: "Highlight",
    tier: "feature",
    reveal: "highlight",
    blurb: "Accents for interactive (quiz-pickable) elements and drop targets.",
    tokens: [
      {
        cssVar: "--apollon-interactive-selection",
        label: "Interactive selection",
        type: "color",
        default: "#f39c12",
        hint: "Ring/fill marking interactive (quiz-pickable) elements.",
      },
      {
        cssVar: "--apollon-dropzone-accent",
        label: "Dropzone accent",
        type: "color",
        default: "#0064ff",
        hint: "Ring/stroke on an assessment drop target on hover.",
      },
    ],
  },
  {
    id: "swatches",
    label: "Color picker",
    tier: "feature",
    note: "Select an element and open its fill color picker to see these swatches.",
    blurb: "The color picker's fixed nine-hue fill palette.",
    tokens: [
      {
        cssVar: "--apollon-swatch-slate",
        label: "Slate",
        type: "color",
        default: "#64748b",
      },
      {
        cssVar: "--apollon-swatch-red",
        label: "Red",
        type: "color",
        default: "#dc2626",
      },
      {
        cssVar: "--apollon-swatch-orange",
        label: "Orange",
        type: "color",
        default: "#ea580c",
      },
      {
        cssVar: "--apollon-swatch-amber",
        label: "Amber",
        type: "color",
        default: "#d97706",
      },
      {
        cssVar: "--apollon-swatch-green",
        label: "Green",
        type: "color",
        default: "#16a34a",
      },
      {
        cssVar: "--apollon-swatch-teal",
        label: "Teal",
        type: "color",
        default: "#0d9488",
      },
      {
        cssVar: "--apollon-swatch-blue",
        label: "Blue",
        type: "color",
        default: "#2563eb",
      },
      {
        cssVar: "--apollon-swatch-violet",
        label: "Violet",
        type: "color",
        default: "#7c3aed",
      },
      {
        cssVar: "--apollon-swatch-pink",
        label: "Pink",
        type: "color",
        default: "#db2777",
      },
    ],
  },
  {
    id: "chrome",
    label: "Chrome layout",
    tier: "advanced",
    blurb:
      "The floating chrome's radii and spacing. Its colors derive from Background + Foreground.",
    tokens: [
      {
        cssVar: "--apollon-chrome-radius-sm",
        label: "Chrome radius sm",
        default: "6px",
        hint: "Pill / small-control corner radius.",
        ...RADIUS,
      },
      {
        cssVar: "--apollon-chrome-radius-md",
        label: "Chrome radius md",
        default: "8px",
        hint: "Control corner radius.",
        ...RADIUS,
      },
      {
        cssVar: "--apollon-chrome-radius-lg",
        label: "Chrome radius lg",
        default: "12px",
        hint: "Panel / rail corner radius.",
        ...RADIUS,
      },
      {
        cssVar: "--apollon-chrome-edge",
        label: "Chrome edge",
        default: "10px",
        hint: "Margin from the canvas edge for every cluster.",
        ...SPACE,
      },
      {
        cssVar: "--apollon-chrome-gap",
        label: "Chrome gap",
        default: "8px",
        hint: "Gap between adjacent clusters.",
        ...SPACE,
      },
    ],
  },
]

/** Flat view of every token across all groups. */
export const THEME_TOKENS: ThemeToken[] = THEME_GROUPS.flatMap((g) => g.tokens)
