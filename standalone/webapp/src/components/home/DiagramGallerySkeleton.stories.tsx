import type { Meta, StoryObj } from "@storybook/react-vite"
import { DiagramGallerySkeleton } from "./DiagramGallerySkeleton"

/**
 * The loading placeholder for the diagram dashboard: skeleton toolbar, filter
 * controls, and a grid of `count` card placeholders. Exposed as a status region
 * ("Loading diagrams") so assistive tech announces the loading state.
 */
const meta = {
  title: "Webapp/Home/DiagramGallerySkeleton",
  component: DiagramGallerySkeleton,
  parameters: { layout: "padded" },
  args: { count: 6 },
  argTypes: {
    count: {
      control: { type: "number", min: 0, max: 12 },
      table: { category: "Content" },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DiagramGallerySkeleton>

export default meta
type Story = StoryObj<typeof meta>

/** The default six-card skeleton. */
export const Default: Story = {}

/** A denser grid for wider dashboards. */
export const ManyCards: Story = {
  args: { count: 9 },
}

/** Toolbar-only skeleton with no card placeholders (empty grid). */
export const NoCards: Story = {
  args: { count: 0 },
}

/** Pinned dark to verify skeleton shimmer on dark card surfaces. */
export const Dark: Story = {
  globals: { theme: "dark" },
}
