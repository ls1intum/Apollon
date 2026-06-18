import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { useThemeStore } from "@/stores/useThemeStore"
import { WebappProviders } from "../../stories/_support/webapp"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"

/**
 * The navbar's light/dark toggle. It reads `currentTheme` from the theme store
 * and calls `toggleTheme()`; the icon cross-fades between sun and moon. The
 * button is white-tinted for the always-dark navbar, so the stories pin a dark
 * surface behind it.
 */
const meta = {
  title: "Webapp/Navbar/ThemeSwitcher",
  component: ThemeSwitcherMenu,
  tags: ["autodocs"],
  decorators: [
    WebappProviders,
    (Story) => (
      <div style={{ background: "var(--navbar-bg)", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
  beforeEach: () => {
    useThemeStore.setState({ currentTheme: "light", userThemePreference: null })
  },
} satisfies Meta<typeof ThemeSwitcherMenu>

export default meta
type Story = StoryObj<typeof meta>

/** Light mode: the switcher offers to switch to dark, showing the sun icon. */
export const LightMode: Story = {}

/** Dark mode: seeded so the switcher offers to switch to light (moon icon). */
export const DarkMode: Story = {
  globals: { theme: "dark" },
  beforeEach: () => {
    useThemeStore.setState({
      currentTheme: "dark",
      userThemePreference: "dark",
    })
  },
}

/** Clicking the switcher flips the active theme in the store. */
export const TogglesTheme: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = canvas.getByRole("button", { name: /switch to dark mode/i })
    await userEvent.click(toggle)
    await expect(useThemeStore.getState().currentTheme).toBe("dark")
    await expect(
      canvas.getByRole("button", { name: /switch to light mode/i })
    ).toBeInTheDocument()
  },
}
