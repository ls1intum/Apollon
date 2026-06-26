import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { AspectRatio } from "./aspect-ratio"

/**
 * Self-contained inline SVG (no network request) so the stories render offline
 * and never flake the CI a11y/visual run on a dropped fetch. The `label` is
 * baked into the artwork so each frame in the matrix is identifiable.
 */
function placeholderSrc(label: string): string {
  return (
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='%230f3a66'/><stop offset='1' stop-color='%232e78b6'/>" +
    "</linearGradient></defs>" +
    "<rect width='100%25' height='100%25' fill='url(%23g)'/>" +
    "<text x='50%25' y='50%25' fill='%23ffffff' font-family='sans-serif' font-size='28' " +
    "text-anchor='middle' dominant-baseline='middle'>" +
    label +
    "</text></svg>"
  )
}

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
      table: { category: "Appearance" },
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
        src={placeholderSrc("16 : 9")}
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

/** The common framings — 1:1, 4:3, 16:9, 16:10 — side by side for comparison. */
export const RatioMatrix: Story = {
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  // The grid renders its own ratios; this only satisfies the required prop type.
  args: { ratio: 1 },
  render: () => {
    const ratios = [
      { label: "1 : 1", ratio: 1 / 1 },
      { label: "4 : 3", ratio: 4 / 3 },
      { label: "16 : 9", ratio: 16 / 9 },
      { label: "16 : 10", ratio: 16 / 10 },
    ]
    return (
      <div className="flex w-max items-start gap-4">
        {ratios.map(({ label, ratio }) => (
          <div key={label} className="flex w-32 flex-col gap-1.5">
            <AspectRatio
              ratio={ratio}
              className="overflow-hidden rounded-lg bg-muted"
            >
              <img
                src={placeholderSrc(label)}
                alt={`${label} frame`}
                className="absolute inset-0 size-full object-cover"
              />
            </AspectRatio>
            <span className="text-center text-muted-foreground text-xs">
              {label}
            </span>
          </div>
        ))}
      </div>
    )
  },
}

/** Parses a computed `aspect-ratio` string (`"W / H"` or a bare number). */
function parseAspectRatio(value: string): number {
  if (value.includes("/")) {
    const [w, h] = value.split("/").map((n) => Number.parseFloat(n.trim()))
    return w / h
  }
  return Number.parseFloat(value)
}

/**
 * Interaction test: the wrapper's computed `aspect-ratio` style must equal the
 * `ratio` prop, proving the CSS-only sizing is wired through.
 */
export const ComputedRatio: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: {
    ratio: 16 / 9,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const image = canvas.getByRole("img")
    const wrapper = image.closest(
      '[data-slot="aspect-ratio"]'
    ) as HTMLElement | null
    await expect(wrapper).not.toBeNull()
    const computed = getComputedStyle(wrapper as HTMLElement).aspectRatio
    await expect(parseAspectRatio(computed)).toBeCloseTo(args.ratio, 2)
  },
}
