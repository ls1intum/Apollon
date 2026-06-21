import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DarkNavbarSurface } from "../../stories/_support/webapp"
import { VersionHistoryButtonView } from "./VersionHistoryButton"

/**
 * Pure navbar entry point for the version-history drawer. It reflects the
 * drawer's open state via `aria-pressed` and reports clicks via `onToggle` — no
 * store, no routing, so every state is one `args` combo. `color` pins an explicit
 * foreground (the themed mobile dropdown); `labelClassName` can collapse the
 * label to the icon when space is tight.
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
      action: "toggled",
      description: "Fired when the button is clicked.",
      table: { category: "Events" },
    },
    labelClassName: {
      control: "text",
      description: "Classes for the label span (e.g. `hidden lg:inline`).",
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
  args: { color: "var(--apollon-primary-contrast)" },
}

/** Pinned dark for visual review. */
export const Dark: Story = {
  globals: { theme: "dark" },
}

/** Clicking the button reports the toggle and exposes the pressed state. */
export const TogglesDrawer: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: /version history/i })
    await expect(button).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(button)
    await expect(args.onToggle).toHaveBeenCalled()
  },
}
