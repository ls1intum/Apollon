import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DarkNavbarSurface } from "../../stories/_support/webapp"
import { VersionHistoryButtonView } from "./VersionHistoryButton"

/**
 * Pure navbar entry point for the version-history drawer. It reflects the
 * drawer's open state via `aria-pressed` and reports clicks via `onToggle` — no
 * store, no routing, so every state is one `args` combo. `color` pins an explicit
 * foreground (the themed mobile dropdown); `variant="icon"` collapses it to the
 * icon with an always-on tooltip.
 */
const meta = {
  title: "Webapp/Navbar/VersionHistoryButton",
  component: VersionHistoryButtonView,
  tags: ["autodocs"],
  decorators: [DarkNavbarSurface],
  parameters: { layout: "centered" },
  args: {
    isOpen: false,
    onToggle: fn(),
  },
  argTypes: {
    isOpen: {
      control: "boolean",
      description: "Whether the drawer is open (drives `aria-pressed`).",
      table: { category: "State" },
    },
    color: {
      control: "text",
      description: "Explicit foreground colour for the icon + label.",
      table: { category: "Appearance" },
    },
    onToggle: {
      description: "Fired when the button is clicked.",
      table: { category: "Events" },
    },
    variant: {
      control: "inline-radio",
      options: ["bar", "icon"],
      description:
        "Presentation: header bar (label collapses below `lg`) / icon-only (always tooltips).",
      table: { category: "Appearance" },
    },
  },
} satisfies Meta<typeof VersionHistoryButtonView>

export default meta
type Story = StoryObj<typeof meta>

/** Drawer closed: the button is not pressed. */
export const Default: Story = {
  args: { isOpen: false },
}

/** Drawer open: the button reflects the pressed state. */
export const DrawerOpen: Story = {
  args: { isOpen: true },
}

/** Themed mobile-dropdown foreground (explicit `color`). */
export const OnSurface: Story = {
  args: { color: "var(--apollon-foreground)" },
}

/** Clicking the button reports the toggle and exposes the pressed state. */
export const TogglesDrawer: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: /version history/i })
    await expect(button).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(button)
    await expect(args.onToggle).toHaveBeenCalledTimes(1)
  },
}
