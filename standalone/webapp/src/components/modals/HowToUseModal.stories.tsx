import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
import { HowToUseModal } from "./HowToUseModal"

/**
 * The "How to use" walkthrough modal body: a labelled grid of add/edit/move/
 * delete instructions with screenshots, plus a Close button. It is pure — it
 * takes an `onClose` callback and renders content, so it needs no providers.
 */
const meta = {
  title: "Webapp/Modals/HowToUseModal",
  component: HowToUseModal,
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "720px" } },
  },
  decorators: [
    withModalFrame({ title: "How to use this editor?", variant: "plain" }),
  ],
  args: {
    onClose: fn(),
  },
  argTypes: {
    onClose: {
      action: "close",
      table: { category: "Events" },
      description: "Called when the user clicks the Close button.",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof HowToUseModal>

export default meta
type Story = StoryObj<typeof meta>

/** The full walkthrough. */
export const Default: Story = {
  play: async ({ args }) => {
    // The modal portals over a backdrop, so query the whole document.
    const screen = within(document.body)
    // The frame's header adds its own X "Close"; click the body's Close button.
    const buttons = await screen.findAllByRole("button", { name: /close/i })
    const close = buttons.find(
      (button) => button.textContent?.trim() === "Close"
    )
    await userEvent.click(close!)
    await expect(args.onClose).toHaveBeenCalled()
  },
}
