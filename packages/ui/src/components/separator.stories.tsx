import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { Button } from "./button"
import { Separator } from "./separator"

/**
 * Thin visual / semantic divider built on the Base UI `Separator`. Orientation
 * is driven by the `orientation` prop and reflected via `data-horizontal` /
 * `data-vertical`, which the inline utilities use to size it (full-width 1px row
 * vs self-stretching 1px column).
 */
const meta = {
  title: "UI/Components/Separator",
  component: Separator,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Layout axis; reflected as data-horizontal / data-vertical.",
      table: { category: "Appearance" },
    },
  },
  args: {
    orientation: "horizontal",
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof Separator>

export default meta

type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: (args) => (
    <div className="w-64 space-y-3">
      <p className="text-sm">Profile</p>
      <Separator {...args} />
      <p className="text-sm text-muted-foreground">Account settings below.</p>
    </div>
  ),
}

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="flex h-8 items-center gap-3 text-sm">
      <span>Docs</span>
      <Separator {...args} />
      <span>Source</span>
      <Separator {...args} />
      <span>About</span>
    </div>
  ),
}

/** Vertical separators dividing a button group / toolbar. */
export const BetweenButtons: Story = {
  render: () => (
    <div className="flex h-9 items-center gap-2">
      <Button variant="ghost" size="sm">
        Undo
      </Button>
      <Separator orientation="vertical" />
      <Button variant="ghost" size="sm">
        Redo
      </Button>
      <Separator orientation="vertical" />
      <Button variant="ghost" size="sm">
        Reset
      </Button>
    </div>
  ),
}

/** Pinned dark-theme review so the divider contrast is verifiable. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="w-64 space-y-3">
      <p className="text-sm">Profile</p>
      <Separator />
      <div className="flex h-5 items-center gap-2 text-sm text-muted-foreground">
        <span>Workspace</span>
        <Separator orientation="vertical" />
        <span>Diagrams</span>
      </div>
    </div>
  ),
}

/**
 * Interaction test: both orientations expose `role="separator"` and the matching
 * `aria-orientation`, so assistive tech announces the divider and its axis.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-6">
      <div data-testid="horizontal-row" className="w-64 space-y-3">
        <p className="text-sm">Profile</p>
        <Separator orientation="horizontal" />
      </div>
      <div
        data-testid="vertical-row"
        className="flex h-8 items-center gap-3 text-sm"
      >
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Source</span>
      </div>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step("horizontal separator exposes its role and axis", async () => {
      const horizontal = within(canvas.getByTestId("horizontal-row")).getByRole(
        "separator"
      )
      await expect(horizontal).toBeInTheDocument()
      await expect(horizontal).toHaveAttribute("aria-orientation", "horizontal")
    })

    await step("vertical separator exposes its role and axis", async () => {
      const vertical = within(canvas.getByTestId("vertical-row")).getByRole(
        "separator"
      )
      await expect(vertical).toBeInTheDocument()
      await expect(vertical).toHaveAttribute("aria-orientation", "vertical")
    })
  },
}
