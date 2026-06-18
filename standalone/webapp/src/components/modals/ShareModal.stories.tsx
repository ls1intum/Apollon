import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { ModalBodyProviders } from "../../stories/_support/webapp"
import { ShareModal } from "./ShareModal"

/**
 * Body of the editor "Share" modal. Offers four share modes (Edit, Collaborate,
 * Give Feedback, See Feedback) and a read-only field showing the current link.
 * Each mode button calls the API to create a shared diagram — only on click —
 * so these stories render the chooser without sharing anything.
 */
const meta = {
  title: "Webapp/Modals/ShareModal",
  component: ShareModal,
  parameters: { layout: "centered" },
  decorators: [ModalBodyProviders],
} satisfies Meta<typeof ShareModal>

export default meta
type Story = StoryObj<typeof meta>

/** The mode chooser with the four share actions and the recent-link field. */
export const Default: Story = {}

/** Pinned to dark mode to review the outlined buttons and link fieldset. */
export const Dark: Story = {
  globals: { theme: "dark" },
}

/** Verifies the four share modes render as actionable buttons. */
export const AllModesPresent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const name of [
      /edit/i,
      /collaborate/i,
      /give feedback/i,
      /see feedback/i,
    ]) {
      await expect(canvas.getByRole("button", { name })).toBeInTheDocument()
    }
  },
}
