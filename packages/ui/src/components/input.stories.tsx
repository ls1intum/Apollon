import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { Field, FieldLabel } from "./field"
import { Input } from "./input"

/**
 * A text input. Styling lives in `styles/components.css`, keyed on
 * `data-slot="input"`, so the Tailwind-free editor bundle can embed anywhere.
 */
const meta = {
  title: "UI/Components/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search", "tel", "url"],
    },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    onChange: { action: "changed" },
  },
  args: {
    type: "text",
    placeholder: "Type here…",
    disabled: false,
    readOnly: false,
    onChange: fn(),
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Input>

export default meta

type Story = StoryObj<typeof meta>

/** An empty input ready for entry. */
export const Default: Story = {}

/** Placeholder text hints at the expected value. */
export const Placeholder: Story = {
  args: { placeholder: "name@example.com", type: "email" },
}

/** A pre-filled value via `defaultValue`. */
export const Filled: Story = {
  args: { defaultValue: "Apollon" },
}

/** A disabled input cannot be focused or edited. */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Read-only company" },
}

/** A read-only input shows its value but cannot be edited. */
export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: "Read-only value" },
}

/** Set `aria-invalid` to surface a validation error state. */
export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "not-an-email" },
}

/** Associate a label through `Field` + `FieldLabel` for accessibility. */
export const WithLabel: Story = {
  render: (args) => (
    <Field className="w-64">
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" {...args} />
    </Field>
  ),
  args: { type: "email", placeholder: "name@example.com" },
}

/** Common input types side by side. */
export const Types: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-64 flex-col gap-3">
      <Input type="text" placeholder="Text" />
      <Input type="email" placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Input type="number" placeholder="Number" />
      <Input type="search" placeholder="Search" />
    </div>
  ),
}

/** Pinned dark-theme review across default, filled, invalid, and disabled. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-64 flex-col gap-3">
      <Input placeholder="Type here…" />
      <Input defaultValue="Apollon" />
      <Input aria-invalid defaultValue="not-an-email" />
      <Input disabled defaultValue="Read-only company" />
    </div>
  ),
}

/** Interaction test: typing updates the input's value. */
export const TypeInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { placeholder: "Type here…" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByPlaceholderText<HTMLInputElement>("Type here…")
    await userEvent.type(input, "Apollon")
    await expect(input).toHaveValue("Apollon")
  },
}
