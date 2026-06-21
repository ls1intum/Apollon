import type { Meta, StoryObj } from "@storybook/react-vite"

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
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Layout axis; reflected as data-horizontal / data-vertical.",
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

/** Inline within a row of text, separating breadcrumb-like segments. */
export const InText: Story = {
  render: () => (
    <div className="flex h-5 items-center gap-2 text-sm text-muted-foreground">
      <span>Workspace</span>
      <Separator orientation="vertical" />
      <span>Diagrams</span>
      <Separator orientation="vertical" />
      <span>Class Diagram</span>
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
