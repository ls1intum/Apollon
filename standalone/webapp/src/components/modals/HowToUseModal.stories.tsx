import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { HowToUseModal } from "./HowToUseModal"

/**
 * The "How to use" walkthrough modal body: a labelled grid of add/edit/move/
 * delete instructions with screenshots, plus a Close button. It is pure — it
 * takes an `onClose` callback and renders content, so it needs no providers.
 */
const meta = {
  title: "Webapp/Modals/HowToUseModal",
  component: HowToUseModal,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card">
        <Story />
      </div>
    ),
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
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: /close/i }))
    await expect(args.onClose).toHaveBeenCalled()
  },
}
