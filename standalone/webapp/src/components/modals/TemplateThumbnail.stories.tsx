import type { Meta, StoryObj } from "@storybook/react-vite"
import { TemplateThumbnail } from "./TemplateThumbnail"

/**
 * The live preview of a design-pattern template inside the New Diagram dialog. It
 * lazily queues a heavy off-thread render of the named template (see
 * `templateThumbnails`) and shows the stacked light/dark `<img>` pair the home
 * cards use, swapped purely by the `:root[data-theme]` CSS rule — a spinner while
 * the render is in flight, a type glyph if it fails.
 *
 * Because that render path boots a live `ApollonEditor` (the library's second
 * React copy), these stories are visual only and tagged `!test`.
 */

const meta = {
  title: "Webapp/Modals/TemplateThumbnail",
  component: TemplateThumbnail,
  // Queues a live ApollonEditor template render — keep visual.
  tags: ["autodocs", "!test"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-64 rounded-xl border border-[var(--home-border-subtle)] bg-[var(--home-surface-raised)] p-2">
        <Story />
      </div>
    ),
  ],
  args: { name: "Adapter" },
  argTypes: {
    name: {
      control: "text",
      description: "The design-pattern template name to render a preview for.",
      table: { category: "Data" },
    },
  },
} satisfies Meta<typeof TemplateThumbnail>

export default meta
type Story = StoryObj<typeof meta>

/** A named GoF template preview (renders, then settles on the image or glyph). */
export const Default: Story = {}

/** Another template to confirm the lazy per-name render path. */
export const Bridge: Story = {
  args: { name: "Bridge" },
}

/** Pinned dark — the dark `<img>` variant is shown by the data-theme swap. */
export const Dark: Story = {
  globals: { theme: "dark" },
}
