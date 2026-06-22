import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { WebappProviders } from "../../stories/_support/webapp"
import { HomeNavbar } from "./HomeNavbar"

/**
 * The always-dark dashboard header: brand link, an optional back affordance on
 * sub-pages, the mobile/native help overflow menu, and the theme switcher. On
 * the home route (`/`) the back link is hidden; on sub-pages it appears.
 */
const meta = {
  title: "Webapp/Navbar/HomeNavbar",
  component: HomeNavbar,
  tags: ["autodocs"],
  decorators: [WebappProviders],
  parameters: {
    layout: "fullscreen",
    tanstackRouter: { initialEntry: "/", routePaths: ["/"] },
  },
} satisfies Meta<typeof HomeNavbar>

export default meta
type Story = StoryObj<typeof meta>

/** On the dashboard root the logo is the only navigation — no back link. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("link", { name: /apollon home/i })
    ).toBeInTheDocument()
    await expect(
      canvas.queryByRole("link", { name: /all diagrams/i })
    ).not.toBeInTheDocument()
  },
}

/**
 * On a sub-page (e.g. the imprint) the shared back affordance is shown so the
 * route isn't a dead end. Driven entirely by the active router location.
 */
export const SubPage: Story = {
  parameters: {
    tanstackRouter: { initialEntry: "/imprint", routePaths: ["/imprint"] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("link", { name: /all diagrams/i })
    ).toHaveAttribute("href", "/")
  },
}
