import type { Meta, StoryObj } from "@storybook/react-vite"
import { PencilIcon, TrashIcon } from "lucide-react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { IconButton } from "./icon-button"

/**
 * Compact square icon-only button. Styling lives in `styles/components.css`
 * keyed on `data-slot="icon-button"`. A required `ariaLabel` keeps it
 * accessible, and an optional `tooltip` wraps it in the shared Tooltip.
 */
const meta = {
  title: "UI/Components/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  argTypes: {
    ariaLabel: { control: "text" },
    tooltip: { control: "text" },
    disabled: { control: "boolean" },
    onClick: { action: "clicked" },
  },
  args: {
    ariaLabel: "Edit",
    disabled: false,
    children: <PencilIcon />,
    onClick: fn(),
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof IconButton>

export default meta

type Story = StoryObj<typeof meta>

/** The default icon button with an accessible label. */
export const Default: Story = {}

/** Provide a `tooltip` to reveal a label on hover or focus. */
export const WithTooltip: Story = {
  args: {
    ariaLabel: "Delete",
    tooltip: "Delete item",
    children: <TrashIcon />,
  },
}

/** A disabled icon button ignores user interaction. */
export const Disabled: Story = {
  args: { disabled: true },
}

/** The `ariaLabel` is exposed as the button's accessible name. */
export const AriaLabelAssertion: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { ariaLabel: "Edit profile" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: "Edit profile" })
    await expect(button).toBeInTheDocument()
  },
}

/**
 * Interaction test: hovering the trigger opens the portalled tooltip in the
 * document body.
 */
export const TooltipInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: {
    ariaLabel: "Delete",
    tooltip: "Delete item",
    children: <TrashIcon />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const button = canvas.getByRole("button", { name: "Delete" })
    await userEvent.hover(button)
    await waitFor(async () => {
      await expect(await body.findByText("Delete item")).toBeInTheDocument()
    })
    await userEvent.unhover(button)
    await waitFor(() => {
      expect(body.queryByText("Delete item")).not.toBeInTheDocument()
    })
  },
}
