import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
import { AboutModal } from "./AboutModal"

/**
 * The "About" modal body: a short blurb, the app + library versions, and links
 * to GitHub, releases, and the license. It is pure — it takes an `onClose`
 * callback and renders content, so it needs no providers.
 */
const meta = {
  title: "Webapp/Modals/AboutModal",
  component: AboutModal,
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "560px" } },
  },
  decorators: [
    withModalFrame({ title: "Information about Apollon", variant: "plain" }),
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
  play: async ({ args }) => {
    // The modal portals over a backdrop, so query the whole document.
    const screen = within(document.body)
    const github = await screen.findByRole("link", { name: /^github$/i })
    await expect(github).toHaveAttribute("target", "_blank")
    await expect(
      screen.getByRole("link", { name: /license \(mit\)/i })
    ).toBeInTheDocument()

    // The frame's header adds its own X "Close"; click the body's Close button.
    const close = screen
      .getAllByRole("button", { name: /close/i })
      .find((button) => button.textContent?.trim() === "Close")
    await userEvent.click(close!)
    await expect(args.onClose).toHaveBeenCalled()
  },
}
