import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { WebappProviders } from "../../stories/_support/webapp"
import { HomeFooter, HomeHelpMenu } from "./HomeFooter"

/**
 * The home help/legal links (About, Releases, GitHub, Privacy, Imprint, Report).
 * Rendered as a slim single-line footer bar on web/desktop (`HomeFooter`), and
 * as an overflow menu on mobile/native (`HomeHelpMenu`).
 */
const meta = {
  title: "Webapp/Home/HomeFooter",
  component: HomeFooter,
  tags: ["autodocs"],
  decorators: [WebappProviders],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HomeFooter>

export default meta
type Story = StoryObj<typeof meta>

/** The web/desktop footer bar with all help and legal links inline. */
export const Default: Story = {}

/**
 * The mobile/native overflow menu rendering the same links. Pinned on a dark
 * surface since its trigger is white-tinted for the navbar.
 */
export const HelpMenu: StoryObj<typeof HomeHelpMenu> = {
  render: () => (
    <div style={{ background: "var(--navbar-bg)", padding: "1rem" }}>
      <HomeHelpMenu />
    </div>
  ),
}

/** Opening the overflow menu reveals the help/legal links. */
export const HelpMenuOpens: StoryObj<typeof HomeHelpMenu> = {
  render: () => (
    <div style={{ background: "var(--navbar-bg)", padding: "1rem" }}>
      <HomeHelpMenu />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /help and legal/i })
    )
    const menu = await canvas.findByRole("menu")
    await expect(within(menu).getByText("Imprint")).toBeInTheDocument()
    await expect(within(menu).getByText("Privacy")).toBeInTheDocument()
  },
}
