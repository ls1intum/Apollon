import type { Meta, StoryObj } from "@storybook/react-vite"

import { AspectRatio } from "./aspect-ratio"

/**
 * Constrains its children to a desired width-to-height `ratio`. A pure CSS
 * wrapper (no JS measurement): it sets `aspect-ratio` on a relatively
 * positioned box, so an absolutely positioned child (e.g. an `img` with
 * `inset-0 size-full object-cover`) fills the frame. Used for 16:10 diagram
 * thumbnails on the home screen.
 */
const meta = {
  title: "UI/Components/AspectRatio",
  component: AspectRatio,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    ratio: {
      control: { type: "number" },
      description: "Width divided by height, e.g. 16 / 10.",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <AspectRatio {...args} className="overflow-hidden rounded-lg bg-muted">
      {/* Self-contained inline SVG (no network request) so the story renders
          offline and never flakes the CI a11y/visual run on a dropped fetch. */}
      <img
        src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%230f3a66'/><stop offset='1' stop-color='%232e78b6'/></linearGradient></defs><rect width='100%25' height='100%25' fill='url(%23g)'/><text x='50%25' y='50%25' fill='%23ffffff' font-family='sans-serif' font-size='28' text-anchor='middle' dominant-baseline='middle'>16 : 9</text></svg>"
        alt="Placeholder"
        className="absolute inset-0 size-full object-cover"
      />
    </AspectRatio>
  ),
} satisfies Meta<typeof AspectRatio>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The 16:10 framing used for diagram thumbnails.
 */
export const Default: Story = {
  args: {
    ratio: 16 / 10,
  },
}

/**
 * A square (1:1) frame.
 */
export const Square: Story = {
  args: {
    ratio: 1,
  },
}

/**
 * A 16:9 widescreen frame.
 */
export const Widescreen: Story = {
  args: {
    ratio: 16 / 9,
  },
}
