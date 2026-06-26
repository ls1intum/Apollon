import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import {
  DarkNavbarSurface,
  WebappProviders,
} from "../../stories/_support/webapp"
import { NavbarFile } from "./NavbarFile"

/**
 * The editor's File dropdown: New Diagram, Import (JSON), and a flat, labelled
 * Export group (SVG / PNG / JSON / PDF / PPTX) — one level of nesting, no submenu,
 * so the same body inlines cleanly into the mobile overflow. The trigger color
 * follows the navbar convention — `secondary` on the always-dark desktop bar, or
 * an explicit `color` for the themed mobile sheet.
 */
const meta = {
  title: "Webapp/Navbar/NavbarFile",
  component: NavbarFile,
  tags: ["autodocs"],
  decorators: [WebappProviders],
  parameters: { layout: "centered" },
  argTypes: {
    color: {
      control: "text",
      description:
        "Explicit trigger text color for the themed mobile sheet; omitted on the always-dark desktop bar.",
      table: { category: "Appearance" },
    },
  },
} satisfies Meta<typeof NavbarFile>

export default meta
type Story = StoryObj<typeof meta>

/** Default trigger on the dark navbar (rendered here on a dark surface). */
export const Default: Story = {
  decorators: [DarkNavbarSurface],
}

/** The mobile sheet passes an explicit contrast color for the themed surface. */
export const OnSurface: Story = {
  args: { color: "var(--apollon-primary-contrast)" },
}

/** Opening the menu reveals the file actions in a body portal. */
export const MenuOpens: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /file/i }))

    const body = within(document.body)
    await expect(
      await body.findByRole("menuitem", { name: /new diagram/i })
    ).toBeInTheDocument()
    // Export is a flat, labelled group — no submenu trigger. Its formats are
    // direct menuitems and the "Export" heading is a group label, not a menuitem.
    await expect(
      body.getByRole("menuitem", { name: /as svg/i })
    ).toBeInTheDocument()
  },
}
