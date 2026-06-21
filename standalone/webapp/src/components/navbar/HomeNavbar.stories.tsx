import type { Meta, StoryObj } from "@storybook/react-vite"
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
export const Default: Story = {}

/**
 * On a sub-page (e.g. the imprint) the shared back affordance is shown so the
 * route isn't a dead end. Driven entirely by the active router location.
 */
export const SubPage: Story = {
  parameters: {
    tanstackRouter: { initialEntry: "/imprint", routePaths: ["/imprint"] },
  },
}

/** Pinned dark-theme review of the header chrome. */
export const Dark: Story = {
  globals: { theme: "dark" },
}
