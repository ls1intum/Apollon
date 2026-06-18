import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ModalBodyProviders } from "../../stories/_support/webapp"
import { CollaborateNameModal } from "./CollaborateNameModal"

/**
 * The modal body that asks for a display name before joining a collaboration
 * session. The confirm button is disabled until a non-blank name is entered;
 * `Enter` confirms. It reads `useModalContext` (to close itself), so it is
 * wrapped in `ModalBodyProviders`.
 */
const meta = {
  title: "Webapp/Modals/CollaborateNameModal",
  component: CollaborateNameModal,
  parameters: { layout: "centered" },
  decorators: [
    ModalBodyProviders,
    (Story) => (
      <div className="w-[360px] rounded-lg border border-border bg-card p-5">
        <Story />
      </div>
    ),
  ],
  args: {
    onConfirm: fn(),
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CollaborateNameModal>

export default meta
type Story = StoryObj<typeof meta>

/** Empty by default; confirm is disabled until a name is typed. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const confirm = await canvas.findByRole("button", {
      name: /start collaborating/i,
    })
    await expect(confirm).toBeDisabled()

    const input = canvas.getByLabelText(/display name/i)
    await userEvent.type(input, "Ada Lovelace")
    await expect(confirm).toBeEnabled()

    await userEvent.click(confirm)
    await expect(args.onConfirm).toHaveBeenCalledWith("Ada Lovelace")
  },
}

/** Pre-filled with an initial name. */
export const Prefilled: Story = {
  args: { initialName: "Grace Hopper" },
}

/** Pinned dark to verify the input and button against dark tokens. */
export const Dark: Story = {
  args: { initialName: "Grace Hopper" },
  globals: { theme: "dark" },
}
