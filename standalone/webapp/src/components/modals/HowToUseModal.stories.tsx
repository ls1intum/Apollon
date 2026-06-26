import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
import { HowToUseModal } from "./HowToUseModal"

/**
 * The "How to use" modal body: a Tabs control with a "Walkthrough" tab (the
 * labelled add/edit/move/delete steps with screenshots) and a "Shortcuts" tab
 * (a grouped keyboard + gesture cheat sheet), plus a Close button. It is pure —
 * it takes an `onClose` callback and renders content, so it needs no providers.
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
      table: { category: "Events" },
      description: "Called when the user clicks the Close button.",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof HowToUseModal>

export default meta
type Story = StoryObj<typeof meta>

/** The full walkthrough, with the Close button wired to `onClose`. */
export const Default: Story = {
  play: async ({ args }) => {
    // The modal portals over a backdrop, so query the whole document.
    const screen = within(document.body)
    // The Walkthrough tab is selected by default.
    await expect(
      await screen.findByRole("tab", { name: "Walkthrough" })
    ).toHaveAttribute("data-active")
    // The frame's header adds its own X "Close"; click the body's Close button.
    const buttons = await screen.findAllByRole("button", { name: /close/i })
    const close = buttons.find(
      (button) => button.textContent?.trim() === "Close"
    )
    await userEvent.click(close!)
    await expect(args.onClose).toHaveBeenCalled()
  },
}

/** The Shortcuts cheat sheet, opened by activating the second tab. */
export const Shortcuts: Story = {
  play: async () => {
    const screen = within(document.body)
    await userEvent.click(await screen.findByRole("tab", { name: "Shortcuts" }))
    // The grouped grid renders its section headers and labels.
    await expect(await screen.findByText("Selection")).toBeVisible()
    await expect(await screen.findByText("Redo")).toBeVisible()
  },
}
