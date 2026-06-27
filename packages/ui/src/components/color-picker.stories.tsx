import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { ColorPicker, SWATCH_TOKENS } from "./color-picker"

/**
 * A compact color picker composed from `@tumaet/ui` primitives: a `Popover`
 * trigger swatch opens a `ToggleGroup` (single-select) grid of palette swatches
 * plus a native custom-color input. The palette is sourced from
 * `--color-swatch-*` design tokens (no inline hex array), so each swatch
 * re-resolves per theme. Controlled via `value` / `onValueChange`.
 */
const meta = {
  title: "UI/Components/ColorPicker",
  component: ColorPicker,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    onValueChange: fn(),
    "aria-label": "Pick a color",
  },
  argTypes: {
    value: {
      control: "text",
      description: "Controlled selected color.",
      table: { category: "State" },
    },
    defaultValue: {
      control: "text",
      description: "Selected color on mount (uncontrolled).",
      table: { category: "State" },
    },
    onValueChange: {
      description: "Called with the newly selected color.",
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof ColorPicker>

export default meta

type Story = StoryObj<typeof meta>

const blue = `var(${SWATCH_TOKENS[6].token})`

/** The default picker, closed until the trigger is clicked. */
export const Default: Story = {}

/** A picker with a preselected palette swatch. */
export const WithValue: Story = {
  args: { defaultValue: blue },
}

/** A custom (non-palette) hex color shown on the trigger. */
export const CustomColor: Story = {
  args: { defaultValue: "#ff7a59" },
}

/** A fully controlled picker mirroring its value next to the trigger. */
export const Controlled: Story = {
  render: (args) => {
    const Demo = () => {
      const [value, setValue] = useState(blue)
      return (
        <div className="flex items-center gap-3">
          <ColorPicker {...args} value={value} onValueChange={setValue} />
          <span className="text-muted-foreground text-sm">value: {value}</span>
        </div>
      )
    }
    return <Demo />
  },
}

/** Pinned dark-theme review: palette swatches brighten against the dark popup. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  args: { defaultValue: blue },
}

/**
 * Verifies portalled behaviour: opening the popover reveals the swatch group,
 * picking a swatch selects it and reports the value — asserted against
 * `document.body`.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: /pick a color/i })

    await step("opening reveals the swatch group", async () => {
      await userEvent.click(trigger)
      const group = await body.findByRole("group", { name: /pick a color/i })
      await waitFor(() => expect(group).toBeVisible())
    })

    await step("picking a swatch reports its value", async () => {
      const blueSwatch = await body.findByRole("button", { name: /^blue$/i })
      await userEvent.click(blueSwatch)
      await waitFor(() => expect(args.onValueChange).toHaveBeenCalledWith(blue))
      await expect(blueSwatch).toHaveAttribute("aria-pressed", "true")
    })
  },
}
