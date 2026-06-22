import type { Meta, StoryObj } from "@storybook/react-vite"
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

/** The compact panel variant for in-layout loading regions. */
export const Panel: Story = {
  parameters: { layout: "centered" },
  args: { variant: "panel", label: "Loading diagram..." },
}
