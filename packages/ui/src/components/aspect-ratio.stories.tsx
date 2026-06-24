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
      <img
        src="https://images.unsplash.com/photo-1576075796033-848c2a5f3696?w=800&dpr=2&q=80"
        alt="Abstract architecture"
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

/**
 * The thumbnail frame reviewed in dark mode.
 */
export const Dark: Story = {
  args: {
    ratio: 16 / 10,
  },
  globals: {
    theme: "dark",
  },
}
