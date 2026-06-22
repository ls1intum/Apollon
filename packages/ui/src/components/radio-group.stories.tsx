import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { Field, FieldLabel } from "./field"
import { RadioGroup, RadioGroupItem } from "./radio-group"

/**
 * A set of mutually exclusive options built on Base UI's RadioGroup. Arrow keys
 * move focus and selection between items.
 */
const meta = {
  title: "UI/Components/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Disables every item in the group.",
      table: { category: "State" },
    },
    onValueChange: {
      action: "valueChange",
      description: "Fires with the new value when the selection changes.",
      table: { category: "Events" },
    },
  },
  args: {
    disabled: false,
    onValueChange: fn(),
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RadioGroup>

export default meta

type Story = StoryObj<typeof meta>

const options = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "team", label: "Team" },
]

/** A vertical radio group with the first option selected by default. */
export const Default: Story = {
  render: (args) => (
    <RadioGroup defaultValue="free" {...args}>
      {options.map((option) => (
        <Field key={option.value} orientation="horizontal">
          <RadioGroupItem id={`default-${option.value}`} value={option.value} />
          <FieldLabel htmlFor={`default-${option.value}`}>
            {option.label}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  ),
}

/** Lay the options out horizontally. */
export const Horizontal: Story = {
  render: (args) => (
    <RadioGroup defaultValue="pro" className="flex flex-row gap-6" {...args}>
      {options.map((option) => (
        <Field key={option.value} orientation="horizontal">
          <RadioGroupItem
            id={`horizontal-${option.value}`}
            value={option.value}
          />
          <FieldLabel htmlFor={`horizontal-${option.value}`}>
            {option.label}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  ),
}

/** The default stacked vertical layout. */
export const Vertical: Story = {
  render: Default.render,
  args: { defaultValue: "team" },
}

/** A disabled radio group ignores user interaction. */
export const Disabled: Story = {
  render: Default.render,
  args: { defaultValue: "free", disabled: true },
}

/** A fully controlled radio group driven by the `value` prop. */
export const Controlled: Story = {
  render: (args) => (
    <RadioGroup value="pro" {...args}>
      {options.map((option) => (
        <Field key={option.value} orientation="horizontal">
          <RadioGroupItem
            id={`controlled-${option.value}`}
            value={option.value}
          />
          <FieldLabel htmlFor={`controlled-${option.value}`}>
            {option.label}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  ),
}

/** Set `aria-invalid` on the items to surface a validation error state. */
export const Invalid: Story = {
  render: (args) => (
    <RadioGroup defaultValue="free" {...args}>
      {options.map((option) => (
        <Field key={option.value} orientation="horizontal">
          <RadioGroupItem
            id={`invalid-${option.value}`}
            value={option.value}
            aria-invalid
          />
          <FieldLabel htmlFor={`invalid-${option.value}`}>
            {option.label}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  ),
}

/** Pinned dark-theme review across selected, unselected, and invalid items. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <RadioGroup defaultValue="pro">
      {options.map((option) => (
        <Field key={option.value} orientation="horizontal">
          <RadioGroupItem id={`dark-${option.value}`} value={option.value} />
          <FieldLabel htmlFor={`dark-${option.value}`}>
            {option.label}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  ),
}

/** Interaction test: arrow keys move selection between radio items. */
export const ArrowKeyInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: Default.render,
  args: { defaultValue: "free" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const radios = canvas.getAllByRole("radio")
    radios[0].focus()
    await expect(radios[0]).toHaveAttribute("aria-checked", "true")
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => {
      expect(radios[1]).toHaveAttribute("aria-checked", "true")
    })
    await expect(radios[0]).toHaveAttribute("aria-checked", "false")
  },
}
