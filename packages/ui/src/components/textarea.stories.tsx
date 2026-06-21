import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { Field, FieldLabel } from "./field"
import { Textarea } from "./textarea"

/**
 * A multi-line text input. Styling lives in `styles/components.css`, keyed on
 * `data-slot="textarea"`, so the Tailwind-free editor bundle can embed
 * anywhere.
 */
const meta = {
  title: "UI/Components/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
    rows: { control: "number" },
    disabled: { control: "boolean" },
    onChange: { action: "changed" },
  },
  args: {
    placeholder: "Type your message…",
    disabled: false,
    onChange: fn(),
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Textarea>

export default meta

type Story = StoryObj<typeof meta>

/** An empty textarea ready for entry. */
export const Default: Story = {
  render: (args) => <Textarea className="w-80" {...args} />,
}

/** A disabled textarea cannot be focused or edited. */
export const Disabled: Story = {
  render: (args) => <Textarea className="w-80" {...args} />,
  args: { disabled: true, defaultValue: "Read-only content" },
}

/** Set `aria-invalid` to surface a validation error state. */
export const Invalid: Story = {
  render: (args) => <Textarea className="w-80" {...args} />,
  args: { "aria-invalid": true, defaultValue: "Something is off" },
}

/** Control the initial height with the `rows` attribute. */
export const Rows: Story = {
  render: (args) => <Textarea className="w-80" {...args} />,
  args: { rows: 8 },
}

/** The native `resize` style is configurable; here it is disabled. */
export const Resize: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="resize-none">Fixed height</FieldLabel>
        <Textarea
          id="resize-none"
          className="resize-none"
          defaultValue="resize: none"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="resize-y">Vertical only</FieldLabel>
        <Textarea
          id="resize-y"
          className="resize-y"
          defaultValue="resize: vertical"
        />
      </Field>
    </div>
  ),
}
