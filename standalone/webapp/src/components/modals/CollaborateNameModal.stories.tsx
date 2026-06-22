import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
import { CollaborateNameModal } from "./CollaborateNameModal"

/**
 * The modal body that asks for a display name before joining a collaboration
 * session. The confirm button is disabled until a non-blank name is entered;
 * `Enter` confirms. It is pure — it reports the chosen name via `onConfirm` and
 * dismissal via `onClose`, so it needs no providers.
 */
const meta = {
  title: "Webapp/Modals/CollaborateNameModal",
  component: CollaborateNameModal,
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "360px" } },
  },
  decorators: [
    withModalFrame({ title: "Join Collaboration", variant: "confirm" }),
  ],
  args: {
    onConfirm: fn(),
    onClose: fn(),
  },
  argTypes: {
    initialName: {
      control: "text",
      table: { category: "Data" },
      description: "Seeds the input; the field stays uncontrolled afterwards.",
    },
    onConfirm: {
      action: "confirm",
      table: { category: "Events" },
      description: "Called with the trimmed display name when confirmed.",
    },
    onClose: {
      action: "close",
      table: { category: "Events" },
      description: "Called after a successful confirm so the host dismisses.",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CollaborateNameModal>

export default meta
type Story = StoryObj<typeof meta>

/** Empty by default; confirm is disabled until a name is typed. */
export const Default: Story = {
  play: async ({ args }) => {
    const canvas = within(document.body)
    const confirm = await canvas.findByRole("button", {
      name: /start collaborating/i,
    })
    await expect(confirm).toBeDisabled()

    const input = canvas.getByLabelText(/display name/i)
    await userEvent.type(input, "Ada Lovelace")
    await expect(confirm).toBeEnabled()

    await userEvent.click(confirm)
    await expect(args.onConfirm).toHaveBeenCalledWith("Ada Lovelace")
    await expect(args.onClose).toHaveBeenCalled()
  },
}

/** Pre-filled with an initial name. */
export const Prefilled: Story = {
  args: { initialName: "Grace Hopper" },
}
