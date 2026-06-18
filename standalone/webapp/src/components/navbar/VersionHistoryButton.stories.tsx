import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DarkNavbarSurface } from "../../stories/_support/webapp"
import { VersionHistoryButtonView } from "./VersionHistoryButton"

/**
 * Pure navbar entry point for the version-history drawer. It reflects the
 * drawer's open state via `aria-pressed` and reports clicks via `onToggle` — no
 * store, no routing, so every state is one `args` combo. `tone` switches between
 * the always-dark desktop bar and the themed mobile dropdown.
 */
const meta = {
  title: "Webapp/Navbar/VersionHistoryButton",
  component: VersionHistoryButtonView,
  tags: ["autodocs"],
  decorators: [DarkNavbarSurface],
  parameters: { layout: "centered" },
  args: {
    isOpen: false,
    tone: "onDark",
    onToggle: fn(),
  },
  argTypes: {
    isOpen: {
      control: "boolean",
      description: "Whether the drawer is open (drives `aria-pressed`).",
      table: { category: "State" },
    },
    tone: {
      control: "select",
      options: ["onDark", "onSurface"],
      description: "Foreground palette for the surface this lives on.",
      table: { category: "Appearance" },
    },
    onToggle: {
      action: "toggled",
      description: "Fired when the button is clicked.",
      table: { category: "Events" },
    },
    className: {
      control: "text",
      description: "Merged with the component's own classes.",
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

/** Light mobile-dropdown tone. */
export const OnSurface: Story = {
  args: { tone: "onSurface" },
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
