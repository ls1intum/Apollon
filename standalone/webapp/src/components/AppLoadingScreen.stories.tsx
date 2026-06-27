import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { AppLoadingScreen } from "./AppLoadingScreen"

/**
 * The full-bleed splash shown while the workspace boots. Renders the TUM logo
 * and an indeterminate progress bar. The `variant` switches between the
 * full-page splash and a smaller panel placeholder; `label` is the accessible
 * status text announced to screen readers.
 */
const meta = {
  title: "Webapp/Misc/AppLoadingScreen",
  component: AppLoadingScreen,
  parameters: { layout: "fullscreen" },
  args: {
    label: "Loading workspace...",
    variant: "page",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["page", "panel"],
      table: { category: "Layout" },
    },
    label: {
      control: "text",
      table: { category: "Accessibility" },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AppLoadingScreen>

export default meta
type Story = StoryObj<typeof meta>

/** The default full-page boot splash. */
export const Page: Story = {}

/**
 * The splash's whole job is to announce progress to assistive tech: assert the
 * live `status` region carries the `label` as its accessible name and polls
 * politely, so screen readers read the boot state without stealing focus.
 */
export const AnnouncesStatus: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { label: "Loading workspace..." },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const status = canvas.getByRole("status", { name: args.label })
    await expect(status).toHaveAttribute("aria-live", "polite")
    await expect(status).toHaveAttribute("aria-label", args.label)
  },
}

/** The compact panel variant for in-layout loading regions. */
export const Panel: Story = {
  parameters: { layout: "centered" },
  args: { variant: "panel", label: "Loading diagram..." },
}
