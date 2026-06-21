import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { Checkbox } from "./checkbox"
import { Field, FieldLabel } from "./field"

/**
 * A control that toggles between checked, unchecked, and indeterminate states,
 * built on Base UI's Checkbox. The check icon renders inside the indicator.
 */
const meta = {
  title: "UI/Components/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    checked: { control: "boolean" },
    indeterminate: { control: "boolean" },
    disabled: { control: "boolean" },
    onCheckedChange: { action: "checkedChange" },
  },
  args: {
    disabled: false,
    onCheckedChange: fn(),
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Checkbox>

export default meta

type Story = StoryObj<typeof meta>

/** An unchecked checkbox. */
export const Unchecked: Story = {
  args: { defaultChecked: false },
}

/** A checked checkbox shows the check indicator. */
export const Checked: Story = {
  args: { defaultChecked: true },
}

/** The indeterminate state for partial selections. */
export const Indeterminate: Story = {
  args: { indeterminate: true },
}

/** A disabled checkbox ignores user interaction. */
export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
}

/** Set `aria-invalid` to surface a validation error state. */
export const Invalid: Story = {
  args: { "aria-invalid": true },
}

/** Pair a checkbox with a `FieldLabel` for an accessible, clickable label. */
export const WithLabel: Story = {
  render: (args) => (
    <Field orientation="horizontal">
      <Checkbox id="terms" {...args} />
      <FieldLabel htmlFor="terms">Accept terms and conditions</FieldLabel>
    </Field>
  ),
}

/** Pinned dark-theme review across states. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      <Checkbox defaultChecked={false} />
      <Checkbox defaultChecked />
      <Checkbox indeterminate />
      <Checkbox aria-invalid />
      <Checkbox disabled defaultChecked />
    </div>
  ),
}

/** Interaction test: clicking the checkbox toggles it on. */
export const ToggleInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { defaultChecked: false },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const checkbox = canvas.getByRole("checkbox")
    await expect(checkbox).toHaveAttribute("aria-checked", "false")
    await userEvent.click(checkbox)
    await expect(checkbox).toHaveAttribute("aria-checked", "true")
    await expect(args.onCheckedChange).toHaveBeenCalledWith(
      true,
      expect.anything()
    )
  },
}
