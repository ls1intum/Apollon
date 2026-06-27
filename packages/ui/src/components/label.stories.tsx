import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { Input } from "./input"
import { Label } from "./label"

/**
 * An accessible label associated with a form control. Clicking the label
 * focuses its associated control; the label dims when its peer is disabled.
 */
const meta = {
  title: "UI/Components/Label",
  component: Label,
  tags: ["autodocs"],
  argTypes: {
    children: { control: "text" },
    htmlFor: { control: "text" },
  },
  args: {
    children: "Email",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Label>

export default meta

type Story = StoryObj<typeof meta>

/** A standalone label. */
export const Default: Story = {}

/** A label whose `htmlFor` points at an input focuses it when clicked. */
export const ForInput: Story = {
  render: (args) => (
    <div className="flex w-64 flex-col gap-2">
      <Label {...args} htmlFor="label-email" />
      <Input id="label-email" type="email" placeholder="name@example.com" />
    </div>
  ),
}

/** When the peer control is disabled, the label dims via `peer-disabled`. */
export const DisabledPeer: Story = {
  render: (args) => (
    <div className="flex w-64 flex-col gap-2">
      <Label {...args} htmlFor="label-disabled" />
      <Input id="label-disabled" className="peer" disabled />
    </div>
  ),
}

/** Append a required marker to signal a mandatory field. */
export const Required: Story = {
  render: (args) => (
    <Label {...args} htmlFor="label-required">
      Full name
      <span aria-hidden className="text-destructive">
        *
      </span>
    </Label>
  ),
}

/** Pinned dark-theme review of a label paired with its input. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-64 flex-col gap-2">
      <Label htmlFor="label-dark">
        Full name
        <span aria-hidden className="text-destructive">
          *
        </span>
      </Label>
      <Input id="label-dark" placeholder="Ada Lovelace" />
    </div>
  ),
}

/** Interaction test: clicking the label focuses its associated input. */
export const ForInputInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: (args) => (
    <div className="flex w-64 flex-col gap-2">
      <Label {...args} htmlFor="label-focus-target">
        Email
      </Label>
      <Input id="label-focus-target" type="email" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const label = canvas.getByText("Email")
    const input = canvas.getByRole("textbox")
    await userEvent.click(label)
    await expect(input).toHaveFocus()
  },
}
