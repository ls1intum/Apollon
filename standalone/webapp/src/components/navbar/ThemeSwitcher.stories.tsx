import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DarkNavbarSurface } from "../../stories/_support/webapp"
import { ThemeSwitcherButton } from "./ThemeSwitcher"

/**
 * The navbar's pure light/dark toggle. It cross-fades a sun/moon icon based on
 * `isDarkMode` and reports clicks via `onToggle` — no store, so every state is
 * one `args` combo. The button is white-tinted for the always-dark navbar, so
 * the stories paint it on the dark navbar surface.
 */
const meta = {
  title: "Webapp/Navbar/ThemeSwitcher",
  component: ThemeSwitcherButton,
  tags: ["autodocs"],
  decorators: [DarkNavbarSurface],
  parameters: { layout: "centered" },
  args: {
    isDarkMode: false,
    onToggle: fn(),
  },
  argTypes: {
    isDarkMode: {
      control: "boolean",
      description:
        "Whether dark mode is active (selects the moon icon + label).",
      table: { category: "State" },
    },
    onToggle: {
      description: "Fired when the toggle is clicked.",
      table: { category: "Events" },
    },
    className: {
      control: "text",
      description: "Merged with the component's own classes.",
      table: { category: "Appearance" },
    },
  },
} satisfies Meta<typeof ThemeSwitcherButton>

export default meta
type Story = StoryObj<typeof meta>

/** Light mode: the switcher offers to switch to dark, showing the sun icon. */
export const LightMode: Story = {
  args: { isDarkMode: false },
}

/** Dark mode: the switcher offers to switch to light, showing the moon icon. */
export const DarkMode: Story = {
  args: { isDarkMode: true },
}

/** Clicking the switcher reports the toggle to the caller. */
export const TogglesTheme: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const toggle = canvas.getByRole("button", { name: /switch to dark mode/i })
    await userEvent.click(toggle)
    await expect(args.onToggle).toHaveBeenCalledTimes(1)
  },
}
