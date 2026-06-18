import type { Meta, StoryObj } from "@storybook/react-vite"
import { ModalBodyProviders } from "../../stories/_support/webapp"
import { HowToUseModal } from "./HowToUseModal"

/**
 * The "How to use" walkthrough modal body: a labelled grid of add/edit/move/
 * delete instructions with screenshots, plus a Close button. It reads
 * `useModalContext`, so it is wrapped in `ModalBodyProviders`.
 */
const meta = {
  title: "Webapp/Modals/HowToUseModal",
  component: HowToUseModal,
  parameters: { layout: "fullscreen" },
  decorators: [
    ModalBodyProviders,
    (Story) => (
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof HowToUseModal>

export default meta
type Story = StoryObj<typeof meta>

/** The full walkthrough. */
export const Default: Story = {}

/** Pinned dark to verify the walkthrough surface on dark. */
export const Dark: Story = {
  globals: { theme: "dark" },
}
