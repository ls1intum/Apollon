import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { Button } from "./button"
import { Spinner } from "./spinner"

/**
 * Indeterminate loading indicator: a spinning `Loader2Icon` that exposes
 * `role="status"` and `aria-label="Loading"` for assistive technology. Size and
 * color follow `className` (defaults to `size-4` and `currentColor`).
 */
const meta = {
  title: "UI/Components/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Spinner>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Three sizes driven purely by the `size-*` utility. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner className="size-3" />
      <Spinner className="size-4" />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
    </div>
  ),
}

/** Inside a button, inheriting the button's foreground color. */
export const InButton: Story = {
  render: () => (
    <Button disabled>
      <Spinner />
      Saving...
    </Button>
  ),
}

/** Paired with a visible text label. */
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner />
      Loading diagrams...
    </div>
  ),
}

/** Asserts the accessible role and label are present. */
export const Accessibility: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const status = await canvas.findByRole("status")
    expect(status).toHaveAttribute("aria-label", "Loading")
  },
}
