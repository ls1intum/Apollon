import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { HomeNewFab } from "./HomeNewFab"

/**
 * The mobile-only (< md) "New diagram" FAB — statically pinned bottom-center,
 * clear of the home-indicator safe area, painting accent-tinted `.apollon-glass`.
 * Rendered here on a tall plate so the fixed pin is visible in the frame.
 */
const meta = {
  title: "Webapp/Home/HomeNewFab",
  component: HomeNewFab,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="relative h-[420px] bg-[var(--apollon-chrome-surface)]">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: "mobile1" } },
} satisfies Meta<typeof HomeNewFab>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: /new diagram/i })
    ).toBeInTheDocument()
  },
}

export const Dark: Story = {
  globals: { theme: "dark", viewport: { value: "mobile1" } },
}
