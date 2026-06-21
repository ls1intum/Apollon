import type { Meta, StoryObj } from "@storybook/react-vite"
import { DarkNavbarSurface } from "../../stories/_support/webapp"
import { VersionThumbnail } from "./VersionThumbnail"

/**
 * The per-version SVG thumbnail. When the row scrolls into view it lazily fetches
 * the snapshot body from the version repository and renders it client-side via
 * `ApollonEditor.exportModelAsSvg`, stamping the result into an `<img>` on a fixed
 * white plate.
 *
 * Storybook has no version backend, so the fetch fails and the component settles
 * on its kind-glyph fallback (bookmark for named, history for auto) — that
 * fallback IS one of the real states worth reviewing. Because the render path
 * boots a live `ApollonEditor` (the library's second React copy), these stories
 * are visual only and tagged `!test`.
 */

const meta = {
  title: "Webapp/Versioning/VersionThumbnail",
  component: VersionThumbnail,
  // Spins up a live ApollonEditor renderer / version backend — keep visual.
  tags: ["autodocs", "!test"],
  parameters: { layout: "centered" },
  decorators: [DarkNavbarSurface],
  args: {
    diagramId: "diagram-versions",
    versionId: "v5",
    compact: true,
    isAuto: false,
  },
  argTypes: {
    diagramId: { control: false, table: { category: "Data" } },
    versionId: { control: false, table: { category: "Data" } },
    compact: {
      control: "boolean",
      description: "Small list-row size (64x40) vs the compare-banner size.",
      table: { category: "Layout" },
    },
    isAuto: {
      control: "boolean",
      description: "Auto-save styling + history glyph fallback (vs bookmark).",
      table: { category: "Appearance" },
    },
  },
} satisfies Meta<typeof VersionThumbnail>

export default meta
type Story = StoryObj<typeof meta>

/** The compact list-row thumbnail for a named version. */
export const Compact: Story = {}

/** The larger compare-banner size. */
export const Banner: Story = {
  args: { compact: false },
}

/** Auto-save variant — muted colour and history-glyph fallback. */
export const Autosave: Story = {
  args: { isAuto: true },
}

/** Pinned dark to confirm the white plate stays legible on dark chrome. */
export const Dark: Story = {
  globals: { theme: "dark" },
}
