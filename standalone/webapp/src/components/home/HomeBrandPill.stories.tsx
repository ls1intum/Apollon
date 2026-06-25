import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { WebappProviders } from "../../stories/_support/webapp"
import { HomeBrandPill } from "./HomeBrandPill"

/**
 * The mobile (< md) home brand pill — brand mark only, the single
 * `<header role="banner">` for the home. Paints the shared `.apollon-glass`.
 */
const meta = {
  title: "Webapp/Home/HomeBrandPill",
  component: HomeBrandPill,
  parameters: { layout: "centered" },
  decorators: [
    WebappProviders,
    (Story) => (
      <div className="bg-[var(--apollon-chrome-surface)] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HomeBrandPill>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("banner")).toBeInTheDocument()
  },
}

export const Dark: Story = {
  globals: { theme: "dark" },
}
