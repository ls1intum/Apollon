import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import {
  DarkNavbarSurface,
  WebappProviders,
} from "../../stories/_support/webapp"
import { HelpMenu } from "./HelpMenu"

/**
 * The editor's Help dropdown is the SHARED `HomeHelpMenu` in its `editor`
 * variant: the editor walkthrough leads, then the shared tail (About → Releases →
 * GitHub → Report a problem), then Open Playground, a separator, and the legal
 * links (Privacy → Imprint). The legal links stamp the originating path into
 * router state so the legal pages can offer a one-tap return to the diagram.
 */
const meta = {
  title: "Webapp/Navbar/HelpMenu",
  component: HelpMenu,
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
} satisfies Meta<typeof HelpMenu>

export default meta
type Story = StoryObj<typeof meta>

/** Default trigger on the dark navbar (rendered here on a dark surface). */
export const Default: Story = {
  decorators: [DarkNavbarSurface],
}

/** The mobile sheet passes an explicit contrast color for the themed surface. */
export const OnSurface: Story = {
  args: { color: "var(--apollon-foreground)" },
}

/** Opening the menu reveals the help/legal items in a body portal. */
export const MenuOpens: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /help/i }))

    const body = within(document.body)
    await expect(
      await body.findByRole("menuitem", { name: /how does this editor work/i })
    ).toBeInTheDocument()
    await expect(
      body.getByRole("menuitem", { name: /imprint/i })
    ).toBeInTheDocument()
  },
}
