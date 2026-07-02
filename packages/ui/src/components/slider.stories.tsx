import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, within } from "storybook/test"

import { Slider } from "./slider"

/**
 * An input where the user selects a value from within a given range, built on
 * Base UI's `Slider`. Controlled via `value` / `onValueChange` (or uncontrolled
 * via `defaultValue`); pass an array of values to render a range with multiple
 * thumbs. Orientation, `min` / `max` / `step`, and `disabled` are all supported.
 */
const meta = {
  title: "UI/Components/Slider",
  component: Slider,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    defaultValue: [50],
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    onValueChange: fn(),
    "aria-label": "Value",
  },
  argTypes: {
    min: { control: "number", table: { category: "Range" } },
    max: { control: "number", table: { category: "Range" } },
    step: { control: "number", table: { category: "Range" } },
    disabled: { control: "boolean", table: { category: "State" } },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
      table: { category: "Appearance" },
    },
    onValueChange: {
      description: "Called with the next value as the thumb is dragged.",
      table: { category: "Events" },
    },
  },
  render: (args) => (
    <div className="w-64">
      <Slider {...args} />
    </div>
  ),
} satisfies Meta<typeof Slider>

export default meta

type Story = StoryObj<typeof meta>

/** A single-thumb slider at the midpoint. */
export const Default: Story = {}

/** Two thumbs define a range. */
export const Range: Story = {
  args: { defaultValue: [25, 75] },
}

/** A coarse `step` snaps the thumb to discrete stops. */
export const Stepped: Story = {
  args: { defaultValue: [40], step: 10 },
}

/** A disabled slider ignores user interaction. */
export const Disabled: Story = {
  args: { disabled: true },
}

/** Vertical orientation for use in tight, tall layouts. */
export const Vertical: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="h-48">
      <Slider defaultValue={[60]} orientation="vertical" aria-label="Value" />
    </div>
  ),
}

/** Pinned dark-theme review. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-64 flex-col gap-6">
      <Slider defaultValue={[50]} aria-label="Value" />
      <Slider defaultValue={[25, 75]} aria-label="Range" />
      <Slider defaultValue={[40]} disabled aria-label="Disabled" />
    </div>
  ),
}

/** Interaction test: focusing a thumb and pressing arrow keys moves the value. */
export const KeyboardInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { defaultValue: [50] },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const thumb = canvas.getByRole("slider", { name: /value/i })
    thumb.focus()
    await expect(thumb).toHaveFocus()
    await expect(thumb).toHaveAttribute("aria-valuenow", "50")
    thumb.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    )
    await expect(args.onValueChange).toHaveBeenCalled()
  },
}
