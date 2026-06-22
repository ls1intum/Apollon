import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { AboutModal } from "./AboutModal"

/**
 * The "About" modal body: a short blurb, the app + library versions, and links
 * to GitHub, releases, and the license. It is pure — it takes an `onClose`
 * callback and renders content, so it needs no providers.
 */
const meta = {
  title: "Webapp/Modals/AboutModal",
  component: AboutModal,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[420px] rounded-lg border border-border bg-card p-5">
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
} satisfies Meta<typeof AboutModal>

export default meta
type Story = StoryObj<typeof meta>

/** The about content with its external links. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const github = await canvas.findByRole("link", { name: /^github$/i })
    await expect(github).toHaveAttribute("target", "_blank")
    await expect(
      canvas.getByRole("link", { name: /license \(mit\)/i })
    ).toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: /close/i }))
    await expect(args.onClose).toHaveBeenCalled()
  },
}
