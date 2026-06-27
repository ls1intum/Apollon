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
    checked: {
      control: "boolean",
      description: "Controlled checked state.",
      table: { category: "State" },
    },
    indeterminate: {
      control: "boolean",
      description: "Render the indeterminate (partial selection) state.",
      table: { category: "State" },
    },
    disabled: {
      control: "boolean",
      description: "Disable the checkbox and ignore user interaction.",
      table: { category: "State" },
    },
    onCheckedChange: {
      description: "Called with the next checked state when the user toggles.",
      table: { category: "Events" },
    },
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
  args: { defaultChecked: false, "aria-label": "Unchecked" },
}

/** A checked checkbox shows the check indicator. */
export const Checked: Story = {
  args: { defaultChecked: true, "aria-label": "Checked" },
}

/** The indeterminate state for partial selections. */
export const Indeterminate: Story = {
  args: { indeterminate: true, "aria-label": "Indeterminate" },
}

/** A disabled checkbox ignores user interaction. */
export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true, "aria-label": "Disabled" },
}

/** Set `aria-invalid` to surface a validation error state. */
export const Invalid: Story = {
  args: { "aria-invalid": true, "aria-label": "Invalid" },
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

/** Every visual state side by side for light-theme review. */
export const Matrix: Story = {
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      <Checkbox aria-label="Unchecked" defaultChecked={false} />
      <Checkbox aria-label="Checked" defaultChecked />
      <Checkbox aria-label="Indeterminate" indeterminate />
      <Checkbox aria-label="Invalid" aria-invalid />
      <Checkbox aria-label="Disabled" disabled defaultChecked />
    </div>
  ),
}

/** Pinned dark-theme review across states. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      <Checkbox aria-label="Unchecked" defaultChecked={false} />
      <Checkbox aria-label="Checked" defaultChecked />
      <Checkbox aria-label="Indeterminate" indeterminate />
      <Checkbox aria-label="Invalid" aria-invalid />
      <Checkbox aria-label="Disabled" disabled defaultChecked />
    </div>
  ),
}

/** Interaction test: clicking the checkbox toggles it on. */
export const ToggleInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { defaultChecked: false, "aria-label": "Toggle me" },
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
