import type { Meta, StoryObj } from "@storybook/react-vite"
import { BoldIcon, ItalicIcon, UnderlineIcon } from "lucide-react"
import { expect, fn, userEvent, within } from "storybook/test"

import { Toggle } from "./toggle"

/**
 * A two-state button that can be on or off, built on Base UI's `Toggle`. The
 * pressed state is exposed via `aria-pressed` and styled through `data-pressed`.
 * Supports `variant` (`default` | `outline`) and `size` (`sm` | `default` |
 * `lg`), and is controlled via `pressed` / `onPressedChange`.
 */
const meta = {
  title: "UI/Components/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    variant: "default",
    size: "default",
    disabled: false,
    onPressedChange: fn(),
    children: <BoldIcon />,
    "aria-label": "Toggle bold",
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["default", "outline"],
      table: { category: "Appearance" },
    },
    size: {
      control: "inline-radio",
      options: ["sm", "default", "lg"],
      table: { category: "Appearance" },
    },
    pressed: {
      control: "boolean",
      description: "Controlled pressed state.",
      table: { category: "State" },
    },
    defaultPressed: {
      control: "boolean",
      description: "Pressed state on mount (uncontrolled).",
      table: { category: "State" },
    },
    disabled: {
      control: "boolean",
      table: { category: "State" },
    },
    onPressedChange: {
      description: "Called with the next pressed state.",
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof Toggle>

export default meta

type Story = StoryObj<typeof meta>

/** The default toggle, off until pressed. */
export const Default: Story = {}

/** A toggle that starts pressed. */
export const Pressed: Story = {
  args: { defaultPressed: true },
}

/** The `outline` variant draws a border around the control. */
export const Outline: Story = {
  args: { variant: "outline" },
}

/** A toggle with an icon and a text label. */
export const WithText: Story = {
  args: {
    variant: "outline",
    "aria-label": undefined,
    children: (
      <>
        <ItalicIcon />
        Italic
      </>
    ),
  },
}

/** A disabled toggle ignores user interaction. */
export const Disabled: Story = {
  args: { disabled: true, defaultPressed: true },
}

/** Set `aria-invalid` to surface a validation error state. */
export const Invalid: Story = {
  args: { "aria-invalid": true },
}

/** The three sizes (`sm`, `default`, `lg`) side by side. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle size="sm" aria-label="Bold (sm)">
        <BoldIcon />
      </Toggle>
      <Toggle size="default" aria-label="Bold (default)">
        <BoldIcon />
      </Toggle>
      <Toggle size="lg" aria-label="Bold (lg)">
        <BoldIcon />
      </Toggle>
    </div>
  ),
}

/** Pinned dark-theme review across variants and states. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle aria-label="Bold">
        <BoldIcon />
      </Toggle>
      <Toggle defaultPressed aria-label="Italic">
        <ItalicIcon />
      </Toggle>
      <Toggle variant="outline" aria-label="Underline">
        <UnderlineIcon />
      </Toggle>
      <Toggle variant="outline" defaultPressed aria-label="Bold outline">
        <BoldIcon />
      </Toggle>
      <Toggle disabled defaultPressed aria-label="Disabled">
        <BoldIcon />
      </Toggle>
    </div>
  ),
}

/** Interaction test: clicking the toggle flips its pressed state. */
export const ToggleInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = canvas.getByRole("button", { name: /toggle bold/i })
    await expect(toggle).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute("aria-pressed", "true")
    await expect(args.onPressedChange).toHaveBeenCalledWith(
      true,
      expect.anything()
    )
  },
}
