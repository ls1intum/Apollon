import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { reactRouterParameters } from "storybook-addon-remix-react-router"
import { WebappProviders } from "../../stories/_support/webapp"
import { Navbar } from "./Navbar"

/**
 * The responsive editor navbar. The desktop layout (`hidden md:flex`) lays the
 * File / Share / Help controls, diagram-name field, and theme switcher inline
 * on the always-dark bar; the mobile layout (`md:flex hidden` inverse) collapses
 * them into a hamburger-triggered sheet.
 *
 * No live editor is mounted — the navbar reads `editor?` optionally, so the
 * diagram-name field starts empty and the title subscription is a no-op. This
 * keeps the story a lightweight render of the chrome rather than the full canvas.
 */
const meta = {
  title: "Webapp/Navbar/Navbar",
  component: Navbar,
  tags: ["autodocs"],
  decorators: [WebappProviders],
  parameters: {
    layout: "fullscreen",
    reactRouter: reactRouterParameters({
      location: { path: "/local/demo-1" },
      routing: { path: "/local/:diagramId" },
    }),
  },
} satisfies Meta<typeof Navbar>

export default meta
type Story = StoryObj<typeof meta>

/** Desktop inline layout. Resize narrow to see the mobile hamburger variant. */
export const Default: Story = {}

/** Pinned dark-theme review of the editor chrome. */
export const Dark: Story = {
  globals: { theme: "dark" },
}

/**
 * Opening the desktop File menu reveals the New Diagram / Import / Export
 * actions. The menu renders into a body portal, so it is queried there.
 */
export const FileMenuOpens: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fileTrigger = canvas.getByRole("button", { name: /file/i })
    await userEvent.click(fileTrigger)

    const body = within(document.body)
    await expect(
      await body.findByRole("menuitem", { name: /new diagram/i })
    ).toBeInTheDocument()
  },
}
