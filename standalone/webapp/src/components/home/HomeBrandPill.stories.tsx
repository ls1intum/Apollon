import type { Meta, StoryObj } from "@storybook/react-vite"
import { WebappProviders } from "../../stories/_support/webapp"
import { HomeBrandPill } from "./HomeBrandPill"

/**
 * The mobile (< md) home brand pill — brand mark only, the single
 * `<header role="banner">` for the home. Paints the shared `.apollon-glass`.
 */
const meta = {
  title: "Webapp/Home/HomeBrandPill",
  component: HomeBrandPill,
  tags: ["autodocs"],
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

/** The resting brand pill — the home's single `role="banner"` landmark. */
export const Default: Story = {}

/** Dark theme — the pill paints themed glass + flips its mark contrast. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
}
